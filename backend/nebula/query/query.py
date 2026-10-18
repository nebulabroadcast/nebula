"""SQL of a list query, around a resource's base query.

    SELECT b.*, <joined fields asked for>, <sort values>
    FROM (<base query>) AS b
    <joins of the fields in use> <fulltext join>
    WHERE <filter> AND <search> AND <after cursor>
    ORDER BY <sort keys>
    LIMIT <limit + 1>

Postgres merges a simple base query into the outer one (or pushes the
filters into it), so filters and sorting still use the tables' indexes.
"""

from dataclasses import dataclass
from string.templatelib import Template
from typing import Any

from nx.db import db

from nebula.helpers.fulltext import fulltext_ranges
from nebula.query.cursor import (
    InvalidCursorError,
    decode_cursor,
    encode_cursor,
    query_hash,
)
from nebula.query.fields import (
    Field,
    FieldKind,
    FulltextSearch,
    QueryValidationError,
    SubstringSearch,
)
from nebula.query.models import (
    FilterAnd,
    FilterCondition,
    FilterNode,
    FilterNot,
    FilterOr,
    QueryRequest,
)
from nebula.sql import SQL

MAX_FILTER_DEPTH = 8

RELEVANCE = Field("_relevance", FieldKind.NUMBER, t"ft.rank", sortable=True)

COMPARISONS = {
    "eq": t"=",
    "ne": t"<>",
    "lt": t"<",
    "lte": t"<=",
    "gt": t">",
    "gte": t">=",
}
ORDERED = frozenset({FieldKind.INTEGER, FieldKind.NUMBER, FieldKind.STRING})
SCALAR = ORDERED | {FieldKind.BOOLEAN}
JSON = frozenset({FieldKind.LIST, FieldKind.OBJECT})
STRING = frozenset({FieldKind.STRING})

# Operators that only work with some kinds of fields
OPERATOR_KINDS = {
    "lt": ORDERED,
    "lte": ORDERED,
    "gt": ORDERED,
    "gte": ORDERED,
    "in": SCALAR,
    "nin": SCALAR,
    "like": STRING,
    "ilike": STRING,
    "contains": JSON,
}


class ListQuery:
    """A QueryRequest checked against a resource's fields, turned into SQL.

    The constructor raises every client error (422, and 400 for cursors).
    When fields share a key, the first one counts. `request.fields` is
    up to the resource; the query only selects the joined fields it names.
    """

    def __init__(
        self,
        request: QueryRequest,
        fields: list[Field],
        base: Template,
        search: FulltextSearch | SubstringSearch | None = None,
    ) -> None:
        self.request = request
        self.base = base
        self.fields: dict[str, Field] = {}
        for field in fields:
            self.fields.setdefault(field.key, field)

        self.conditions: list[Template] = []
        self.joins: dict[str, Template] = {}  # of the fields filtered by
        self.fulltext: Template | None = None

        if request.filter is not None:
            self.conditions.append(self.condition(request.filter))
        if request.q and isinstance(search, SubstringSearch):
            self.substring_search(request.q, search)
        if request.q and isinstance(search, FulltextSearch):
            self.fulltext_search(request.q, search)

        self.sort = self.sort_keys(request.sort)
        sort_names = [
            f"-{field.key}" if desc else field.key for field, desc in self.sort
        ]
        self.query_hash = query_hash(request, sort_names)
        self.cursor = self.cursor_values(request.cursor)

    def field(self, key: str) -> Field:
        if (field := self.fields.get(key)) is None:
            raise QueryValidationError(f"Unknown field '{key}'")
        return field

    #
    # Filter
    #

    def condition(self, node: FilterNode, depth: int = 1) -> Template:
        if depth > MAX_FILTER_DEPTH:
            raise QueryValidationError(
                f"Filter is nested too deep (max {MAX_FILTER_DEPTH} levels)"
            )
        match node:
            case FilterNot():
                return t"NOT ({self.condition(node.not_, depth + 1)})"
            case FilterAnd():
                parts = [self.condition(child, depth + 1) for child in node.and_]
                return t"({SQL.join(parts, ' AND ')})"
            case FilterOr():
                parts = [self.condition(child, depth + 1) for child in node.or_]
                return t"({SQL.join(parts, ' OR ')})"
        return self.comparison(node)

    def comparison(self, condition: FilterCondition) -> Template:  # noqa: C901
        field = self.field(condition.key)
        if field.join is not None:
            self.joins[field.key] = field.join
        op, value, expr = condition.op, condition.value, field.sql

        if op == "exists":
            if not isinstance(value, bool):
                raise QueryValidationError("Operator 'exists' expects true or false")
            return t"{expr} IS NOT NULL" if value else t"{expr} IS NULL"
        if value is None:
            raise QueryValidationError(
                f"Missing value for '{field.key}'. Use 'exists' to match unset fields"
            )
        if field.kind not in OPERATOR_KINDS.get(op, set(FieldKind)):
            raise QueryValidationError(
                f"Operator '{op}' can't be used with {field.kind} field '{field.key}'"
            )

        match op:
            case "eq" | "ne" | "lt" | "lte" | "gt" | "gte":
                value = coerce(field, value)
                return t"{expr} {COMPARISONS[op]} {value}{field.kind.cast}"
            case "in" | "nin":
                if not isinstance(value, list) or not value:
                    raise QueryValidationError(
                        f"Operator '{op}' expects a non-empty list"
                    )
                values = [coerce(field, v) for v in value]
                sql = t"{expr} = ANY({values}{field.kind.cast}[])"
                return sql if op == "in" else t"NOT ({sql})"
            case "like" | "ilike":
                keyword = t"LIKE" if op == "like" else t"ILIKE"
                return t"{expr} {keyword} {coerce(field, value)}::text"
            case "contains":
                return t"{expr} @> {value}::jsonb"
        raise QueryValidationError(f"Unknown operator '{op}'")

    #
    # Search
    #

    def substring_search(self, q: str, search: SubstringSearch) -> None:
        """Every word appears in at least one of the search keys."""
        fields = [self.field(key) for key in search.keys]
        for word in q.split():
            escaped = word.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            pattern = f"%{escaped}%"
            matches = [t"{field.sql} ILIKE {pattern}::text" for field in fields]
            self.conditions.append(t"({SQL.join(matches, ' OR ')})")

    def fulltext_search(self, q: str, search: FulltextSearch) -> None:
        """Assets with a token matching every word, ranked as `ft.rank`.

        One index range lookup per word (see nebula.helpers.fulltext). The
        words are inlined: the planner must see them to estimate the number
        of matches. Rank is the sum of each word's best weight.
        """
        if not (ranges := fulltext_ranges(q)):
            return
        object_type = int(search.object_type)
        lookups = SQL.join(
            [
                t"""SELECT {n}::int AS n, id, weight FROM ft
                    WHERE object_type = {object_type}::int
                    AND value ~>=~ {lo:literal} AND value ~<~ {hi:literal}"""
                for n, (lo, hi) in enumerate(ranges)
            ],
            " UNION ALL ",
        )
        self.fulltext = t"""
            JOIN (
                SELECT id, SUM(weight) AS rank FROM (
                    SELECT n, id, MAX(weight) AS weight
                    FROM ({lookups}) AS matches
                    GROUP BY n, id
                ) AS words
                GROUP BY id
                HAVING COUNT(*) = {len(ranges)}::int
            ) AS ft ON ft.id = b.id
        """
        self.fields[RELEVANCE.key] = RELEVANCE

    #
    # Sorting and keyset pagination
    #
    # NULLs sort as Postgres sorts them by default: last when ascending,
    # first when descending. Indexes then work in both directions.
    #

    def sort_keys(self, sort: list[str] | None) -> list[tuple[Field, bool]]:
        if not sort:
            sort = [f"-{RELEVANCE.key}"] if self.fulltext else ["-id"]
        result: list[tuple[Field, bool]] = []
        for item in sort:
            field = self.field(item.removeprefix("-"))
            if not field.sortable or field.kind.is_json:
                raise QueryValidationError(f"Can't sort by '{field.key}'")
            if any(key.key == field.key for key, _ in result):
                raise QueryValidationError(f"Duplicate sort key '{field.key}'")
            result.append((field, item.startswith("-")))
        # id makes the order total, which keyset pagination needs
        if not any(field.key == "id" for field, _ in result):
            result.append((self.field("id"), result[-1][1]))
        return result

    def cursor_values(self, cursor: str | None) -> list[Any] | None:
        if cursor is None:
            return None
        values = decode_cursor(cursor, self.query_hash, len(self.sort))
        try:
            return [
                None if value is None else coerce(field, value)
                for (field, _), value in zip(self.sort, values, strict=True)
            ]
        except QueryValidationError as e:
            raise InvalidCursorError("Invalid cursor") from e

    def after_cursor(self, values: list[Any]) -> Template:
        """Rows after the cursor: equal on the first i keys, after it on key i."""
        alternatives = []
        for i, (field, desc) in enumerate(self.sort):
            value, cast = values[i], field.kind.cast
            # NULL counts as larger than any value
            if value is None and not desc:
                continue  # nothing comes after NULL
            if value is None:
                after = t"{field.sql} IS NOT NULL"
            elif desc:
                after = t"{field.sql} < {value}{cast}"
            else:
                after = t"({field.sql} > {value}{cast} OR {field.sql} IS NULL)"
            ties = [
                t"{f.sql} IS NULL" if v is None else t"{f.sql} = {v}{f.kind.cast}"
                for (f, _), v in zip(self.sort[:i], values[:i], strict=True)
            ]
            alternatives.append(t"({SQL.join([*ties, after], ' AND ')})")
        if not alternatives:
            return t"FALSE"
        return t"({SQL.join(alternatives, ' OR ')})"

    #
    # SQL
    #

    def from_clause(self, extra_fields: list[Field]) -> Template:
        joins = dict(self.joins)
        for field in extra_fields:
            if field.join is not None:
                joins[field.key] = field.join
        parts = [t"({self.base}) AS b", *joins.values()]
        if self.fulltext is not None:
            parts.append(self.fulltext)
        return SQL.join(parts, "\n")

    def page_sql(self) -> Template:
        """One row more than the limit, to see whether more pages follow."""
        joined = [
            field
            for key in self.request.fields or []
            if (field := self.fields.get(key)) is not None and field.join is not None
        ]
        columns = [
            t"b.*",
            *(t"{field.sql} AS {field.key:ident}" for field in joined),
            *(t"{f.sql} AS {f'_sort_{i}':ident}" for i, (f, _) in enumerate(self.sort)),
        ]
        conditions = list(self.conditions)
        if self.cursor is not None:
            conditions.append(self.after_cursor(self.cursor))
        where = t"WHERE {SQL.join(conditions, ' AND ')}" if conditions else t""
        order = [t"{f.sql} DESC" if desc else t"{f.sql} ASC" for f, desc in self.sort]
        return t"""
            SELECT {SQL.join(columns, ", ")}
            FROM {self.from_clause([*joined, *(f for f, _ in self.sort)])}
            {where}
            ORDER BY {SQL.join(order, ", ")}
            LIMIT {self.request.limit + 1}
        """

    def count_sql(self) -> Template:
        """Rows matching the filter and search, ignoring the cursor."""
        where = (
            t"WHERE {SQL.join(self.conditions, ' AND ')}" if self.conditions else t""
        )
        return t"SELECT COUNT(*) AS total FROM {self.from_clause([])} {where}"


def coerce(field: Field, value: Any) -> Any:
    """The value as the field's type, converting only where lossless."""
    match field.kind:
        case FieldKind.INTEGER:
            if isinstance(value, float) and value.is_integer():
                return int(value)
            if isinstance(value, int) and not isinstance(value, bool):
                return value
        case FieldKind.NUMBER:
            if isinstance(value, int | float) and not isinstance(value, bool):
                return float(value)
        case FieldKind.STRING:
            if isinstance(value, str):
                return value
        case FieldKind.BOOLEAN:
            if isinstance(value, bool):
                return value
        case _:
            return value
    raise QueryValidationError(f"Field '{field.key}' expects a {field.kind} value")


@dataclass
class Page:
    rows: list[Any]
    next_cursor: str | None
    has_more: bool
    total: int | None

    def response(self, items: list[Any]) -> dict[str, Any]:
        """QueryResponse body with the rows as `items`. `total` only if asked."""
        result: dict[str, Any] = {
            "items": items,
            "next_cursor": self.next_cursor,
            "has_more": self.has_more,
        }
        if self.total is not None:
            result["total"] = self.total
        return result


async def fetch_page(
    request: QueryRequest,
    fields: list[Field],
    base: Template,
    search: FulltextSearch | SubstringSearch | None = None,
) -> Page:
    """One page of the base query's rows, filtered, searched and sorted.

    Rows have the base query's columns, plus a column for each joined field
    named in `request.fields`.
    """
    query = ListQuery(request, fields, base, search)
    sql, params = SQL.render(query.page_sql())
    rows = await db.fetch(sql, *params)
    has_more = len(rows) > request.limit
    rows = rows[: request.limit]

    next_cursor = None
    if has_more:
        values = [rows[-1][f"_sort_{i}"] for i in range(len(query.sort))]
        next_cursor = encode_cursor(values, query.query_hash)

    total = None
    if request.include_total:
        sql, params = SQL.render(query.count_sql())
        row = await db.fetchrow(sql, *params)
        total = row["total"] if row else 0
    return Page(rows, next_cursor, has_more, total)

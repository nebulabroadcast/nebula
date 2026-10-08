"""Compile a QueryRequest into parameterized SQL and run it.

Values are always bound parameters. Keys come only from the QuerySchema,
so nothing from the client is ever interpolated into SQL.
"""

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Any

import nebula
from nebula.utils import slugify
from server.query.cursor import decode_cursor, encode_cursor, query_hash
from server.query.models import (
    FilterAnd,
    FilterCondition,
    FilterNode,
    FilterNot,
    FilterOr,
    QueryRequest,
)
from server.query.schema import (
    FieldKind,
    FulltextSearch,
    QueryField,
    QuerySchema,
    QueryValidationError,
)

MAX_FILTER_DEPTH = 8
RELEVANCE = "_relevance"

SCALAR_KINDS = {
    FieldKind.INTEGER,
    FieldKind.NUMBER,
    FieldKind.STRING,
    FieldKind.BOOLEAN,
}
ORDERED_KINDS = {FieldKind.INTEGER, FieldKind.NUMBER, FieldKind.STRING}
COMPARISON_OPERATORS = {"lt": "<", "lte": "<=", "gt": ">", "gte": ">="}


class Params:
    """Collects bound parameter values and hands out their placeholders."""

    def __init__(self) -> None:
        self.values: list[Any] = []

    def add(self, value: Any, sql_type: str | None = None) -> str:
        self.values.append(value)
        placeholder = f"${len(self.values)}"
        return f"{placeholder}::{sql_type}" if sql_type else placeholder


def escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def coerce(field: QueryField, value: Any) -> Any:
    """Check that a value fits the field's kind, converting where lossless."""
    kind = field.kind
    if kind == FieldKind.INTEGER:
        if isinstance(value, float) and value.is_integer():
            return int(value)
        if isinstance(value, int) and not isinstance(value, bool):
            return value
    elif kind == FieldKind.NUMBER:
        if isinstance(value, int | float) and not isinstance(value, bool):
            return float(value)
    elif kind == FieldKind.STRING:
        if isinstance(value, str):
            return value
    elif kind == FieldKind.BOOLEAN:
        if isinstance(value, bool):
            return value
    else:
        return value
    raise QueryValidationError(f"Field '{field.key}' expects a {kind} value")


#
# Filter
#


def unsupported(op: str, field: QueryField) -> QueryValidationError:
    return QueryValidationError(
        f"Operator '{op}' can't be used with {field.kind} field '{field.key}'"
    )


def compile_equality(op: str, field: QueryField, value: Any, params: Params) -> str:
    sql_op = "=" if op == "eq" else "<>"
    if field.kind.is_json:
        return f"{field.sql} {sql_op} {params.add(value, 'jsonb')}"
    placeholder = params.add(coerce(field, value), field.kind.sql_type)
    return f"{field.sql} {sql_op} {placeholder}"


def compile_comparison(op: str, field: QueryField, value: Any, params: Params) -> str:
    if field.kind not in ORDERED_KINDS:
        raise unsupported(op, field)
    placeholder = params.add(coerce(field, value), field.kind.sql_type)
    return f"{field.sql} {COMPARISON_OPERATORS[op]} {placeholder}"


def compile_membership(op: str, field: QueryField, value: Any, params: Params) -> str:
    if field.kind not in SCALAR_KINDS:
        raise unsupported(op, field)
    if not isinstance(value, list) or not value:
        raise QueryValidationError(f"Operator '{op}' expects a non-empty list")
    values = [coerce(field, v) for v in value]
    placeholder = params.add(values, f"{field.kind.sql_type}[]")
    sql = f"{field.sql} = ANY({placeholder})"
    return sql if op == "in" else f"NOT ({sql})"


def compile_pattern(op: str, field: QueryField, value: Any, params: Params) -> str:
    if field.kind != FieldKind.STRING:
        raise unsupported(op, field)
    placeholder = params.add(coerce(field, value), "text")
    return f"{field.sql} {op.upper()} {placeholder}"


def compile_contains(op: str, field: QueryField, value: Any, params: Params) -> str:
    if not field.kind.is_json:
        raise unsupported(op, field)
    return f"{field.sql} @> {params.add(value, 'jsonb')}"


OPERATORS: dict[str, Callable[[str, QueryField, Any, Params], str]] = {
    "eq": compile_equality,
    "ne": compile_equality,
    **dict.fromkeys(COMPARISON_OPERATORS, compile_comparison),
    "in": compile_membership,
    "nin": compile_membership,
    "like": compile_pattern,
    "ilike": compile_pattern,
    "contains": compile_contains,
}


def compile_condition(
    schema: QuerySchema, condition: FilterCondition, params: Params
) -> str:
    field = schema.get(condition.key)
    op = condition.op
    value = condition.value

    if op == "exists":
        if not isinstance(value, bool):
            raise QueryValidationError("Operator 'exists' expects true or false")
        return field.exists_sql if value else f"NOT ({field.exists_sql})"

    if value is None:
        raise QueryValidationError(
            f"Missing value for '{field.key}'. Use 'exists' to match unset fields"
        )

    if (compile_operator := OPERATORS.get(op)) is None:
        raise QueryValidationError(f"Unknown operator '{op}'")
    return compile_operator(op, field, value, params)


def compile_filter(
    schema: QuerySchema, node: FilterNode, params: Params, depth: int = 1
) -> str:
    if depth > MAX_FILTER_DEPTH:
        raise QueryValidationError(
            f"Filter is nested too deep (max {MAX_FILTER_DEPTH} levels)"
        )

    if isinstance(node, FilterCondition):
        return compile_condition(schema, node, params)
    if isinstance(node, FilterNot):
        return f"NOT ({compile_filter(schema, node.not_, params, depth + 1)})"

    if isinstance(node, FilterAnd):
        children, joiner = node.and_, " AND "
    else:
        assert isinstance(node, FilterOr)
        children, joiner = node.or_, " OR "
    compiled = [compile_filter(schema, child, params, depth + 1) for child in children]
    return "(" + joiner.join(compiled) + ")"


#
# Search
#


@dataclass
class CompiledSearch:
    cte: str = ""
    join: str = ""
    condition: str | None = None


def compile_search(
    schema: QuerySchema, q: str | None, params: Params
) -> CompiledSearch:
    if not q or schema.search is None:
        return CompiledSearch()

    if isinstance(schema.search, FulltextSearch):
        tokens = sorted(slugify(q, make_set=True, min_length=3))
        if not tokens:
            return CompiledSearch()
        placeholder = params.add([f"{escape_like(t)}%" for t in tokens], "text[]")
        object_type = int(schema.search.object_type)
        cte = f"""
            WITH ft_cte AS (
                SELECT ft.id, SUM(ft.weight) AS rank
                FROM ft
                CROSS JOIN unnest({placeholder}) AS q(token)
                WHERE ft.object_type = {object_type}
                AND ft.value LIKE q.token
                GROUP BY ft.id
                HAVING COUNT(DISTINCT q.token) = {len(tokens)}
            )
        """
        schema.fields[RELEVANCE] = QueryField(
            RELEVANCE, FieldKind.NUMBER, "ft_cte.rank::double precision", "TRUE"
        )
        return CompiledSearch(cte, f"JOIN ft_cte ON ft_cte.id = {schema.alias}.id")

    fields = [schema.get(key) for key in schema.search.keys]
    for field in fields:
        if field.kind != FieldKind.STRING:
            raise unsupported("ilike", field)
    word_conditions = []
    for word in q.split():
        placeholder = params.add(f"%{escape_like(word)}%", "text")
        matches = [f"{field.sql} ILIKE {placeholder}" for field in fields]
        word_conditions.append("(" + " OR ".join(matches) + ")")
    if not word_conditions:
        return CompiledSearch()
    return CompiledSearch(condition=" AND ".join(word_conditions))


#
# Sorting and keyset pagination
#


@dataclass(frozen=True)
class SortKey:
    field: QueryField
    desc: bool

    def __str__(self) -> str:
        return f"-{self.field.key}" if self.desc else self.field.key

    @property
    def order_sql(self) -> str:
        direction = "DESC" if self.desc else "ASC"
        return f"{self.field.sql} {direction} NULLS LAST"


def resolve_sort(schema: QuerySchema, sort: list[str] | None) -> list[SortKey]:
    if not sort:
        sort = [f"-{RELEVANCE}"] if RELEVANCE in schema.fields else ["-id"]

    result: list[SortKey] = []
    for item in sort:
        desc = item.startswith("-")
        field = schema.get(item[1:] if desc else item)
        if not field.sortable:
            raise QueryValidationError(
                f"Can't sort by {field.kind} field '{field.key}'"
            )
        if any(key.field.key == field.key for key in result):
            raise QueryValidationError(f"Duplicate sort key '{field.key}'")
        result.append(SortKey(field, desc))

    # id makes the order total, which keyset pagination needs
    if not any(key.field.key == "id" for key in result):
        result.append(SortKey(schema.get("id"), result[-1].desc))
    return result


def keyset_condition(sort: list[SortKey], values: list[Any], params: Params) -> str:
    """Rows strictly after `values` in the given order (NULLs sort last)."""

    def equal(key: SortKey, value: Any) -> str:
        if value is None:
            return f"{key.field.sql} IS NULL"
        placeholder = params.add(coerce(key.field, value), key.field.kind.sql_type)
        return f"{key.field.sql} = {placeholder}"

    def after(key: SortKey, value: Any) -> str:
        placeholder = params.add(coerce(key.field, value), key.field.kind.sql_type)
        op = "<" if key.desc else ">"
        return f"({key.field.sql} {op} {placeholder} OR {key.field.sql} IS NULL)"

    alternatives = []
    for i, key in enumerate(sort):
        if values[i] is None:
            continue  # nothing sorts after NULL, except on later keys
        parts = [equal(sort[j], values[j]) for j in range(i)]
        parts.append(after(key, values[i]))
        alternatives.append(parts[0] if len(parts) == 1 else f"({' AND '.join(parts)})")
    if not alternatives:
        return "FALSE"
    if len(alternatives) == 1:
        return alternatives[0]
    return f"({' OR '.join(alternatives)})"


#
# Putting it together
#


@dataclass
class CompiledQuery:
    sql: str
    params: list[Any]
    count_sql: str | None
    count_params: list[Any]
    sort_size: int
    query_hash: str
    limit: int


def compile_query(
    schema: QuerySchema,
    request: QueryRequest,
    *,
    select: str,
    conditions: Sequence[str] = (),
    params: Params | None = None,
) -> CompiledQuery:
    """Build the page query (and optionally the count query).

    `select` is the resource's column list. `conditions` are extra SQL
    conditions (e.g. access control) whose values are already in `params`.
    """
    params = params or Params()
    where = list(conditions)

    search = compile_search(schema, request.q, params)
    if search.condition:
        where.append(search.condition)
    if request.filter is not None:
        where.append(compile_filter(schema, request.filter, params))

    sort = resolve_sort(schema, request.sort)
    qhash = query_hash(request, [str(key) for key in sort])
    source = f"{schema.table} AS {schema.alias} {search.join}"

    count_sql = None
    count_params: list[Any] = []
    if request.include_total:
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        count_sql = f"{search.cte} SELECT COUNT(*) FROM {source} {where_sql}"
        count_params = list(params.values)

    if request.cursor:
        values = decode_cursor(request.cursor, qhash, len(sort))
        where.append(keyset_condition(sort, values, params))

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    sort_columns = ", ".join(
        f"{key.field.sql} AS _sort_{i}" for i, key in enumerate(sort)
    )
    order_sql = ", ".join(key.order_sql for key in sort)
    sql = f"""
        {search.cte}
        SELECT {select}, {sort_columns}
        FROM {source}
        {where_sql}
        ORDER BY {order_sql}
        LIMIT {request.limit + 1}
    """

    return CompiledQuery(
        sql=sql,
        params=list(params.values),
        count_sql=count_sql,
        count_params=count_params,
        sort_size=len(sort),
        query_hash=qhash,
        limit=request.limit,
    )


@dataclass
class QueryResult:
    rows: list[Any]
    next_cursor: str | None
    has_more: bool
    total: int | None


async def run_query(compiled: CompiledQuery) -> QueryResult:
    rows = await nebula.db.fetch(compiled.sql, *compiled.params)
    has_more = len(rows) > compiled.limit
    rows = rows[: compiled.limit]

    next_cursor = None
    if has_more:
        last = rows[-1]
        values = [last[f"_sort_{i}"] for i in range(compiled.sort_size)]
        next_cursor = encode_cursor(values, compiled.query_hash)

    total = None
    if compiled.count_sql is not None:
        row = await nebula.db.fetchrow(compiled.count_sql, *compiled.count_params)
        total = row[0] if row else 0

    return QueryResult(rows, next_cursor, has_more, total)

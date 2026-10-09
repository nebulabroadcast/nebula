"""What a resource exposes to queries: fields, their SQL and search."""

import re
from dataclasses import dataclass, field
from enum import StrEnum

import nebula
from nebula.enum import MetaClass, ObjectTypeId


class QueryValidationError(nebula.ValidationException):
    """Invalid query from the client. Not worth an error log line."""

    log = False


# Keys end up inside SQL string literals. Only registered keys are ever
# used, and this is a second line of defence.
KEY_PATTERN = re.compile(r"^[A-Za-z0-9_./-]+$")


class FieldKind(StrEnum):
    INTEGER = "integer"
    NUMBER = "number"
    STRING = "string"
    BOOLEAN = "boolean"
    LIST = "list"
    OBJECT = "object"

    @property
    def sql_type(self) -> str:
        return {
            FieldKind.INTEGER: "bigint",
            FieldKind.NUMBER: "double precision",
            FieldKind.STRING: "text",
            FieldKind.BOOLEAN: "boolean",
            FieldKind.LIST: "jsonb",
            FieldKind.OBJECT: "jsonb",
        }[self]

    @property
    def is_json(self) -> bool:
        return self in (FieldKind.LIST, FieldKind.OBJECT)


METACLASS_KINDS: dict[MetaClass, FieldKind] = {
    MetaClass.STRING: FieldKind.STRING,
    MetaClass.TEXT: FieldKind.STRING,
    MetaClass.INTEGER: FieldKind.INTEGER,
    MetaClass.NUMERIC: FieldKind.NUMBER,
    MetaClass.BOOLEAN: FieldKind.BOOLEAN,
    MetaClass.DATETIME: FieldKind.NUMBER,
    MetaClass.TIMECODE: FieldKind.NUMBER,
    MetaClass.OBJECT: FieldKind.OBJECT,
    MetaClass.FRACTION: FieldKind.STRING,
    MetaClass.SELECT: FieldKind.STRING,
    MetaClass.LIST: FieldKind.LIST,
    MetaClass.COLOR: FieldKind.INTEGER,
}


def sql_literal(value: str) -> str:
    if not KEY_PATTERN.match(value):
        raise ValueError(f"Unsafe SQL identifier: {value!r}")
    return "'" + value.replace("'", "''") + "'"


@dataclass(frozen=True)
class QueryField:
    """A queryable key and the SQL expression that produces its value."""

    key: str
    kind: FieldKind
    sql: str  # typed expression: comparisons and sorting use it as is
    exists_sql: str  # boolean expression: true when the value is set
    sortable: bool = True

    @classmethod
    def column(cls, key: str, kind: FieldKind, column: str) -> "QueryField":
        return cls(key, kind, column, f"{column} IS NOT NULL", not kind.is_json)

    @classmethod
    def meta(cls, key: str, kind: FieldKind, alias: str) -> "QueryField":
        literal = sql_literal(key)
        if kind.is_json:
            sql = f"{alias}.meta->{literal}"
        elif kind == FieldKind.STRING:
            sql = f"{alias}.meta->>{literal}"
        else:
            sql = f"({alias}.meta->>{literal})::{kind.sql_type}"
        exists_sql = f"{alias}.meta ? {literal}"
        return cls(key, kind, sql, exists_sql, not kind.is_json)


@dataclass(frozen=True)
class FulltextSearch:
    """Search the `ft` index. Results can be sorted by relevance."""

    object_type: ObjectTypeId


@dataclass(frozen=True)
class SubstringSearch:
    """Every search word must appear in at least one of the keys (ILIKE)."""

    keys: tuple[str, ...]


@dataclass
class QuerySchema:
    """Queryable fields of one resource.

    Built per request, since metatypes can change with a settings reload.
    """

    table: str
    alias: str
    fields: dict[str, QueryField] = field(default_factory=dict)
    search: FulltextSearch | SubstringSearch | None = None

    def add_column(self, key: str, kind: FieldKind, column: str | None = None) -> None:
        self.fields[key] = QueryField.column(key, kind, f"{self.alias}.{column or key}")

    def add_meta(self, key: str, kind: FieldKind) -> None:
        self.fields[key] = QueryField.meta(key, kind, self.alias)

    def add_metatypes(self, namespace: str) -> None:
        """Add all metatypes from a namespace that aren't defined yet."""
        for key, meta_type in nebula.settings.metatypes.items():
            if meta_type.ns != namespace or key in self.fields:
                continue
            if not KEY_PATTERN.match(key):
                nebula.log.warning(f"Metatype {key!r} can't be queried (bad key)")
                continue
            self.add_meta(key, METACLASS_KINDS[meta_type.metaclass])

    def get(self, key: str) -> QueryField:
        if (query_field := self.fields.get(key)) is None:
            raise QueryValidationError(f"Unknown field '{key}'")
        return query_field

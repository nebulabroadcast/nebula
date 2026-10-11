"""Fields a list query can filter and sort by.

Each field has an SQL expression on the resource's base query, which the
engine wraps as `b` (see query.py):

    fields = [
        column("id", FieldKind.INTEGER),
        meta("title", FieldKind.STRING, sortable=True),
        *meta_namespace("m"),
        Field(
            "aired",
            FieldKind.BOOLEAN,
            t"COALESCE(aired.value, FALSE)",
            join=t'''LEFT JOIN LATERAL (
                SELECT TRUE AS value FROM items i JOIN asrun r ON r.id_item = i.id
                WHERE i.id_asset = b.id LIMIT 1
            ) AS aired ON TRUE''',
        ),
    ]

A `join` is added only when the request uses the field. Write it as a
lookup for one row, not EXISTS (...): Postgres hashes the whole subquery
for an EXISTS used as a filter.
"""

from dataclasses import dataclass
from enum import StrEnum
from string.templatelib import Template

import nebula
from nebula.enum import MetaClass, ObjectTypeId


class QueryValidationError(nebula.ValidationException):
    """Invalid query from the client. Not worth an error log line."""

    log = False


class FieldKind(StrEnum):
    INTEGER = "integer"
    NUMBER = "number"
    STRING = "string"
    BOOLEAN = "boolean"
    LIST = "list"
    OBJECT = "object"

    @property
    def is_json(self) -> bool:
        return self in (FieldKind.LIST, FieldKind.OBJECT)

    @property
    def cast(self) -> Template:
        return {
            FieldKind.INTEGER: t"::bigint",
            FieldKind.NUMBER: t"::double precision",
            FieldKind.STRING: t"::text",
            FieldKind.BOOLEAN: t"::boolean",
            FieldKind.LIST: t"::jsonb",
            FieldKind.OBJECT: t"::jsonb",
        }[self]


METACLASS_KINDS = {
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


@dataclass(frozen=True)
class Field:
    key: str
    kind: FieldKind
    sql: Template  # typed value, on the base query `b`
    join: Template | None = None  # FROM clause the value needs
    # Sorting by a key without an index sorts every matching row on every
    # page, so it's opt-in
    sortable: bool = False


def column(key: str, kind: FieldKind, *, sortable: bool = True) -> Field:
    return Field(key, kind, t"b.{key:ident}", sortable=sortable)


def meta(key: str, kind: FieldKind, *, sortable: bool = False) -> Field:
    if kind.is_json:
        sql = t"b.meta->{key:literal}"
    elif kind == FieldKind.STRING:
        sql = t"b.meta->>{key:literal}"
    else:
        sql = t"(b.meta->>{key:literal}){kind.cast}"
    return Field(key, kind, sql, sortable=sortable)


def meta_namespace(namespace: str, *, sortable: bool = False) -> list[Field]:
    """Every metatype of a namespace, from the current settings."""
    return [
        meta(key, METACLASS_KINDS[meta_type.metaclass], sortable=sortable)
        for key, meta_type in nebula.settings.metatypes.items()
        if meta_type.ns == namespace
    ]


@dataclass(frozen=True)
class FulltextSearch:
    """Search the `ft` index. Results can be sorted by relevance."""

    object_type: ObjectTypeId


@dataclass(frozen=True)
class SubstringSearch:
    """Every search word must appear in at least one of the keys (ILIKE)."""

    keys: tuple[str, ...]

"""nebula.query and server.query params: request checks and SQL. No database."""

from typing import Any

import pytest
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from starlette.datastructures import QueryParams

from nebula.enum import ObjectTypeId
from nebula.query import (
    Field,
    FieldKind,
    FulltextSearch,
    ListQuery,
    QueryRequest,
    QueryValidationError,
    SubstringSearch,
    column,
    meta,
)
from nebula.query.cursor import InvalidCursorError, encode_cursor
from nebula.sql import SQL
from server.query.params import query_from_params

BASE = t"SELECT id, id_folder, meta FROM assets"

FIELDS = [
    column("id", FieldKind.INTEGER),
    column("id_folder", FieldKind.INTEGER),
    meta("title", FieldKind.STRING, sortable=True),
    meta("duration", FieldKind.NUMBER),
    meta("is_live", FieldKind.BOOLEAN),
    meta("tags", FieldKind.LIST, sortable=True),
    Field(
        "aired",
        FieldKind.BOOLEAN,
        t"COALESCE(aired.value, FALSE)",
        join=t"LEFT JOIN LATERAL (SELECT TRUE AS value) AS aired ON TRUE",
    ),
]


def query(data: dict[str, Any], search: Any = None) -> ListQuery:
    return ListQuery(QueryRequest.model_validate(data), FIELDS, BASE, search)


def page_sql(data: dict[str, Any], search: Any = None) -> tuple[str, list[Any]]:
    sql, params = SQL.render(query(data, search).page_sql())
    return " ".join(sql.split()), params


def where(data: dict[str, Any], search: Any = None) -> tuple[str, list[Any]]:
    """The WHERE clause and its parameters (without the limit, the last one)."""
    sql, params = page_sql(data, search)
    return sql.split(" WHERE ", 1)[1].split(" ORDER BY ")[0], params[:-1]


def cursor_for(data: dict[str, Any], values: list[Any]) -> str:
    return encode_cursor(values, query(data).query_hash)


#
# Request model
#


@pytest.mark.parametrize(
    "data",
    [
        {"key": "title", "op": "eqq", "value": 1},  # unknown operator
        {"and": []},  # empty group
        {"and": [{"key": "title"}], "or": [{"key": "title"}]},  # ambiguous node
        {"key": "title", "value": 1, "extra": True},  # unknown attribute
    ],
)
def test_invalid_filter_rejected(data: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        QueryRequest.model_validate({"filter": data})


#
# Client errors
#


@pytest.mark.parametrize(
    ("data", "message"),
    [
        ({"filter": {"key": "nope", "value": 1}}, "Unknown field 'nope'"),
        ({"filter": {"key": "title' OR '1'='1", "value": 1}}, "Unknown field"),
        ({"filter": {"key": "duration", "value": "long"}}, "expects a number value"),
        ({"filter": {"key": "id_folder", "value": True}}, "expects a integer value"),
        ({"filter": {"key": "id_folder", "value": 1.5}}, "expects a integer value"),
        ({"filter": {"key": "title", "value": 5}}, "expects a string value"),
        ({"filter": {"key": "is_live", "value": 1}}, "expects a boolean value"),
        ({"filter": {"key": "duration", "op": "like", "value": "1%"}}, "can't be used"),
        ({"filter": {"key": "tags", "op": "gt", "value": 1}}, "can't be used"),
        ({"filter": {"key": "title", "op": "contains", "value": "x"}}, "can't be used"),
        ({"filter": {"key": "is_live", "op": "lt", "value": True}}, "can't be used"),
        ({"filter": {"key": "id_folder", "op": "in", "value": []}}, "non-empty list"),
        ({"filter": {"key": "id_folder", "op": "in", "value": 1}}, "non-empty list"),
        ({"filter": {"key": "title", "value": None}}, "Use 'exists'"),
        ({"filter": {"key": "title", "op": "exists", "value": "yes"}}, "true or false"),
        ({"sort": ["duration"]}, "Can't sort by 'duration'"),
        ({"sort": ["tags"]}, "Can't sort by 'tags'"),
        ({"sort": ["title", "-title"]}, "Duplicate sort key"),
        ({"sort": ["nope"]}, "Unknown field"),
    ],
)
def test_invalid_query(data: dict[str, Any], message: str) -> None:
    with pytest.raises(QueryValidationError, match=message) as exc_info:
        query(data)
    assert exc_info.value.status == 422


def test_filter_depth_limit() -> None:
    node: dict[str, Any] = {"key": "title", "value": "x"}
    for _ in range(7):
        node = {"not": node}
    query({"filter": node})  # 8 levels is fine
    with pytest.raises(QueryValidationError, match="nested too deep"):
        query({"filter": {"not": node}})


def test_substring_search_keys_must_exist() -> None:
    with pytest.raises(QueryValidationError, match="Unknown field 'nope'"):
        query({"q": "x"}, SubstringSearch(("title", "nope")))


def test_cursor_bound_to_query() -> None:
    cursor = cursor_for({"sort": ["title"]}, ["b", 5])
    assert query({"sort": ["title"], "cursor": cursor}).cursor == ["b", 5]

    for other in (
        {"sort": ["-title"], "cursor": cursor},
        {"sort": ["title"], "cursor": cursor, "filter": {"key": "title", "value": "x"}},
        {"sort": ["title"], "cursor": cursor, "q": "news"},
    ):
        with pytest.raises(InvalidCursorError, match="doesn't belong") as exc_info:
            query(other)
        assert exc_info.value.status == 400


@pytest.mark.parametrize(
    "cursor",
    ["garbage", "x", "eyJ2IjogWzFdfQ", cursor_for({"sort": ["title"]}, [5, 5])],
)
def test_invalid_cursor(cursor: str) -> None:
    with pytest.raises(InvalidCursorError):
        query({"sort": ["title"], "cursor": cursor})


#
# SQL
#


@pytest.mark.parametrize(
    ("condition", "sql", "params"),
    [
        ({"key": "title", "value": "News"}, "b.meta->>'title' = $1::text", ["News"]),
        (
            {"key": "duration", "op": "gt", "value": 600},
            "(b.meta->>'duration')::double precision > $1::double precision",
            [600.0],
        ),
        (
            {"key": "id_folder", "op": "nin", "value": [3]},
            'NOT (b."id_folder" = ANY($1::bigint[]))',
            [[3]],
        ),
        (
            {"key": "title", "op": "ilike", "value": "%news%"},
            "b.meta->>'title' ILIKE $1::text",
            ["%news%"],
        ),
        (
            {"key": "tags", "op": "contains", "value": ["sport"]},
            "b.meta->'tags' @> $1::jsonb",
            [["sport"]],
        ),
        ({"key": "tags", "op": "exists", "value": False}, "b.meta->'tags' IS NULL", []),
    ],
)
def test_condition(condition: dict[str, Any], sql: str, params: list[Any]) -> None:
    assert where({"filter": condition}) == (sql, params)


def test_groups() -> None:
    sql, params = where(
        {
            "filter": {
                "and": [
                    {"key": "id_folder", "value": 1},
                    {
                        "or": [
                            {"key": "title", "op": "gt", "value": "m"},
                            {"not": {"key": "title", "op": "like", "value": "x%"}},
                        ]
                    },
                ]
            }
        }
    )
    assert sql == (
        '(b."id_folder" = $1::bigint AND '
        "(b.meta->>'title' > $2::text OR NOT (b.meta->>'title' LIKE $3::text)))"
    )
    assert params == [1, "m", "x%"]


def test_page_sql() -> None:
    data = {"filter": {"key": "id_folder", "value": 3}, "sort": ["-title"], "limit": 20}
    sql, params = page_sql(data)
    assert sql == (
        'SELECT b.*, b.meta->>\'title\' AS "_sort_0", b."id" AS "_sort_1" '
        "FROM (SELECT id, id_folder, meta FROM assets) AS b "
        'WHERE b."id_folder" = $1::bigint '
        "ORDER BY b.meta->>'title' DESC, b.\"id\" DESC "
        "LIMIT $2"
    )
    assert params == [3, 21]


def test_join_only_when_used() -> None:
    join = "LEFT JOIN LATERAL (SELECT TRUE AS value) AS aired ON TRUE"
    assert join not in page_sql({"fields": ["title"]})[0]
    assert join in page_sql({"fields": ["aired"]})[0]
    assert (
        'COALESCE(aired.value, FALSE) AS "aired"' in page_sql({"fields": ["aired"]})[0]
    )

    filtered = query({"filter": {"key": "aired", "value": True}})
    assert join in SQL.render(filtered.count_sql())[0]
    assert join not in SQL.render(query({"fields": ["aired"]}).count_sql())[0]


def test_cursor_condition() -> None:
    cursor = cursor_for({"sort": ["title"]}, ["b", 5])
    sql, params = where({"sort": ["title"], "cursor": cursor})
    assert sql == (
        "(((b.meta->>'title' > $1::text OR b.meta->>'title' IS NULL)) OR "
        '(b.meta->>\'title\' = $2::text AND (b."id" > $3::bigint OR b."id" IS NULL)))'
    )
    assert params == ["b", "b", 5]


def test_cursor_condition_with_nulls() -> None:
    # NULLs are last ascending, first descending (Postgres defaults)
    cursor = cursor_for({"sort": ["title"]}, [None, 5])
    sql, params = where({"sort": ["title"], "cursor": cursor})
    assert sql == (
        '((b.meta->>\'title\' IS NULL AND (b."id" > $1::bigint OR b."id" IS NULL)))'
    )
    assert params == [5]
    cursor = cursor_for({"sort": ["-title"]}, [None, 5])
    sql, params = where({"sort": ["-title"], "cursor": cursor})
    assert sql == (
        "((b.meta->>'title' IS NOT NULL) OR "
        "(b.meta->>'title' IS NULL AND b.\"id\" < $1::bigint))"
    )
    assert params == [5]


def test_count_sql_ignores_cursor() -> None:
    data: dict[str, Any] = {"filter": {"key": "id_folder", "value": 1}}
    q = query({**data, "cursor": cursor_for(data, [7])})
    sql, params = SQL.render(q.count_sql())
    assert " ".join(sql.split()) == (
        "SELECT COUNT(*) AS total FROM (SELECT id, id_folder, meta FROM assets) AS b "
        'WHERE b."id_folder" = $1::bigint'
    )
    assert params == [1]


def test_fulltext_search() -> None:
    sql, params = page_sql({"q": "Star trek"}, FulltextSearch(ObjectTypeId.ASSET))
    assert (
        "SELECT $1::int AS n, id, weight FROM ft WHERE object_type = $2::int "
        "AND value ~>=~ 'star' AND value ~<~ 'stas' UNION ALL "
        "SELECT $3::int AS n, id, weight FROM ft WHERE object_type = $4::int "
        "AND value ~>=~ 'trek' AND value ~<~ 'trel'"
    ) in sql
    assert 'ORDER BY ft.rank DESC, b."id" DESC' in sql
    assert params[:5] == [0, 0, 1, 0, 2]


def test_fulltext_search_without_words_is_ignored() -> None:
    sql, _ = page_sql({"q": "a b"}, FulltextSearch(ObjectTypeId.ASSET))
    assert " ft " not in sql


def test_substring_search() -> None:
    assert where({"q": "50% off_"}, SubstringSearch(("title",))) == (
        "(b.meta->>'title' ILIKE $1::text) AND (b.meta->>'title' ILIKE $2::text)",
        ["%50\\%%", "%off\\_%"],
    )


#
# GET query string
#


def test_query_from_params() -> None:
    params = QueryParams(
        "fields=id,title&sort=-duration,title&limit=5&q=news&include_total=true"
        "&id_folder=1&id_folder=2&is_live=false&title=News&token=secret&api_key=k"
    )
    request = query_from_params(params, FIELDS)
    assert request.fields == ["id", "title"]
    assert request.sort == ["-duration", "title"]
    assert request.limit == 5
    assert request.q == "news"
    assert request.include_total is True
    assert request.filter is not None
    assert request.filter.model_dump(by_alias=True) == {
        "and": [
            {"key": "id_folder", "op": "in", "value": [1, 2]},
            {"key": "is_live", "op": "eq", "value": False},
            {"key": "title", "op": "eq", "value": "News"},
        ]
    }


@pytest.mark.parametrize(
    ("params", "message"),
    [
        ("id_folder=x", "expects a integer"),
        ("is_live=maybe", "true or false"),
        ("tags=a", "can't be filtered in the query string"),
        ("nope=1", "Unknown field"),
    ],
)
def test_invalid_query_params(params: str, message: str) -> None:
    with pytest.raises(QueryValidationError, match=message):
        query_from_params(QueryParams(params), FIELDS)


@pytest.mark.parametrize("params", ["limit=0", "limit=x", "limit=5000"])
def test_invalid_query_options(params: str) -> None:
    with pytest.raises(RequestValidationError):
        query_from_params(QueryParams(params), FIELDS)

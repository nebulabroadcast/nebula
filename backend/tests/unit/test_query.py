"""SQL generation of server.query. No database needed."""

from typing import Any

import pytest
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from starlette.datastructures import QueryParams

import nebula
from nebula.enum import MetaClass, ObjectTypeId
from nebula.settings.metatypes import MetaType
from server.query import (
    FieldKind,
    FulltextSearch,
    Params,
    QueryRequest,
    QuerySchema,
    QueryValidationError,
    SubstringSearch,
    compile_query,
    query_from_params,
)
from server.query.compiler import compile_filter, keyset_condition, resolve_sort
from server.query.cursor import InvalidCursorError, encode_cursor, query_hash
from server.query.schema import QueryField, sql_literal


def make_schema(search: Any = None) -> QuerySchema:
    schema = QuerySchema("assets", "a", search=search)
    schema.add_column("id", FieldKind.INTEGER)
    schema.add_column("id_folder", FieldKind.INTEGER)
    schema.add_meta("title", FieldKind.STRING)
    schema.add_meta("duration", FieldKind.NUMBER)
    schema.add_meta("qc/state", FieldKind.INTEGER)
    schema.add_meta("is_live", FieldKind.BOOLEAN)
    schema.add_meta("tags", FieldKind.LIST)
    return schema


def compile_filter_json(data: dict[str, Any]) -> tuple[str, list[Any]]:
    request = QueryRequest.model_validate({"filter": data})
    assert request.filter is not None
    params = Params()
    sql = compile_filter(make_schema(), request.filter, params)
    return sql, params.values


#
# Filter parsing
#


def test_filter_tree_parsing() -> None:
    request = QueryRequest.model_validate(
        {
            "filter": {
                "and": [
                    {"key": "id_folder", "op": "in", "value": [1, 2]},
                    {"or": [{"key": "title", "value": "x"}]},
                    {"not": {"key": "tags", "op": "exists", "value": True}},
                ]
            }
        }
    )
    assert request.filter is not None
    assert request.filter.model_dump(by_alias=True) == {
        "and": [
            {"key": "id_folder", "op": "in", "value": [1, 2]},
            {"or": [{"key": "title", "op": "eq", "value": "x"}]},
            {"not": {"key": "tags", "op": "exists", "value": True}},
        ]
    }


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
# Conditions
#


@pytest.mark.parametrize(
    ("condition", "sql", "params"),
    [
        (
            {"key": "title", "value": "News"},
            "a.meta->>'title' = $1::text",
            ["News"],
        ),
        (
            {"key": "title", "op": "ne", "value": "News"},
            "a.meta->>'title' <> $1::text",
            ["News"],
        ),
        (
            {"key": "duration", "op": "gt", "value": 600},
            "(a.meta->>'duration')::double precision > $1::double precision",
            [600.0],
        ),
        (
            {"key": "qc/state", "op": "lte", "value": 3.0},
            "(a.meta->>'qc/state')::bigint <= $1::bigint",
            [3],
        ),
        (
            {"key": "id_folder", "op": "in", "value": [1, 2]},
            "a.id_folder = ANY($1::bigint[])",
            [[1, 2]],
        ),
        (
            {"key": "id_folder", "op": "nin", "value": [3]},
            "NOT (a.id_folder = ANY($1::bigint[]))",
            [[3]],
        ),
        (
            {"key": "title", "op": "ilike", "value": "%news%"},
            "a.meta->>'title' ILIKE $1::text",
            ["%news%"],
        ),
        (
            {"key": "is_live", "value": True},
            "(a.meta->>'is_live')::boolean = $1::boolean",
            [True],
        ),
        (
            {"key": "tags", "op": "contains", "value": ["sport"]},
            "a.meta->'tags' @> $1::jsonb",
            [["sport"]],
        ),
        (
            {"key": "tags", "op": "eq", "value": ["a", "b"]},
            "a.meta->'tags' = $1::jsonb",
            [["a", "b"]],
        ),
        ({"key": "tags", "op": "exists", "value": True}, "a.meta ? 'tags'", []),
        (
            {"key": "id_folder", "op": "exists", "value": False},
            "NOT (a.id_folder IS NOT NULL)",
            [],
        ),
    ],
)
def test_condition(condition: dict[str, Any], sql: str, params: list[Any]) -> None:
    assert compile_filter_json(condition) == (sql, params)


def test_groups() -> None:
    sql, params = compile_filter_json(
        {
            "and": [
                {"key": "id_folder", "value": 1},
                {
                    "or": [
                        {"key": "duration", "op": "gt", "value": 600},
                        {"not": {"key": "title", "op": "like", "value": "x%"}},
                    ]
                },
            ]
        }
    )
    assert sql == (
        "(a.id_folder = $1::bigint AND "
        "((a.meta->>'duration')::double precision > $2::double precision OR "
        "NOT (a.meta->>'title' LIKE $3::text)))"
    )
    assert params == [1, 600.0, "x%"]


@pytest.mark.parametrize(
    ("condition", "message"),
    [
        ({"key": "nope", "value": 1}, "Unknown field 'nope'"),
        ({"key": "duration", "value": "long"}, "expects a number value"),
        ({"key": "id_folder", "value": True}, "expects a integer value"),
        ({"key": "id_folder", "value": 1.5}, "expects a integer value"),
        ({"key": "title", "value": 5}, "expects a string value"),
        ({"key": "is_live", "value": 1}, "expects a boolean value"),
        ({"key": "duration", "op": "like", "value": "1%"}, "can't be used"),
        ({"key": "tags", "op": "gt", "value": 1}, "can't be used"),
        ({"key": "title", "op": "contains", "value": "x"}, "can't be used"),
        ({"key": "is_live", "op": "lt", "value": True}, "can't be used"),
        ({"key": "id_folder", "op": "in", "value": []}, "non-empty list"),
        ({"key": "id_folder", "op": "in", "value": 1}, "non-empty list"),
        ({"key": "id_folder", "op": "in", "value": [1, "2"]}, "expects a integer"),
        ({"key": "title", "value": None}, "Use 'exists'"),
        ({"key": "title", "op": "exists", "value": "yes"}, "true or false"),
    ],
)
def test_invalid_condition(condition: dict[str, Any], message: str) -> None:
    with pytest.raises(QueryValidationError, match=message) as exc_info:
        compile_filter_json(condition)
    assert exc_info.value.status == 422


def test_filter_depth_limit() -> None:
    node: dict[str, Any] = {"key": "title", "value": "x"}
    for _ in range(7):
        node = {"not": node}
    compile_filter_json(node)  # 8 levels is fine

    with pytest.raises(QueryValidationError, match="nested too deep"):
        compile_filter_json({"not": node})


#
# Injection
#


@pytest.mark.parametrize(
    "key",
    ["title' OR '1'='1", "title'--", "a.meta", "title; DROP TABLE assets"],
)
def test_injected_keys_are_unknown_fields(key: str) -> None:
    with pytest.raises(QueryValidationError, match="Unknown field"):
        compile_filter_json({"key": key, "value": "x"})


def test_values_never_reach_sql() -> None:
    evil = "x'; DROP TABLE assets; --"
    sql, params = compile_filter_json({"key": "title", "value": evil})
    assert evil not in sql
    assert params == [evil]


@pytest.mark.parametrize("key", ["title'", "a b", "x;y", "", "ü"])
def test_unsafe_meta_keys_rejected(key: str) -> None:
    with pytest.raises(ValueError, match="Unsafe"):
        sql_literal(key)
    with pytest.raises(ValueError, match="Unsafe"):
        QueryField.meta(key, FieldKind.STRING, "a")


def test_add_metatypes(monkeypatch: pytest.MonkeyPatch) -> None:
    metatypes = {
        "phone": MetaType(ns="u", metaclass=MetaClass.STRING),
        "shift": MetaType(ns="u", metaclass=MetaClass.INTEGER),
        "title": MetaType(ns="m", metaclass=MetaClass.STRING),
        "bad'key": MetaType(ns="u", metaclass=MetaClass.STRING),
    }
    monkeypatch.setattr(nebula.settings, "metatypes", metatypes)
    schema = QuerySchema("users", "u")
    schema.add_column("id", FieldKind.INTEGER)
    schema.add_metatypes("u")
    assert set(schema.fields) == {"id", "phone", "shift"}
    assert schema.fields["shift"].sql == "(u.meta->>'shift')::bigint"


#
# Sorting and keyset
#


def sort_keys(schema: QuerySchema, sort: list[str] | None) -> list[str]:
    return [str(key) for key in resolve_sort(schema, sort)]


def test_sort() -> None:
    schema = make_schema()
    assert sort_keys(schema, None) == ["-id"]
    assert sort_keys(schema, ["title"]) == ["title", "id"]
    assert sort_keys(schema, ["-duration", "title"]) == ["-duration", "title", "id"]
    assert sort_keys(schema, ["id", "title"]) == ["id", "title"]


@pytest.mark.parametrize(
    ("sort", "message"),
    [
        (["tags"], "Can't sort by list field"),
        (["title", "-title"], "Duplicate sort key"),
        (["nope"], "Unknown field"),
    ],
)
def test_invalid_sort(sort: list[str], message: str) -> None:
    with pytest.raises(QueryValidationError, match=message):
        resolve_sort(make_schema(), sort)


def test_keyset_condition() -> None:
    sort = resolve_sort(make_schema(), ["title"])
    params = Params()
    assert keyset_condition(sort, ["b", 5], params) == (
        "((a.meta->>'title' > $1::text OR a.meta->>'title' IS NULL) OR "
        "(a.meta->>'title' = $2::text AND (a.id > $3::bigint OR a.id IS NULL)))"
    )
    assert params.values == ["b", "b", 5]


def test_keyset_condition_descending_with_null() -> None:
    sort = resolve_sort(make_schema(), ["-duration"])
    params = Params()
    # The last row had no duration: only NULL rows with a lower id follow
    assert keyset_condition(sort, [None, 5], params) == (
        "((a.meta->>'duration')::double precision IS NULL AND "
        "(a.id < $1::bigint OR a.id IS NULL))"
    )
    assert params.values == [5]


#
# Cursors
#


def test_cursor_bound_to_query() -> None:
    schema = make_schema()
    request = QueryRequest(sort=["title"])
    page_hash = query_hash(request, ["title", "id"])
    cursor = encode_cursor(["b", 5], page_hash)

    # Same query, next page
    next_page = QueryRequest(sort=["title"], cursor=cursor, limit=10)
    compiled = compile_query(schema, next_page, select="a.meta")
    assert compiled.params == ["b", "b", 5]

    # Different sort
    other = QueryRequest(sort=["-title"], cursor=cursor)
    with pytest.raises(InvalidCursorError, match="doesn't belong") as exc_info:
        compile_query(schema, other, select="a.meta")
    assert exc_info.value.status == 400

    # Different filter
    other = QueryRequest.model_validate(
        {"sort": ["title"], "cursor": cursor, "filter": {"key": "title", "value": "x"}}
    )
    with pytest.raises(InvalidCursorError, match="doesn't belong"):
        compile_query(schema, other, select="a.meta")


@pytest.mark.parametrize("cursor", ["garbage", "", "eyJ2IjogWzFdfQ"])
def test_invalid_cursor(cursor: str) -> None:
    request = QueryRequest(cursor=cursor or "x")
    with pytest.raises(InvalidCursorError):
        compile_query(make_schema(), request, select="a.meta")


#
# Whole query
#


def normalize(sql: str) -> str:
    return " ".join(sql.split())


def test_compile_query() -> None:
    params = Params()
    acl = f"a.id_folder = ANY({params.add([1, 2], 'bigint[]')})"
    request = QueryRequest.model_validate(
        {
            "filter": {"key": "duration", "op": "gt", "value": 60},
            "sort": ["title"],
            "limit": 20,
            "include_total": True,
        }
    )
    compiled = compile_query(
        make_schema(), request, select="a.id, a.meta", conditions=[acl], params=params
    )
    assert normalize(compiled.sql) == normalize("""
        SELECT a.id, a.meta, a.meta->>'title' AS _sort_0, a.id AS _sort_1
        FROM assets AS a
        WHERE a.id_folder = ANY($1::bigint[])
        AND (a.meta->>'duration')::double precision > $2::double precision
        ORDER BY a.meta->>'title' ASC NULLS LAST, a.id ASC NULLS LAST
        LIMIT 21
    """)
    assert compiled.params == [[1, 2], 60.0]
    assert compiled.count_sql is not None
    assert normalize(compiled.count_sql) == normalize("""
        SELECT COUNT(*) FROM assets AS a
        WHERE a.id_folder = ANY($1::bigint[])
        AND (a.meta->>'duration')::double precision > $2::double precision
    """)
    assert compiled.count_params == [[1, 2], 60.0]


def test_count_query_ignores_cursor() -> None:
    schema = make_schema()
    cursor = encode_cursor([7], query_hash(QueryRequest(), ["-id"]))
    request = QueryRequest(cursor=cursor, include_total=True)
    compiled = compile_query(schema, request, select="a.meta")
    assert "a.id < $1::bigint" in compiled.sql
    assert compiled.count_sql is not None
    assert "WHERE" not in compiled.count_sql
    assert compiled.count_params == []


def test_fulltext_search_sorts_by_relevance() -> None:
    schema = make_schema(search=FulltextSearch(ObjectTypeId.ASSET))
    request = QueryRequest(q="Evening news")
    compiled = compile_query(schema, request, select="a.meta")
    sql = normalize(compiled.sql)
    assert "CROSS JOIN unnest($1::text[]) AS q(token)" in sql
    assert "WHERE ft.object_type = 0" in sql
    assert "HAVING COUNT(DISTINCT q.token) = 2" in sql
    assert "JOIN ft_cte ON ft_cte.id = a.id" in sql
    assert "ORDER BY ft_cte.rank::double precision DESC NULLS LAST" in sql
    assert compiled.params == [["evening%", "news%"]]


def test_fulltext_search_without_tokens_is_ignored() -> None:
    schema = make_schema(search=FulltextSearch(ObjectTypeId.ASSET))
    compiled = compile_query(schema, QueryRequest(q="a b"), select="a.meta")
    assert "ft_cte" not in compiled.sql
    assert compiled.params == []


def test_substring_search() -> None:
    schema = make_schema(search=SubstringSearch(("title", "qc/state")))
    with pytest.raises(QueryValidationError, match="can't be used"):
        # every search key must be a string field
        compile_query(schema, QueryRequest(q="x"), select="a.meta")

    schema = make_schema(search=SubstringSearch(("title",)))
    compiled = compile_query(schema, QueryRequest(q="50% off_"), select="a.meta")
    assert (
        "(a.meta->>'title' ILIKE $1::text) AND (a.meta->>'title' ILIKE $2::text)"
        in compiled.sql
    )
    assert compiled.params == ["%50\\%%", "%off\\_%"]


#
# GET query string
#


def test_query_from_params() -> None:
    params = QueryParams(
        "fields=id,title&sort=-duration,title&limit=5&q=news&include_total=true"
        "&id_folder=1&id_folder=2&is_live=false&title=News&token=secret&api_key=k"
    )
    request = query_from_params(params, make_schema())
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
    ("query", "message"),
    [
        ("id_folder=x", "expects a integer"),
        ("is_live=maybe", "true or false"),
        ("tags=a", "can't be filtered in the query string"),
        ("nope=1", "Unknown field"),
    ],
)
def test_invalid_query_params(query: str, message: str) -> None:
    with pytest.raises(QueryValidationError, match=message):
        query_from_params(QueryParams(query), make_schema())


@pytest.mark.parametrize("query", ["limit=0", "limit=x", "limit=5000"])
def test_invalid_query_options(query: str) -> None:
    with pytest.raises(RequestValidationError) as exc_info:
        query_from_params(QueryParams(query), make_schema())
    assert exc_info.value.errors()[0]["loc"] == ("query", "limit")

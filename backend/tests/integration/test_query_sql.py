"""Run server.query SQL against a real database. Read-only."""

from typing import Any

import pytest

import nebula
from nebula.enum import MetaClass, ObjectTypeId
from server.query import (
    FieldKind,
    FulltextSearch,
    QueryRequest,
    QuerySchema,
    SubstringSearch,
    compile_query,
    run_query,
)

pytestmark = pytest.mark.asyncio(loop_scope="session")

SELECT = "a.id"


def assets_schema() -> QuerySchema:
    schema = QuerySchema("assets", "a", search=FulltextSearch(ObjectTypeId.ASSET))
    for column in (
        "id",
        "id_folder",
        "content_type",
        "media_type",
        "status",
        "version_of",
        "ctime",
        "mtime",
    ):
        schema.add_column(column, FieldKind.INTEGER)
    for namespace in {meta_type.ns for meta_type in nebula.settings.metatypes.values()}:
        schema.add_metatypes(namespace)
    return schema


def metatype_key(metaclass: MetaClass) -> str:
    """Any metatype of the given class (dev databases differ)."""
    for key, meta_type in nebula.settings.metatypes.items():
        if meta_type.metaclass == metaclass:
            return key
    pytest.skip(f"No {metaclass.name} metatype defined")


async def fetch_ids(schema: QuerySchema, request: QueryRequest) -> list[int]:
    result = await run_query(compile_query(schema, request, select=SELECT))
    return [row["id"] for row in result.rows]


async def fetch_all_pages(
    schema: QuerySchema, data: dict[str, Any], page_size: int
) -> list[int]:
    ids: list[int] = []
    cursor = None
    for _ in range(1000):
        request = QueryRequest.model_validate(
            {**data, "limit": page_size, "cursor": cursor}
        )
        result = await run_query(compile_query(schema, request, select=SELECT))
        ids.extend(row["id"] for row in result.rows)
        if not result.has_more:
            assert result.next_cursor is None
            return ids
        cursor = result.next_cursor
    raise AssertionError("Pagination doesn't end")


async def test_every_operator_executes() -> None:
    schema = assets_schema()
    list_key = metatype_key(MetaClass.LIST)
    conditions: list[dict[str, Any]] = [
        {"key": "title", "op": "eq", "value": "x"},
        {"key": "title", "op": "ne", "value": "x"},
        {"key": "title", "op": "lt", "value": "m"},
        {"key": "title", "op": "in", "value": ["a", "b"]},
        {"key": "title", "op": "nin", "value": ["a"]},
        {"key": "title", "op": "like", "value": "%a%"},
        {"key": "title", "op": "ilike", "value": "%A%"},
        {"key": "id_folder", "op": "in", "value": [1, 2]},
        {"key": "ctime", "op": "gte", "value": 0},
        {"key": "duration", "op": "gt", "value": 0.5},
        {"key": metatype_key(MetaClass.BOOLEAN), "op": "eq", "value": True},
        {"key": list_key, "op": "contains", "value": ["x"]},
        {"key": list_key, "op": "eq", "value": []},
        {"key": list_key, "op": "exists", "value": True},
        {"key": "id", "op": "exists", "value": False},
    ]
    for condition in conditions:
        request = QueryRequest.model_validate({"filter": condition})
        await fetch_ids(schema, request)

    nested = {"and": [*conditions[:3], {"or": conditions[3:6]}, {"not": conditions[6]}]}
    await fetch_ids(schema, QueryRequest.model_validate({"filter": nested}))


async def test_filters_match_python() -> None:
    schema = assets_schema()
    rows = await nebula.db.fetch("SELECT id, id_folder, meta FROM assets")
    folder = rows[0]["id_folder"] if rows else 1

    request = QueryRequest.model_validate(
        {"filter": {"key": "id_folder", "value": folder}, "limit": 1000}
    )
    expected = {row["id"] for row in rows if row["id_folder"] == folder}
    assert set(await fetch_ids(schema, request)) == expected

    request = QueryRequest.model_validate(
        {"filter": {"key": "title", "op": "exists", "value": False}, "limit": 1000}
    )
    expected = {row["id"] for row in rows if "title" not in row["meta"]}
    assert set(await fetch_ids(schema, request)) == expected


async def test_keyset_pagination_on_every_sortable_field() -> None:
    schema = assets_schema()
    total = (await nebula.db.fetchrow("SELECT COUNT(*) FROM assets"))[0]  # type: ignore[index]
    if total < 2:
        pytest.skip("Not enough assets to paginate")

    for key, field in sorted(schema.fields.items()):
        if not field.sortable:
            continue
        for sort in ([key], [f"-{key}"]):
            data = {"sort": sort}
            expected = await fetch_ids(
                schema, QueryRequest.model_validate({**data, "limit": 1000})
            )
            assert len(expected) == total
            assert await fetch_all_pages(schema, data, page_size=3) == expected, sort


async def test_total() -> None:
    schema = assets_schema()
    request = QueryRequest(limit=1, include_total=True)
    result = await run_query(compile_query(schema, request, select=SELECT))
    count = (await nebula.db.fetchrow("SELECT COUNT(*) FROM assets"))[0]  # type: ignore[index]
    assert result.total == count
    assert result.has_more == (count > 1)


async def test_fulltext_search() -> None:
    row = await nebula.db.fetchrow(
        "SELECT value FROM ft WHERE object_type = 0 AND length(value) >= 3 LIMIT 1"
    )
    if row is None:
        pytest.skip("Fulltext index is empty")
    word = row["value"]
    expected = {
        r["id"]
        for r in await nebula.db.fetch(
            "SELECT DISTINCT id FROM ft WHERE object_type = 0 AND value LIKE $1",
            f"{word}%",
        )
    }

    schema = assets_schema()
    request = QueryRequest(q=word, limit=1000)
    assert set(await fetch_ids(schema, request)) == expected

    # relevance order, paginated
    all_ids = await fetch_ids(schema, request)
    assert await fetch_all_pages(assets_schema(), {"q": word}, page_size=1) == all_ids


async def test_users_substring_search() -> None:
    row = await nebula.db.fetchrow("SELECT login FROM users ORDER BY id LIMIT 1")
    if row is None:
        pytest.skip("No users")

    schema = QuerySchema("users", "u", search=SubstringSearch(("login",)))
    schema.add_column("id", FieldKind.INTEGER)
    schema.add_column("login", FieldKind.STRING)
    request = QueryRequest(q=row["login"][1:].upper())
    result = await run_query(compile_query(schema, request, select="u.login"))
    assert row["login"] in [r["login"] for r in result.rows]

"""Run server.query SQL against a real database.

Read-only: tests that need rows (computed fields) add them in a transaction
that is rolled back. The base query limits assets to a sample, so results
can be checked exactly on any database size.
"""

from collections.abc import AsyncIterator
from string.templatelib import Template
from typing import Any

import pytest
import pytest_asyncio

import nebula
from nebula.enum import ObjectTypeId
from server.query import (
    Field,
    FieldKind,
    FulltextSearch,
    QueryRequest,
    SubstringSearch,
    column,
    fetch_page,
    meta_namespace,
)

pytestmark = pytest.mark.asyncio(loop_scope="session")

SAMPLE_SIZE = 300
SEARCH = FulltextSearch(ObjectTypeId.ASSET)


def asset_fields() -> list[Field]:
    namespaces = {meta_type.ns for meta_type in nebula.settings.metatypes.values()}
    return [
        column("id", FieldKind.INTEGER),
        column("id_folder", FieldKind.INTEGER),
        column("status", FieldKind.INTEGER),
        column("ctime", FieldKind.INTEGER),
        column("mtime", FieldKind.INTEGER),
        Field(
            "aired",
            FieldKind.BOOLEAN,
            t"COALESCE(aired.value, FALSE)",
            join=t"""LEFT JOIN LATERAL (
                SELECT TRUE AS value
                FROM items i JOIN asrun r ON r.id_item = i.id
                WHERE i.id_asset = b.id
                LIMIT 1
            ) AS aired ON TRUE""",
            sortable=True,
        ),
        Field(
            "aux",
            FieldKind.LIST,
            t"aux.value",
            join=t"""LEFT JOIN LATERAL (
                SELECT COALESCE(jsonb_agg(key ORDER BY key), '[]') AS value
                FROM aux WHERE object_type = 0 AND id_object = b.id
            ) AS aux ON TRUE""",
        ),
        # Every metatype; sortable to test paging on every kind of value
        *(f for ns in sorted(namespaces) for f in meta_namespace(ns, sortable=True)),
    ]


def assets_base(ids: list[int]) -> Template:
    return t"""
        SELECT id, id_folder, status, ctime, mtime, meta
        FROM assets WHERE id = ANY({ids}::integer[])
    """


@pytest_asyncio.fixture(loop_scope="session")
async def sample() -> list[dict[str, Any]]:
    rows = await nebula.db.fetch(
        "SELECT id, id_folder, meta FROM assets ORDER BY id LIMIT $1", SAMPLE_SIZE
    )
    if len(rows) < 5:
        pytest.skip("Not enough assets")
    return [dict(row) for row in rows]


def sample_ids(sample: list[dict[str, Any]]) -> list[int]:
    return [row["id"] for row in sample]


async def fetch(base: Template, data: dict[str, Any]) -> list[dict[str, Any]]:
    request = QueryRequest.model_validate({"limit": 1000, **data})
    page = await fetch_page(request, asset_fields(), base, SEARCH)
    assert not page.has_more
    keys = ["id", *(request.fields or [])]
    return [{key: row[key] for key in keys} for row in page.rows]


async def fetch_ids(base: Template, data: dict[str, Any]) -> list[int]:
    return [item["id"] for item in await fetch(base, data)]


async def fetch_all_pages(
    base: Template, data: dict[str, Any], page_size: int
) -> list[int]:
    ids: list[int] = []
    cursor = None
    for _ in range(1000):
        request = QueryRequest.model_validate(
            {**data, "limit": page_size, "cursor": cursor}
        )
        page = await fetch_page(request, asset_fields(), base, SEARCH)
        ids.extend(row["id"] for row in page.rows)
        if not page.has_more:
            assert page.next_cursor is None
            return ids
        cursor = page.next_cursor
    raise AssertionError("Pagination doesn't end")


def metatype_key(kind: FieldKind) -> str:
    """A metatype of the given kind (dev databases differ)."""
    for field in asset_fields():
        if field.kind == kind and "/" not in field.key and field.join is None:
            return field.key
    pytest.skip(f"No {kind} metatype defined")


async def test_every_operator_executes(sample: list[dict[str, Any]]) -> None:
    base = assets_base(sample_ids(sample))
    list_key = metatype_key(FieldKind.LIST)
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
        {"key": metatype_key(FieldKind.BOOLEAN), "op": "eq", "value": True},
        {"key": metatype_key(FieldKind.INTEGER), "op": "lte", "value": 3},
        {"key": list_key, "op": "contains", "value": ["x"]},
        {"key": list_key, "op": "eq", "value": []},
        {"key": list_key, "op": "exists", "value": True},
        {"key": "id", "op": "exists", "value": False},
        {"key": "aired", "op": "eq", "value": False},
        {"key": "aux", "op": "contains", "value": ["x"]},
    ]
    for condition in conditions:
        await fetch_ids(base, {"filter": condition})

    nested = {"and": [*conditions[:3], {"or": conditions[3:6]}, {"not": conditions[6]}]}
    await fetch_ids(base, {"filter": nested, "include_total": True})


async def test_filters_match_python(sample: list[dict[str, Any]]) -> None:
    base = assets_base(sample_ids(sample))
    folder = sample[0]["id_folder"]
    expected = {row["id"] for row in sample if row["id_folder"] == folder}
    assert (
        set(await fetch_ids(base, {"filter": {"key": "id_folder", "value": folder}}))
        == expected
    )

    expected = {row["id"] for row in sample if "duration" not in row["meta"]}
    condition = {"key": "duration", "op": "exists", "value": False}
    assert set(await fetch_ids(base, {"filter": condition})) == expected


async def test_keyset_pagination_on_every_sortable_field(
    sample: list[dict[str, Any]],
) -> None:
    base = assets_base(sample_ids(sample))
    sortable = sorted(
        {f.key for f in asset_fields() if f.sortable and not f.kind.is_json}
    )
    assert "title" in sortable

    for key in sortable:
        for sort in ([key], [f"-{key}"]):
            expected = await fetch_ids(base, {"sort": sort})
            assert len(expected) == len(sample)
            assert (
                await fetch_all_pages(base, {"sort": sort}, page_size=7) == expected
            ), sort


async def test_total(sample: list[dict[str, Any]]) -> None:
    base = assets_base(sample_ids(sample))
    request = QueryRequest(limit=1, include_total=True)
    page = await fetch_page(request, asset_fields(), base)
    assert page.total == len(sample)
    assert page.has_more


async def test_fulltext_search() -> None:
    row = await nebula.db.fetchrow(
        """
        SELECT value FROM ft WHERE object_type = 0 AND length(value) >= 4
        GROUP BY value HAVING count(*) BETWEEN 2 AND 30 LIMIT 1
        """
    )
    if row is None:
        pytest.skip("Fulltext index has no suitable word")
    word = row["value"]
    expected = {
        r["id"]
        for r in await nebula.db.fetch(
            "SELECT DISTINCT id FROM ft WHERE object_type = 0 AND value LIKE $1",
            f"{word}%",
        )
    }
    if len(expected) >= 1000:
        pytest.skip("Search word too common")
    base = t"SELECT id, id_folder, status, ctime, mtime, meta FROM assets"

    ids = await fetch_ids(base, {"q": word})
    assert set(ids) == expected
    # By relevance, paginated
    assert await fetch_all_pages(base, {"q": word}, page_size=1) == ids


#
# Computed fields
#


@pytest_asyncio.fixture(loop_scope="session")
async def history() -> AsyncIterator[dict[str, int]]:
    """Three assets: one aired, one with aux keys, one with neither.

    Rows are added in a transaction that is rolled back afterwards. The
    engine uses the same connection (nebula.db.acquire sets it as current).
    """
    async with nebula.db.acquire() as conn:
        transaction = conn.transaction()
        await transaction.start()
        try:
            rows = await conn.fetch(
                """
                SELECT a.id FROM assets a
                WHERE NOT EXISTS (SELECT 1 FROM items i WHERE i.id_asset = a.id)
                AND NOT EXISTS (
                    SELECT 1 FROM aux x WHERE x.object_type = 0 AND x.id_object = a.id
                )
                ORDER BY a.id LIMIT 3
                """
            )
            if len(rows) < 3:
                pytest.skip("Not enough assets without history")
            aired, with_aux, plain = (row["id"] for row in rows)

            id_bin = await conn.fetchval(
                "INSERT INTO bins (bin_type, meta) VALUES (0, '{}') RETURNING id"
            )
            for position, id_asset in enumerate((aired, with_aux)):
                id_item = await conn.fetchval(
                    """
                    INSERT INTO items (id_asset, id_bin, position, meta)
                    VALUES ($1, $2, $3, '{}') RETURNING id
                    """,
                    id_asset,
                    id_bin,
                    position,
                )
                if id_asset == aired:
                    await conn.execute(
                        "INSERT INTO asrun (id_channel, id_item, start)"
                        " VALUES (1, $1, 0)",
                        id_item,
                    )
            for key in ("foo", "bar"):
                await conn.execute(
                    "INSERT INTO aux (key, object_type, id_object) VALUES ($1, 0, $2)",
                    key,
                    with_aux,
                )
            yield {"aired": aired, "with_aux": with_aux, "plain": plain}
        finally:
            await transaction.rollback()


async def test_computed_fields(history: dict[str, int]) -> None:
    aired, with_aux, plain = history["aired"], history["with_aux"], history["plain"]
    base = assets_base([aired, with_aux, plain])

    items = await fetch(base, {"fields": ["aired", "aux"], "sort": ["id"]})
    assert items == [
        {"id": aired, "aired": True, "aux": []},
        {"id": with_aux, "aired": False, "aux": ["bar", "foo"]},
        {"id": plain, "aired": False, "aux": []},
    ]

    condition = {"key": "aired", "op": "eq", "value": True}
    assert await fetch_ids(base, {"filter": condition}) == [aired]
    condition = {"key": "aux", "op": "contains", "value": ["foo"]}
    assert await fetch_ids(base, {"filter": condition}) == [with_aux]

    # Sortable in this test (not by default): true sorts after false
    assert await fetch_ids(base, {"sort": ["-aired", "id"]}) == [aired, with_aux, plain]
    assert await fetch_all_pages(base, {"sort": ["-aired"]}, page_size=1) == (
        await fetch_ids(base, {"sort": ["-aired"]})
    )


#
# Users
#


async def test_users_substring_search() -> None:
    row = await nebula.db.fetchrow("SELECT login FROM users ORDER BY id LIMIT 1")
    if row is None:
        pytest.skip("No users")

    fields = [column("id", FieldKind.INTEGER), column("login", FieldKind.STRING)]
    request = QueryRequest(q=row["login"][1:].upper())
    base = t"SELECT id, login FROM users"
    page = await fetch_page(request, fields, base, SubstringSearch(("login",)))
    assert row["login"] in [r["login"] for r in page.rows]

"""/api/v2/assets list endpoints against a real database. Read-only."""

from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI

import nebula
from nebula.context import is_system, set_default_system
from server.errors import REST_PREFIX, install_error_handlers
from server.middleware.context import RequestContextMiddleware
from server.rest import install_rest_routers
from server.session import Session

pytestmark = pytest.mark.asyncio(loop_scope="session")

ASSETS = f"{REST_PREFIX}/assets"
ADMIN_TOKEN = "a" * 64
FOLDER_TOKEN = "f" * 64
LIMITED_TOKEN = "l" * 64
LIMITED_ID = -1  # no asset is created by or assigned to this user


@pytest_asyncio.fixture(loop_scope="session")
async def folder() -> int:
    """The folder with the fewest assets, so it can be listed in full."""
    row = await nebula.db.fetchrow(
        "SELECT id_folder FROM assets GROUP BY id_folder ORDER BY COUNT(*) LIMIT 1"
    )
    if row is None:
        pytest.skip("No assets in the database")
    return int(row["id_folder"])


@pytest_asyncio.fixture(loop_scope="session")
async def client(
    monkeypatch: pytest.MonkeyPatch, folder: int
) -> AsyncIterator[httpx.AsyncClient]:
    users = {
        ADMIN_TOKEN: {"id": 1, "login": "admin", "is_admin": True},
        FOLDER_TOKEN: {"id": 2, "login": "viewer", "can/asset_view": [folder]},
        LIMITED_TOKEN: {"id": LIMITED_ID, "login": "limited", "is_limited": True},
    }

    async def check(token: str, _request: Any, _transient: bool = False) -> Any:
        meta = users.get(token)
        return None if meta is None else SimpleNamespace(user=meta)

    monkeypatch.setattr(Session, "check", check)

    app = FastAPI()
    app.add_middleware(RequestContextMiddleware)
    install_error_handlers(app)
    install_rest_routers(app)

    default = is_system()
    set_default_system(False)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
    ) as http_client:
        yield http_client
    set_default_system(default)


async def folder_ids(folder: int) -> list[int]:
    rows = await nebula.db.fetch(
        "SELECT id FROM assets WHERE id_folder = $1 ORDER BY id DESC", folder
    )
    return [row["id"] for row in rows]


async def test_list_fields(client: httpx.AsyncClient, folder: int) -> None:
    params = {"id_folder": folder, "fields": "title,has_aired,__aux", "limit": 1000}
    body = (await client.get(ASSETS, params=params)).json()
    assert [item["id"] for item in body["items"]] == await folder_ids(folder)
    for item in body["items"]:
        assert set(item) <= {"id", "title", "has_aired", "__aux"}
        assert isinstance(item["has_aired"], bool)
        assert isinstance(item["__aux"], list)


async def test_default_fields(client: httpx.AsyncClient, folder: int) -> None:
    body = (await client.get(ASSETS, params={"id_folder": folder, "limit": 1})).json()
    item = body["items"][0]
    row = await nebula.db.fetchrow("SELECT meta FROM assets WHERE id = $1", item["id"])
    assert row is not None
    stored = {k: v for k, v in row["meta"].items() if not k.startswith("__")}
    assert item == stored


async def test_pagination(client: httpx.AsyncClient, folder: int) -> None:
    ids: list[int] = []
    params: dict[str, Any] = {"id_folder": folder, "limit": 2, "fields": "id"}
    for _ in range(1000):
        body = (await client.get(ASSETS, params=params)).json()
        ids.extend(item["id"] for item in body["items"])
        if not body["has_more"]:
            break
        params["cursor"] = body["next_cursor"]
    assert ids == await folder_ids(folder)


@pytest.mark.parametrize("method", ["QUERY", "POST"])
async def test_query(client: httpx.AsyncClient, method: str, folder: int) -> None:
    url = ASSETS if method == "QUERY" else f"{ASSETS}/query"
    payload = {
        "fields": ["id_folder"],
        "filter": {"key": "id_folder", "op": "in", "value": [folder]},
        "include_total": True,
        "limit": 1000,
    }
    body = (await client.request(method, url, json=payload)).json()
    assert body["total"] == len(await folder_ids(folder))
    assert {item["id_folder"] for item in body["items"]} == {folder}


async def test_folder_acl(client: httpx.AsyncClient, folder: int) -> None:
    headers = {"Authorization": f"Bearer {FOLDER_TOKEN}"}
    params = {"limit": 1000, "fields": "id_folder"}
    body = (await client.get(ASSETS, params=params, headers=headers)).json()
    assert [item["id"] for item in body["items"]] == await folder_ids(folder)


async def test_limited_acl(client: httpx.AsyncClient) -> None:
    headers = {"Authorization": f"Bearer {LIMITED_TOKEN}"}
    body = (await client.get(ASSETS, headers=headers)).json()
    assert body["items"] == []


@pytest.mark.parametrize(
    ("params", "status", "detail"),
    [
        ({"nope": "1"}, 422, "Unknown field 'nope'"),
        ({"fields": "login"}, 422, "Unknown field 'login'"),
        ({"sort": "subtitle"}, 422, "Can't sort by 'subtitle'"),
        ({"sort": "-__aux"}, 422, "Can't sort by '__aux'"),
        ({"cursor": "garbage"}, 400, "Invalid cursor"),
    ],
)
async def test_invalid_queries(
    client: httpx.AsyncClient, params: dict[str, str], status: int, detail: str
) -> None:
    response = await client.get(ASSETS, params=params)
    assert response.status_code == status
    assert detail in response.json()["detail"]


async def test_sort_by_indexed_title(client: httpx.AsyncClient) -> None:
    indexed = await nebula.db.fetchrow(
        "SELECT 1 FROM pg_indexes WHERE indexname = 'idx_title'"
    )
    if indexed is None:
        pytest.skip("title has no index on this database")
    response = await client.get(ASSETS, params={"sort": "title", "limit": 5})
    assert response.status_code == 200

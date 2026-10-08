"""/api/v2/users list endpoints against a real database. Read-only."""

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

USERS = f"{REST_PREFIX}/users"
ADMIN_TOKEN = "a" * 64


@pytest_asyncio.fixture(loop_scope="session")
async def client(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[httpx.AsyncClient]:
    row = await nebula.db.fetchrow(
        "SELECT meta FROM users WHERE meta->>'is_admin' = 'true' ORDER BY id LIMIT 1"
    )
    if row is None:
        pytest.skip("No admin user in the database")
    admin_meta = row["meta"]

    async def check(token: str, _request: Any, _transient: bool = False) -> Any:
        return SimpleNamespace(user=admin_meta) if token == ADMIN_TOKEN else None

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


async def all_users() -> list[dict[str, Any]]:
    rows = await nebula.db.fetch("SELECT meta FROM users")
    return [dict(row["meta"]) for row in rows]


async def test_list(client: httpx.AsyncClient) -> None:
    users = await all_users()
    response = await client.get(USERS, params={"sort": "login"})
    assert response.status_code == 200
    body = response.json()
    assert [u["login"] for u in body["items"]] == sorted(u["login"] for u in users)
    assert body["has_more"] is False
    assert body["next_cursor"] is None
    assert "total" not in body
    for item in body["items"]:
        assert "password" not in item
        assert "api_key" not in item


async def test_list_filters_and_fields(client: httpx.AsyncClient) -> None:
    users = await all_users()
    admins = sorted(u["id"] for u in users if u.get("is_admin"))

    response = await client.get(
        USERS, params={"is_admin": "true", "fields": "login", "include_total": "true"}
    )
    body = response.json()
    assert sorted(item["id"] for item in body["items"]) == admins
    assert all(set(item) == {"id", "login"} for item in body["items"])
    assert body["total"] == len(admins)


@pytest.mark.parametrize("method", ["QUERY", "POST"])
async def test_query(client: httpx.AsyncClient, method: str) -> None:
    users = await all_users()
    login = users[0]["login"]
    url = USERS if method == "QUERY" else f"{USERS}/query"
    payload = {
        "filter": {"or": [{"key": "login", "value": login}, {"key": "id", "value": -1}]}
    }
    response = await client.request(method, url, json=payload)
    assert response.status_code == 200
    assert [item["login"] for item in response.json()["items"]] == [login]


async def test_search(client: httpx.AsyncClient) -> None:
    users = await all_users()
    login = users[0]["login"]
    response = await client.get(USERS, params={"q": login[1:].upper()})
    assert login in [item["login"] for item in response.json()["items"]]


async def test_pagination(client: httpx.AsyncClient) -> None:
    users = await all_users()
    ids: list[int] = []
    params: dict[str, Any] = {"limit": 1, "sort": "-login"}
    for _ in range(len(users) + 1):
        body = (await client.get(USERS, params=params)).json()
        ids.extend(item["id"] for item in body["items"])
        if not body["has_more"]:
            break
        params["cursor"] = body["next_cursor"]
    expected = [u["id"] for u in sorted(users, key=lambda u: u["login"], reverse=True)]
    assert ids == expected


@pytest.mark.parametrize(
    ("params", "status", "detail"),
    [
        ({"nope": "1"}, 422, "Unknown field 'nope'"),
        ({"limit": "0"}, 422, "greater than or equal to 1"),
        ({"cursor": "garbage"}, 400, "Invalid cursor"),
        ({"fields": "password"}, 422, "Unknown field 'password'"),
    ],
)
async def test_invalid_queries(
    client: httpx.AsyncClient, params: dict[str, str], status: int, detail: str
) -> None:
    response = await client.get(USERS, params=params)
    assert response.status_code == status
    assert response.headers["content-type"] == "application/problem+json"
    assert detail in response.json()["detail"]

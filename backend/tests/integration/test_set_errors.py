"""/api/set reports the status of a failed operation. Read-only: the
requests fail before anything is written."""

from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any

import httpx2
import pytest
import pytest_asyncio
from fastapi import FastAPI

import nebula
from api.objects.set_metadata import SetMetadata
from nebula.context import is_system, set_default_system
from server.errors import install_error_handlers
from server.middleware.context import RequestContextMiddleware
from server.session import Session

pytestmark = pytest.mark.asyncio(loop_scope="session")

ADMIN_TOKEN = "a" * 64
USER_TOKEN = "u" * 64


@pytest_asyncio.fixture(loop_scope="session")
async def client(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[httpx2.AsyncClient]:
    row = await nebula.db.fetchrow(
        "SELECT meta FROM users WHERE meta->>'is_admin' = 'true' ORDER BY id LIMIT 1"
    )
    if row is None:
        pytest.skip("No admin user in the database")
    sessions = {
        ADMIN_TOKEN: row["meta"],
        USER_TOKEN: {"id": 999999, "login": "viewer", "is_admin": False},
    }

    async def check(token: str, _request: Any, **_: Any) -> Any:
        user = sessions.get(token)
        return SimpleNamespace(user=user) if user else None

    monkeypatch.setattr(Session, "check", check)

    app = FastAPI()
    app.add_middleware(RequestContextMiddleware)
    install_error_handlers(app)
    app.add_api_route("/api/set", SetMetadata().handle, methods=["POST"])

    default = is_system()
    set_default_system(False)
    transport = httpx2.ASGITransport(app=app)
    async with httpx2.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    set_default_system(default)


async def test_set_without_permission_is_forbidden(client: httpx2.AsyncClient) -> None:
    row = await nebula.db.fetchrow("SELECT id FROM assets ORDER BY id LIMIT 1")
    if row is None:
        pytest.skip("No assets in the database")
    response = await client.post(
        "/api/set",
        json={"object_type": "asset", "id": row["id"], "data": {"title": "x"}},
        headers={"Authorization": f"Bearer {USER_TOKEN}"},
    )
    assert response.status_code == 403
    assert (
        response.json()["detail"] == "You are not allowed to edit assets in this folder"
    )


async def test_set_missing_object_is_not_found(client: httpx2.AsyncClient) -> None:
    response = await client.post(
        "/api/set",
        json={"object_type": "asset", "id": 2_000_000_000, "data": {"title": "x"}},
        headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
    )
    assert response.status_code == 404

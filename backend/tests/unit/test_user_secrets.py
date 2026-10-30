"""Password and API key hashes never leave the database. No database."""

from collections.abc import AsyncIterator
from typing import Any

import pytest

import nebula
from api.objects.get_objects import GetObjects, GetObjectsRequest
from nebula.enum import ObjectType
from server.session import SessionModel

ALICE = {
    "id": 2,
    "login": "alice",
    "password": "hash",
    "api_key": "hash",
    "api_key_preview": "nb.a*******abcd",
}
PUBLIC = {"id": 2, "login": "alice"}


def test_session_has_no_secrets() -> None:
    # Stored by create(), or by an older version and loaded from redis
    session = SessionModel(user=ALICE, token="t" * 64, created=0, accessed=0)
    assert session.user == PUBLIC
    # Session.update / refresh_user
    session.user = ALICE
    assert session.user == PUBLIC
    assert "hash" not in session.model_dump_json()


@pytest.mark.asyncio
async def test_get_user_has_no_secrets(monkeypatch: pytest.MonkeyPatch) -> None:
    async def iterate(*_: Any) -> AsyncIterator[dict[str, Any]]:
        yield {"meta": ALICE}

    monkeypatch.setattr(nebula.db, "iterate", iterate)
    request = GetObjectsRequest(object_type=ObjectType.USER, ids=[2])
    admin = nebula.User(meta={"id": 1, "login": "admin", "is_admin": True})
    response = await GetObjects().handle(request, admin)
    assert response.data == [PUBLIC]

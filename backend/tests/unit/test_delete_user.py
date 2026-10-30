"""A deleted user is logged out everywhere. No database, no redis."""

from collections.abc import AsyncGenerator
from types import SimpleNamespace
from typing import Any

import pytest

import nebula
from api.objects.delete_objects import DeleteObjects, DeleteObjectsRequest
from nebula.context import RequestContext, request_context
from nebula.enum import ObjectType
from server.session import Session

ADMIN = nebula.User(meta={"id": 1, "login": "admin", "is_admin": True})


@pytest.mark.asyncio
async def test_delete_user_logs_them_out(monkeypatch: pytest.MonkeyPatch) -> None:
    sessions = {"admin": 1, "alice-1": 2, "alice-2": 2}

    async def load(_cls: Any, object_id: int, **_: Any) -> nebula.User:
        return nebula.User(meta={"id": object_id, "login": f"user{object_id}"})

    async def delete_user(_self: nebula.User) -> None:
        pass

    async def list_sessions() -> AsyncGenerator[Any]:
        for token, user_id in list(sessions.items()):
            yield SimpleNamespace(token=token, user={"id": user_id})

    async def delete_session(token: str) -> None:
        del sessions[token]

    monkeypatch.setattr(nebula.User, "load", classmethod(load))
    monkeypatch.setattr(nebula.User, "delete", delete_user)
    monkeypatch.setattr(Session, "list", list_sessions)
    monkeypatch.setattr(Session, "delete", delete_session)

    request = DeleteObjectsRequest(object_type=ObjectType.USER, ids=[2])
    with request_context(RequestContext(user=ADMIN, session_token="admin")):  # noqa: S106
        await DeleteObjects().handle(request, ADMIN)
    assert sessions == {"admin": 1}

    # Deleting yourself ends the current session too
    request = DeleteObjectsRequest(object_type=ObjectType.USER, ids=[1])
    with request_context(RequestContext(user=ADMIN, session_token="admin")):  # noqa: S106
        await DeleteObjects().handle(request, ADMIN)
    assert sessions == {}

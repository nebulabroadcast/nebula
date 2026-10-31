"""Listed sessions never carry their token. No redis."""

from collections.abc import AsyncGenerator
from types import SimpleNamespace
from typing import Any

import pytest

import nebula
from api.sessions.invalidate_session import (
    InvalidateSession,
    InvalidateSessionRequest,
)
from api.sessions.list_sessions import ListSessions, ListSessionsRequest
from server.session import Session, SessionModel

pytestmark = pytest.mark.asyncio

ADMIN = nebula.User(meta={"id": 1, "login": "admin", "is_admin": True})
ALICE = nebula.User(meta={"id": 2, "login": "alice"})
TOKEN = "a" * 64


@pytest.fixture
def sessions(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    tokens = [TOKEN]

    async def list_sessions() -> AsyncGenerator[SessionModel]:
        for token in tokens:
            yield SessionModel(user=ALICE.meta, token=token, created=0, accessed=0)

    async def delete(token: str) -> None:
        tokens.remove(token)

    monkeypatch.setattr(Session, "list", list_sessions)
    monkeypatch.setattr(Session, "delete", delete)
    return tokens


@pytest.mark.usefixtures("sessions")
async def test_list_hides_token() -> None:
    http_request: Any = SimpleNamespace(state=SimpleNamespace(session_token=None))
    request = ListSessionsRequest(id_user=2)
    [item] = await ListSessions().handle(request, ADMIN, http_request)
    assert TOKEN not in item.model_dump_json()
    assert item.id == Session.id_of(TOKEN)


@pytest.mark.parametrize("by", [TOKEN, Session.id_of(TOKEN)])
async def test_invalidate_by_token_or_id(sessions: list[str], by: str) -> None:
    await InvalidateSession().handle(InvalidateSessionRequest(token=by), ALICE)
    assert sessions == []
    with pytest.raises(nebula.NotFoundException):
        await InvalidateSession().handle(InvalidateSessionRequest(token=by), ALICE)

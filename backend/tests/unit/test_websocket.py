"""Open websockets lose access with their session. No redis."""

from typing import Any

import pytest

from server.session import Session
from server.websocket import Client, Messaging

pytestmark = pytest.mark.asyncio


class FakeSocket:
    closed = False

    async def close(self, **_: Any) -> None:
        self.closed = True


async def test_revoked_session_closes_socket(monkeypatch: pytest.MonkeyPatch) -> None:
    live = {"kept"}

    async def check(token: str, *_: Any, **__: Any) -> object | None:
        return object() if token in live else None

    monkeypatch.setattr(Session, "check", check)
    messaging = Messaging()
    sockets = {}
    for token in ["kept", "revoked"]:
        sockets[token] = FakeSocket()
        client = Client(sockets[token])  # type: ignore[arg-type]
        client.authorized, client.token = True, token
        client.created_at = 0  # connected long ago
        messaging.clients[token] = client

    await messaging.purge()
    assert set(messaging.clients) == {"kept"}
    assert sockets["revoked"].closed
    assert not sockets["kept"].closed

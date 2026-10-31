"""Open websockets lose access with their session. No redis."""

import asyncio
from typing import Any

import pytest

from server import websocket
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


async def test_stuck_client_is_dropped(monkeypatch: pytest.MonkeyPatch) -> None:
    # A laptop gone from Wi-Fi: the send never completes
    class StuckSocket(FakeSocket):
        async def send_text(self, _data: str) -> None:
            await asyncio.Event().wait()

    monkeypatch.setattr(websocket, "SEND_TIMEOUT", 0.01)
    client = Client(StuckSocket())  # type: ignore[arg-type]
    client.authorized = True
    await client.send({"topic": "playout_status"})
    assert client.disconnected

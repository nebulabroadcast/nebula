import asyncio
import time
import uuid
from contextlib import suppress
from typing import Any

from fastapi.websockets import WebSocket, WebSocketDisconnect

import nebula
from nebula.common import json_dumps, json_loads
from server.background import BackgroundTask
from server.session import Session

ALWAYS_SUBSCRIBE = [
    "server.started",
]


class Client:
    def __init__(self, sock: WebSocket):
        self.id = str(uuid.uuid1())
        self.sock: WebSocket = sock
        self.topics: list[str] = []
        self.disconnected: bool = False
        self.authorized: bool = False
        self.created_at: float = time.time()
        self.user: nebula.User | None = None

    @property
    def user_name(self) -> str | None:
        if self.user is None:
            return None
        return self.user.name

    async def authorize(self, access_token: str, topics: list[str]) -> bool:
        session_data = await Session.check(access_token, None)
        if session_data:
            self.topics = [*topics, *ALWAYS_SUBSCRIBE] if "*" not in topics else ["*"]
            self.authorized = True
            self.user = nebula.User(meta=session_data.user)
            return True
        return False

    async def send(self, message: dict[str, Any], auth_only: bool = True) -> None:
        if (not self.authorized) and auth_only:
            return
        if not self.is_valid:
            return
        try:
            await self.sock.send_text(json_dumps(message))
        except WebSocketDisconnect:
            self.disconnected = True
        except Exception as e:
            nebula.log.trace("WS: Error sending message", e)

    async def receive(self) -> dict[str, Any] | None:
        data = await self.sock.receive_text()
        try:
            message = json_loads(data)
            assert isinstance(message, dict)
            assert "topic" in message
        except AssertionError:
            return None
        except Exception:
            nebula.log.traceback("WS: Invalid message received")
            return None
        return message

    @property
    def is_valid(self) -> bool:
        if self.disconnected:
            return False
        if not self.authorized and (time.time() - self.created_at > 3):
            return False
        return True


class Messaging(BackgroundTask):
    error_rate_data: list[float] = []

    def initialize(self) -> None:
        self.clients: dict[str, Client] = {}
        self.error_rate_data = []

    async def join(self, websocket: WebSocket) -> Client | None:
        if not self.is_running:
            await websocket.close()
            return None
        await websocket.accept()
        client = Client(websocket)
        self.clients[client.id] = client
        return client

    async def purge(self) -> None:
        to_rm = []
        for client_id, client in list(self.clients.items()):
            if not client.is_valid:
                if not client.disconnected:
                    with suppress(RuntimeError):
                        await client.sock.close(code=1000)
                to_rm.append(client_id)
        for client_id in to_rm:
            with suppress(KeyError):
                del self.clients[client_id]

    async def run(self) -> None:
        self.pubsub = await nebula.redis.pubsub()
        await self.pubsub.subscribe(nebula.redis.channel)
        last_msg = time.time()

        while not self.shutting_down:
            try:
                raw_message = await self.pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=2,
                )
                message: dict[str, Any]
                if raw_message is None:
                    await asyncio.sleep(0.01)
                    if time.time() - last_msg > 3:
                        message = {"topic": "heartbeat"}
                        last_msg = time.time()
                    else:
                        continue
                else:
                    data: tuple[float, str, str, str, Any]
                    data = json_loads(raw_message["data"])
                    message = {
                        "timestamp": data[0],
                        "site": data[1],
                        "host": data[2],
                        "topic": data[3],
                        "data": data[4],
                    }

                if message["topic"] == "log":
                    assert isinstance(message["data"], dict)
                    if message["data"].get("level", 0) > 3:
                        self.handle_error_log()

                clients = list(self.clients.values())
                for client in clients:
                    for topic in client.topics:
                        if topic == "*" or message["topic"].startswith(topic):
                            await client.send(message)
                            break
                await self.purge()

            except Exception:
                nebula.log.traceback()
                await asyncio.sleep(0.5)

        nebula.log.warn("Stopping redis2ws")

    def handle_error_log(self) -> None:
        """When an error log is received, we want to keep error rate"""
        now = time.time()
        # delete timestamps older than 5 minutes from the list
        if len(self.error_rate_data) > 100:
            self.error_rate_data = [t for t in self.error_rate_data if now - t < 300]
        self.error_rate_data.append(now)

    @property
    def error_rate(self) -> float:
        """Returns the error rate in the last 5 minutes"""
        now = time.time()
        self.error_rate_data = [t for t in self.error_rate_data if now - t < 300]
        return len(self.error_rate_data)


messaging = Messaging()

__all__ = ["Session"]

import time
import nebula

from typing import Any, AsyncGenerator
from pydantic import BaseModel
from fastapi import Request

from nebula.common import create_hash, json_dumps, json_loads
from server.clientinfo import ClientInfo, get_client_info, get_real_ip


def is_local_ip(ip: str) -> bool:
    return (
        ip.startswith("127.")
        or ip.startswith("10.")
        or ip.startswith("192.168.")
        or ip.startswith("172.")
    )


class SessionModel(BaseModel):
    user: dict[str, Any]
    token: str
    created: float
    accessed: float
    client_info: ClientInfo | None = None


class Session:
    ttl = 24 * 3600
    ns = "session"

    @classmethod
    def is_expired(cls, session: SessionModel) -> bool:
        return time.time() - session.accessed > cls.ttl

    @classmethod
    async def check(
        cls, token: str, request: Request | None = None
    ) -> SessionModel | None:
        """Return a session corresponding to a given access token.

        Return None if the token is invalid.
        If the session is expired, it will be removed from the database.
        If it's not expired, update the accessed field and extend
        its lifetime.
        """
        data = await nebula.redis.get(cls.ns, token)
        if not data:
            return None

        session = SessionModel(**json_loads(data))
        if time.time() - session.accessed > cls.ttl:
            # TODO: some logging here?
            await nebula.redis.delete(cls.ns, token)
            return None

        if request:
            if not session.client_info:
                session.client_info = get_client_info(request)
                session.accessed = time.time()
                await nebula.redis.set(cls.ns, token, session.json())
            else:
                real_ip = get_real_ip(request)
                if not is_local_ip(real_ip):
                    if session.client_info.ip != real_ip:
                        nebula.log.warning(
                            "Session IP mismatch. "
                            f"Stored: {session.client_info.ip}, current: {real_ip}"
                        )
                        await nebula.redis.delete(cls.ns, token)
                        return None

        # Extend the session lifetime only if it's in its second half
        # (save update requests).
        # So it doesn't make sense to call the parameter accessed is it?
        # Whatever. Fix later.

        if time.time() - session.created > cls.ttl / 2:
            session.accessed = time.time()
            await nebula.redis.set(cls.ns, token, json_dumps(session.dict()))

        return session

    @classmethod
    async def create(
        cls,
        user: nebula.User,
        request: Request | None = None,
    ) -> SessionModel:
        """Create a new session for a given user."""
        token = create_hash()
        session = SessionModel(
            user=user.meta,
            token=token,
            created=time.time(),
            accessed=time.time(),
            client_info=get_client_info(request) if request else None,
        )
        await nebula.redis.set(cls.ns, token, session.json())
        return session

    @classmethod
    async def update(
        cls,
        token: str,
        user: nebula.User,
        client_info: ClientInfo | None = None,
    ) -> None:
        """Update a session with new user data."""
        data = await nebula.redis.get(cls.ns, token)
        if not data:
            # TODO: shouldn't be silent!
            return None

        session = SessionModel(**json_loads(data))
        session.user = user.meta
        session.accessed = time.time()
        if client_info is not None:
            session.client_info = client_info
        await nebula.redis.set(cls.ns, token, session.json())

    @classmethod
    async def delete(cls, token: str) -> None:
        await nebula.redis.delete(cls.ns, token)

    @classmethod
    async def list(
        cls, user_name: str | None = None
    ) -> AsyncGenerator[SessionModel, None]:
        """List active sessions for all or given user

        Additionally, this function also removes expired sessions
        from the database.
        """

        async for session_id, data in nebula.redis.iterate(cls.ns):
            session = SessionModel(**json_loads(data))
            if cls.is_expired(session):
                # nebula.log.info(
                #     f"Removing expired session for user"
                #     f"{session.user.name} {session.token}"
                # )
                await nebula.redis.delete(cls.ns, session.token)
                continue

            if user_name is None or session.user.name == user_name:
                yield session

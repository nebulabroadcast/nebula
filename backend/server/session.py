__all__ = ["Session"]

import time
from typing import Any, AsyncGenerator

from fastapi import Request
from pydantic import BaseModel, Field

import nebula
from nebula.common import create_hash
from nebula.exceptions import LoginFailedException
from server.clientinfo import ClientInfo, get_client_info, get_real_ip
from server.utils import is_internal_ip


class SessionModel(BaseModel):
    user: dict[str, Any] = Field(..., description="User data")
    token: str = Field(..., description="Access token")
    created: float = Field(..., description="Creation timestamp")
    accessed: float = Field(..., description="Last access timestamp")
    client_info: ClientInfo | None = Field(None, description="Client info")


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

        try:
            data = await nebula.redis.get_json(cls.ns, token)
        except KeyError:
            return None

        session = SessionModel.model_validate(data)
        if time.time() - session.accessed > cls.ttl:
            # TODO: some logging here?
            await nebula.redis.delete(cls.ns, token)
            return None

        if request:
            if not session.client_info:
                session.client_info = get_client_info(request)
                session.accessed = time.time()
                await nebula.redis.set_json(cls.ns, token, session)
            else:
                real_ip = get_real_ip(request)
                if not is_internal_ip(real_ip) and session.client_info.ip != real_ip:
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
            await nebula.redis.set_json(cls.ns, token, session)

        return session

    @classmethod
    async def create(
        cls,
        user: nebula.User,
        request: Request | None = None,
    ) -> SessionModel:
        """Create a new session for a given user."""
        client_info = get_client_info(request) if request else None
        if (
            client_info
            and user["local_network_only"]
            and not is_internal_ip(client_info.ip)
        ):
            raise LoginFailedException("You can only log in from local network")

        token = create_hash()
        session = SessionModel(
            user=user.meta,
            token=token,
            created=time.time(),
            accessed=time.time(),
            client_info=client_info,
        )
        await nebula.redis.set_json(cls.ns, token, session)
        return session

    @classmethod
    async def update(
        cls,
        token: str,
        user: nebula.User,
        client_info: ClientInfo | None = None,
    ) -> None:
        """Update a session with new user data."""
        try:
            data = await nebula.redis.get(cls.ns, token)
        except KeyError:
            return None

        session = SessionModel.model_validate(data)
        session.user = user.meta
        session.accessed = time.time()
        if client_info is not None:
            session.client_info = client_info
        await nebula.redis.set_json(cls.ns, token, session)

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
        async for _, data in nebula.redis.iterate_json(cls.ns):
            session = SessionModel.model_validate(data)
            if cls.is_expired(session):
                nebula.log.info(
                    f"Removing expired session for user"
                    f" {session.user['login']} {session.token}"
                )
                await nebula.redis.delete(cls.ns, session.token)
                continue

            if user_name is None or session.user.get("login") == user_name:
                yield session

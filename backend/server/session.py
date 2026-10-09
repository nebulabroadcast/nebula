__all__ = ["Session"]

import secrets
import time
from collections.abc import AsyncGenerator
from typing import Any

from fastapi import Request
from pydantic import BaseModel, Field, ValidationError

import nebula
from nebula.common import json_loads
from nebula.exceptions import LoginFailedException
from server.clientinfo import ClientInfo, get_client_info, get_real_ip
from server.utils import is_internal_ip


class SessionModel(BaseModel):
    user: dict[str, Any] = Field(..., description="User data")
    token: str = Field(..., description="Access token")
    created: float = Field(..., description="Creation timestamp")
    accessed: float = Field(..., description="Last access timestamp")
    client_info: ClientInfo | None = Field(None, description="Client info")
    transient: bool = False


class Session:
    ttl = 24 * 3600
    ns = "session"

    @classmethod
    def is_expired(cls, session: SessionModel) -> bool:
        return time.time() - session.accessed > cls.ttl

    @classmethod
    def _parse(cls, data: Any) -> SessionModel | None:
        """Validate stored session data. Return None if it's unusable."""
        if data is None:
            return None
        try:
            return SessionModel.model_validate(data)
        except ValidationError:
            nebula.log.warning("Invalid session data in redis, ignoring it")
            return None

    @classmethod
    async def _load(cls, token: str) -> SessionModel | None:
        """Load a session from redis.

        Corrupted or incompatible sessions (e.g. stored by an older version)
        are treated as missing and removed, so the client can log in again.
        """
        try:
            data = await nebula.redis.get_json(cls.ns, token)
        except ValueError:
            data = {}  # invalid JSON
        session = cls._parse(data)
        if session is None and data is not None:
            await nebula.redis.delete(cls.ns, token)
        return session

    @classmethod
    async def check(
        cls,
        token: str,
        request: Request | None = None,
        transient: bool = False,
    ) -> SessionModel | None:
        """Return a session corresponding to a given access token.

        Return None if the token is invalid.
        If the session is expired, it will be removed from the database.
        If it's not expired, update the accessed field and extend
        its lifetime.
        """

        session = await cls._load(token)
        if session is None:
            return None

        if time.time() - session.accessed > cls.ttl:
            # TODO: some logging here?
            await nebula.redis.delete(cls.ns, token)
            return None

        if not transient and session.transient:
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

        remaining_ttl = cls.ttl - (time.time() - session.accessed)
        if remaining_ttl < cls.ttl - 120:
            session.accessed = time.time()
            await nebula.redis.set_json(cls.ns, token, session)

        return session

    @classmethod
    async def create(
        cls,
        user: nebula.User,
        request: Request | None = None,
        transient: bool = False,
    ) -> SessionModel:
        """Create a new session for a given user."""
        client_info = get_client_info(request) if request else None
        if (
            client_info
            and user["local_network_only"]
            and not is_internal_ip(client_info.ip)
        ):
            raise LoginFailedException("You can only log in from local network")

        token = secrets.token_hex(32)
        session = SessionModel(
            user=user.meta,
            token=token,
            created=time.time(),
            accessed=time.time(),
            client_info=client_info,
            transient=transient,
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
        session = await cls._load(token)
        if session is None:
            return

        session.user = user.meta
        session.accessed = time.time()
        if client_info is not None:
            session.client_info = client_info
        await nebula.redis.set_json(cls.ns, token, session)

    @classmethod
    async def delete(cls, token: str) -> None:
        await nebula.redis.delete(cls.ns, token)

    @classmethod
    async def list(cls, user_name: str | None = None) -> AsyncGenerator[SessionModel]:
        """List active sessions for all or given user

        Additionally, this function also removes expired sessions
        from the database.
        """
        # iterate_json would raise on the first invalid JSON payload
        async for key, payload in nebula.redis.iterate(cls.ns):
            try:
                data = json_loads(payload) if payload else None
            except ValueError:
                data = {}
            session = cls._parse(data)
            if session is None:
                await nebula.redis.delete(cls.ns, key)
                continue
            if cls.is_expired(session):
                nebula.log.info(
                    f"Removing expired session for user"
                    f" {session.user['login']} {session.token}"
                )
                await nebula.redis.delete(cls.ns, session.token)
                continue

            if user_name is None or session.user.get("login") == user_name:
                yield session

    @classmethod
    async def refresh_user(cls, user: nebula.User) -> None:
        """Update the user data in all sessions of the user.

        Sessions are matched by user id, so a renamed user is found too.
        """
        async for session in cls.list():
            if session.user.get("id") == user.id:
                await cls.update(session.token, user)

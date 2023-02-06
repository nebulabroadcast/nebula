__all__ = ["Session"]

import time
from typing import Any

from pydantic import BaseModel

import nebula
from nebula.common import create_hash, json_dumps, json_loads


class SessionModel(BaseModel):
    user: dict[str, Any]
    token: str
    created: float
    accessed: float
    ip: str | None = None


class Session:
    ttl = 24 * 3600
    ns = "session"

    @classmethod
    async def check(cls, token: str, ip: str | None) -> SessionModel | None:
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

        if ip and session.ip and session.ip != ip:
            # TODO: log this?
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
    async def create(cls, user: nebula.User, ip: str = None) -> SessionModel:
        """Create a new session for a given user."""
        token = create_hash()
        session = SessionModel(
            user=user.meta,
            token=token,
            created=time.time(),
            accessed=time.time(),
            ip=ip,
        )
        await nebula.redis.set(cls.ns, token, session.json())
        return session

    @classmethod
    async def update(cls, token: str, user: nebula.User) -> None:
        """Update a session with new user data."""
        data = await nebula.redis.get(cls.ns, token)
        if not data:
            # TODO: shouldn't be silent!
            return None

        session = SessionModel(**json_loads(data))
        session.user = user.meta
        session.accessed = time.time()
        await nebula.redis.set(cls.ns, token, session.json())

    @classmethod
    async def delete(cls, token: str) -> None:
        await nebula.redis.delete(cls.ns, token)

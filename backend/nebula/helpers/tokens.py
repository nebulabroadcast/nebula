import secrets
import time
from contextlib import suppress
from dataclasses import dataclass
from typing import Any, Literal

import nebula
from nx.utils.hashing import hash_data

ShortLivedTokenType = Literal["password-reset"]


@dataclass
class ShortLivedToken:
    token: str
    token_type: ShortLivedTokenType
    data: dict[str, Any]
    created_at: float
    expires_at: float


class TokenManager:
    @classmethod
    async def create(
        cls,
        token_type: ShortLivedTokenType,
        *,
        data: dict[str, Any] | None = None,
        ttl: int = 3600,
        blocking_id: str | None = None,
    ) -> ShortLivedToken:
        token = secrets.token_urlsafe(32)
        created_at = time.time()
        expires_at = created_at + ttl

        if data is None:
            data = {}

        blocking_hash = None
        if blocking_id is not None:
            blocking_hash = hash_data(blocking_id)
            block_expires_at = None
            with suppress(KeyError):
                block_expires_at = await nebula.redis.get_json(
                    "short-lived-token-lock",
                    blocking_hash,
                )
            if block_expires_at is not None and time.time() < block_expires_at:
                nebula.log.warning(
                    f"Unable to create {token_type} token. "
                    f"Blocking ID {blocking_id} already has a token, "
                    f"that expires in {int(block_expires_at - time.time())} seconds"
                )
                raise ValueError("A token with the same blocking ID already exists")

            await nebula.redis.set_json(
                "short-lived-token-lock",
                blocking_hash,
                expires_at,
                ttl=ttl,
            )

        payload = {
            "type": token_type,
            "created_at": created_at,
            "expires_at": expires_at,
            "lock_hash": blocking_hash if blocking_id is not None else None,
            "data": data,
        }

        await nebula.redis.set_json("short-lived-token", token, payload, ttl=ttl)

        return ShortLivedToken(
            token=token,
            token_type=token_type,
            data=data,
            created_at=created_at,
            expires_at=expires_at,
        )

    @classmethod
    async def verify(cls, token: str) -> ShortLivedToken:
        payload = await nebula.redis.get_json("short-lived-token", token)
        if payload is None:
            raise KeyError("Invalid or expired token")

        lock_hash = payload.get("lock_hash")

        try:
            created_at = payload["created_at"]
            expires_at = payload["expires_at"]
            lock_hash = payload.get("lock_hash")
            if time.time() > expires_at:
                await nebula.redis.delete("short-lived-token", token)
                raise KeyError("Token has expired")

            return ShortLivedToken(
                token=token,
                token_type=payload["type"],
                data=payload["data"],
                created_at=created_at,
                expires_at=expires_at,
            )

        finally:
            await nebula.redis.delete("short-lived-token", token)

            if lock_hash is not None:
                await nebula.redis.delete("short-lived-token-lock", lock_hash)

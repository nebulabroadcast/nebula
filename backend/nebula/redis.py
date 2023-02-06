from typing import Any

from redis import asyncio as aioredis
from redis.client import PubSub

from nebula.config import config
from nebula.log import log


class Redis:
    connected: bool = False
    unavailable: bool = False
    redis_pool: aioredis.Redis = aioredis.from_url(config.redis)
    channel: str = f"nebula-{config.site_name}"

    @classmethod
    async def connect(cls) -> None:
        """Create a Redis connection pool"""
        try:
            await cls.redis_pool.set("CONN", "alive")
        except ConnectionError:
            log.error(f"Redis {config.redis} connection failed", handlers=None)
        except OSError:
            log.error(
                f"Redis {config.redis} connection failed (OS error)", handlers=None
            )
        else:
            cls.connected = True
            return
            cls.connected = False
        raise ConnectionError("Redis is not connected")

    @classmethod
    async def get(cls, namespace: str, key: str) -> Any:
        """Get a value from Redis"""
        if not cls.connected:
            await cls.connect()
        value = await cls.redis_pool.get(f"{namespace}-{key}")
        return value

    @classmethod
    async def set(cls, namespace: str, key: str, value: str, ttl: int = 0) -> None:
        """Create/update a record in Redis

        Optional ttl argument may be provided to set expiration time.
        """
        if not cls.connected:
            await cls.connect()
        command = ["set", f"{namespace}-{key}", value]
        if ttl:
            command.extend(["ex", str(ttl)])
        await cls.redis_pool.execute_command(*command)

    @classmethod
    async def delete(cls, namespace: str, key: str) -> None:
        """Delete a record from Redis"""
        if not cls.connected:
            await cls.connect()
        await cls.redis_pool.delete(f"{namespace}-{key}")

    @classmethod
    async def incr(cls, namespace: str, key: str) -> None:
        """Increment a value in Redis"""
        if not cls.connected:
            await cls.connect()
        await cls.redis_pool.incr(f"{namespace}-{key}")

    @classmethod
    async def pubsub(cls) -> PubSub:
        """Create a Redis pubsub connection"""
        if not cls.connected:
            await cls.connect()
        return cls.redis_pool.pubsub()

    @classmethod
    async def publish(cls, message: str) -> None:
        """Publish a message to a Redis channel"""
        if not cls.connected:
            await cls.connect()
        await cls.redis_pool.publish(cls.channel, message)

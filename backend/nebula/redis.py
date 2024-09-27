import json
from typing import Any, AsyncGenerator

from pydantic import BaseModel
from redis import asyncio as aioredis
from redis.asyncio.client import PubSub

from nebula.common import json_dumps, json_loads
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
            log.error(f"Redis {config.redis} connection failed")
        except OSError:
            log.error(f"Redis {config.redis} connection failed (OS error)")
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
    async def get_json(cls, namespace: str, key: str) -> Any:
        """Get a JSON-serialized value from Redis"""
        if not cls.connected:
            await cls.connect()
        value = await cls.get(namespace, key)
        if not value:
            raise KeyError(f"Key {namespace}-{key} not found")
        try:
            return json_loads(value)
        except json.decoder.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in {namespace}-{key}") from e

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
    async def set_json(cls, namespace: str, key: str, value: Any, ttl: int = 0) -> None:
        """Create/update a record in Redis with JSON-serialized value"""
        if not cls.connected:
            await cls.connect()
        if isinstance(value, BaseModel):
            payload = value.model_dump_json(exclude_unset=True, exclude_defaults=True)
        else:
            payload = json_dumps(value)
        await cls.set(namespace, key, payload, ttl)

    @classmethod
    async def delete(cls, namespace: str, key: str) -> None:
        """Delete a record from Redis"""
        if not cls.connected:
            await cls.connect()
        await cls.redis_pool.delete(f"{namespace}-{key}")

    @classmethod
    async def incr(cls, namespace: str, key: str) -> int:
        """Increment a value in Redis"""
        if not cls.connected:
            await cls.connect()
        res = await cls.redis_pool.incr(f"{namespace}-{key}")
        return res

    @classmethod
    async def expire(cls, namespace: str, key: str, ttl: int) -> None:
        """Set a TTL for a key in Redis"""
        if not cls.connected:
            await cls.connect()
        await cls.redis_pool.expire(f"{namespace}-{key}", ttl)

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

    @classmethod
    async def iterate(cls, namespace: str) -> AsyncGenerator[tuple[str, str], None]:
        """Iterate over stored keys

        Yield (key, payload) tuples matching given namespace.
        Namespace prefix is stripped from keys.
        """
        if not cls.connected:
            await cls.connect()

        async for key in cls.redis_pool.scan_iter(match=f"{namespace}-*"):
            key_without_ns = key.decode("ascii").removeprefix(f"{namespace}-")
            payload = await cls.redis_pool.get(key)
            yield key_without_ns, payload

    @classmethod
    async def iterate_json(
        cls, namespace: str
    ) -> AsyncGenerator[tuple[str, Any], None]:
        """Iterate over stored keys

        Yield (key, payload) tuples matching given namespace.
        Namespace prefix is stripped from keys.

        This method is same as iterate() but deserializes
        JSON payloads in the process.
        """
        async for key, payload in cls.iterate(namespace):
            if payload is None:
                log.warning(f"Redis {namespace}-{key} has no value (JSON expected)")
                continue
            yield key, json_loads(payload)

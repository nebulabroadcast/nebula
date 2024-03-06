import asyncpg
import asyncpg.pool

from typing import AsyncGenerator

from nebula.common import json_dumps, json_loads
from nebula.config import config
from nebula.exceptions import NebulaException


class DB:
    _pool: asyncpg.pool.Pool | None = None

    async def init_connection(self, conn):
        await conn.set_type_codec(
            "jsonb",
            encoder=json_dumps,
            decoder=json_loads,
            schema="pg_catalog",
        )

    async def connect(self):
        """Create a Postgres connection pool."""
        self._pool = await asyncpg.create_pool(
            config.postgres,
            init=self.init_connection,
        )
        assert self._pool is not None

    async def pool(self) -> asyncpg.pool.Pool:
        """Return the Postgres connection pool. If it doesn't exist, create it."""
        if self._pool is None:
            await self.connect()
        if self._pool is None:
            raise NebulaException("Unable to connect to database")
        return self._pool

    async def execute(self, query: str, *args) -> str:
        """Execute a query and return the status."""
        pool = await self.pool()
        return await pool.execute(query, *args)

    async def executemany(self, query: str, *args) -> list[asyncpg.Record]:
        """Execute a query multiple times and return the result."""
        pool = await self.pool()
        return await pool.executemany(query, *args)

    async def fetch(self, query: str, *args) -> list[asyncpg.Record]:
        """Fetch a query and return the result."""
        pool = await self.pool()
        return await pool.fetch(query, *args)

    async def fetchrow(self, query: str, *args) -> asyncpg.Record:
        """Fetch a query and return the first result."""
        pool = await self.pool()
        return await pool.fetchrow(query, *args)

    async def iterate(self, query: str, *args) -> AsyncGenerator[asyncpg.Record, None]:
        """Iterate over a query and yield the result."""
        pool = await self.pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                statement = await conn.prepare(query)
                async for record in statement.cursor(*args):
                    yield record


db = DB()

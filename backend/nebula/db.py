import asyncpg
import asyncpg.pool

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
        if self._pool is None:
            await self.connect()
        if self._pool is None:
            raise NebulaException("Unable to connect to database")
        return self._pool

    async def execute(self, query: str, *args):
        pool = await self.pool()
        return await pool.execute(query, *args)

    async def executemany(self, query: str, *args):
        pool = await self.pool()
        return await pool.executemany(query, *args)

    async def fetch(self, query: str, *args):
        pool = await self.pool()
        return await pool.fetch(query, *args)

    async def iterate(self, query: str, *args):
        pool = await self.pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                statement = await conn.prepare(query)
                async for record in statement.cursor(*args):
                    yield record


db = DB()

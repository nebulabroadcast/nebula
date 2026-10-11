"""Integration tests: need a Nebula database (NEBULA_POSTGRES_URL).

Tests in this tier only read. They're skipped when the database can't be
reached (nx.db would otherwise exit the process).

Async tests must run on the session loop, since the nx.db pool is bound
to it: `pytestmark = pytest.mark.asyncio(loop_scope="session")`.
"""

from collections.abc import AsyncIterator

import asyncpg
import pytest
import pytest_asyncio

import nebula
from nebula.settings import load_settings


@pytest_asyncio.fixture(scope="session", loop_scope="session", autouse=True)
async def database() -> AsyncIterator[None]:
    try:
        connection = await asyncpg.connect(str(nebula.config.postgres_url), timeout=3)
    except (OSError, asyncpg.PostgresError) as e:
        pytest.skip(f"Database not available: {e}")
    await connection.close()

    await load_settings()
    yield

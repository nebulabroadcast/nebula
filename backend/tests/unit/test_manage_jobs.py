"""The jobs list query. No database."""

from collections.abc import AsyncGenerator
from typing import Any

import pytest

import nebula
from api.jobs._models import ManageJobsRequest
from api.jobs.manage_jobs import ManageJobs

pytestmark = pytest.mark.asyncio


@pytest.fixture
def queries(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, tuple[Any, ...]]]:
    sent: list[tuple[str, tuple[Any, ...]]] = []

    async def iterate(query: str, *args: Any) -> AsyncGenerator[Any]:
        sent.append((query, args))
        for _ in ():
            yield

    monkeypatch.setattr(nebula.db, "iterate", iterate)
    return sent


async def test_empty_id_lists(queries: list[tuple[str, tuple[Any, ...]]]) -> None:
    user = nebula.User(meta={"id": 2, "login": "alice"})
    request = ManageJobsRequest(view="all", asset_ids=[], ids=[])
    assert (await ManageJobs().handle(request, user)).jobs == []
    query, args = queries[0]
    # IN () is a syntax error; an empty array simply matches nothing
    assert "IN ()" not in query
    assert "j.id_asset = ANY($1::integer[])" in query
    assert args == ([], [])


async def test_active_limited_search(
    queries: list[tuple[str, tuple[Any, ...]]],
) -> None:
    user = nebula.User(meta={"id": 2, "login": "alice", "is_limited": True})
    request = ManageJobsRequest(view="active", search_query="Star Trek")
    await ManageJobs().handle(request, user)
    query, args = queries[0]
    assert "LIKE 'star%'" in query  # inlined, so the ft index can be used
    assert args[:2] == ("2", [2])
    # end_time is an INTEGER column: asyncpg rejects a float for it
    assert isinstance(args[2], int)

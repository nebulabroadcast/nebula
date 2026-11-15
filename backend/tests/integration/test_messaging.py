"""Messages wait for the transaction they are sent in."""

import json

import pytest

import nebula
from nebula import messaging

pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest.fixture
def published(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    topics: list[str] = []

    async def publish(payload: str) -> None:
        topics.append(json.loads(payload)[3])

    monkeypatch.setattr(messaging.redis, "publish", publish)
    return topics


async def test_message_outside_a_transaction_is_sent_at_once(
    published: list[str],
) -> None:
    await nebula.msg("first")
    assert published == ["first"]


async def test_message_waits_for_the_outermost_commit(published: list[str]) -> None:
    async with nebula.db.transaction():
        await nebula.msg("first")
        async with nebula.db.transaction():
            await nebula.msg("second")
        assert published == []
    assert published == ["first", "second"]


async def test_message_is_dropped_on_rollback(published: list[str]) -> None:
    async def failing() -> None:
        async with nebula.db.transaction():
            await nebula.msg("first")
            raise RuntimeError("rollback")

    with pytest.raises(RuntimeError, match="rollback"):
        await failing()
    assert published == []

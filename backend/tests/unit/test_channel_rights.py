"""Rights limited to some channels hold for where an object ends up too,
not only where it was. No database."""

import contextlib
from collections.abc import AsyncGenerator
from types import SimpleNamespace
from typing import Any

import pytest

import nebula
from api.items._models import OrderItem, OrderRequest
from api.items._set_items_order import set_items_order
from api.objects.delete_objects import DeleteObjects, DeleteObjectsRequest
from api.objects.operations import Operation, Operations, OperationsRequest
from nebula.enum import ObjectType
from nebula.helpers.validators import Validator

pytestmark = pytest.mark.asyncio

# Bin 10 is the rundown of an event on channel 1, bin 20 on channel 2
BIN_CHANNELS = {10: 1, 20: 2}
ITEMS = {5: 20}  # item id -> bin

EDITOR = nebula.User(
    meta={
        "id": 2,
        "login": "editor",
        "can/rundown_edit": [1],
        "can/scheduler_edit": [1],
    }
)


@pytest.fixture
def saved(monkeypatch: pytest.MonkeyPatch) -> list[Any]:
    saves: list[Any] = []

    async def fetch(query: str, ids: list[int]) -> list[dict[str, Any]]:
        if "FROM events" in query:
            return [
                {"id_magic": i, "id_channel": BIN_CHANNELS[i]}
                for i in ids
                if i in BIN_CHANNELS
            ]
        if "FROM items" in query:
            return [{"id_bin": ITEMS[i]} for i in ids if i in ITEMS]
        raise AssertionError(query)

    async def load_item(_cls: Any, object_id: int, **_: Any) -> nebula.Item:
        return nebula.Item(meta={"id": object_id, "id_bin": ITEMS[object_id]})

    async def load_event(_cls: Any, object_id: int, **_: Any) -> nebula.Event:
        return nebula.Event(meta={"id": object_id, "id_channel": 1})

    async def save(self: Any, **_: Any) -> None:
        saves.append(self)

    @contextlib.asynccontextmanager
    async def transaction() -> AsyncGenerator[None]:
        yield

    monkeypatch.setattr(nebula.db, "fetch", fetch)
    monkeypatch.setattr(nebula.db, "transaction", transaction)
    monkeypatch.setattr(nebula.Item, "load", classmethod(load_item))
    monkeypatch.setattr(nebula.Event, "load", classmethod(load_event))
    monkeypatch.setattr(nebula.Item, "save", save)
    monkeypatch.setattr(nebula.Event, "save", save)
    monkeypatch.setattr(Validator, "validators", {})
    monkeypatch.setattr(
        type(nebula.settings),
        "get_playout_channel",
        lambda _self, id_channel: SimpleNamespace(id=id_channel),
    )
    return saves


async def ops(object_type: ObjectType, object_id: int, data: dict[str, Any]) -> None:
    operation = Operation(object_type=object_type, id=object_id, data=data)
    request = OperationsRequest(operations=[operation])
    await Operations().run(request, EDITOR, raise_errors=True)


async def test_move_event_to_other_channel(saved: list[Any]) -> None:
    await ops(ObjectType.EVENT, 1, {"title": "News"})
    assert len(saved) == 1
    with pytest.raises(nebula.ForbiddenException):
        await ops(ObjectType.EVENT, 1, {"id_channel": 2})
    assert len(saved) == 1


async def test_move_item_to_own_channel(saved: list[Any]) -> None:
    # Item 5 is in channel 2's rundown: it can't be taken from there
    with pytest.raises(nebula.ForbiddenException):
        await ops(ObjectType.ITEM, 5, {"id_bin": 10})
    assert saved == []
    # Reordering saves items before the check: the transaction rolls back
    request = OrderRequest(
        id_channel=1, id_bin=10, order=[OrderItem(type="item", id=5)]
    )
    with pytest.raises(nebula.ForbiddenException):
        await set_items_order(request, EDITOR)


@pytest.mark.usefixtures("saved")
async def test_order_into_other_channel() -> None:
    # The request names channel 1, the bin belongs to channel 2
    request = OrderRequest(
        id_channel=1,
        id_bin=20,
        order=[OrderItem(type="item", meta={"title": "Placeholder"})],
    )
    with pytest.raises(nebula.ForbiddenException):
        await set_items_order(request, EDITOR)


async def test_new_item_cannot_take_existing_id(saved: list[Any]) -> None:
    # Item 5 is in channel 2: a "new" item carrying its id must not update it
    request = OrderRequest(
        id_channel=1,
        id_bin=10,
        order=[OrderItem(type="item", meta={"id": 5, "title": "Placeholder"})],
    )
    await set_items_order(request, EDITOR)
    assert [item.id for item in saved] == [None]


@pytest.mark.usefixtures("saved")
async def test_delete_item_in_other_channel() -> None:
    request = DeleteObjectsRequest(object_type=ObjectType.ITEM, ids=[5])
    with pytest.raises(nebula.ForbiddenException):
        await DeleteObjects().handle(request, EDITOR)

"""Editing users through /api/ops: admins only, with REST's checks. No database."""

import contextlib
from collections.abc import AsyncGenerator
from types import SimpleNamespace
from typing import Any

import pytest

import nebula
from api.objects.operations import Operation, Operations, OperationsRequest
from nebula.enum import MetaClass, ObjectType
from nebula.helpers.validators import Validator
from nebula.objects.user import hash_password
from nebula.settings.metatypes import MetaType
from server.session import Session

pytestmark = pytest.mark.asyncio

ADMIN = nebula.User(meta={"id": 1, "login": "admin", "is_admin": True})
ALICE = nebula.User(meta={"id": 2, "login": "alice"})


@pytest.fixture
def saved(monkeypatch: pytest.MonkeyPatch) -> list[dict[str, Any]]:
    """Meta of every saved user, and logged out sessions.

    Alice is restricted to the local network.
    """
    saves: list[dict[str, Any]] = []

    async def load(_cls: Any, object_id: int, **_: Any) -> nebula.User:
        return nebula.User(
            meta={"id": object_id, "login": "alice", "local_network_only": True}
        )

    async def save(self: nebula.User, **_: Any) -> None:
        saves.append(dict(self.meta))

    @contextlib.asynccontextmanager
    async def transaction() -> AsyncGenerator[None]:
        yield

    async def list_sessions() -> AsyncGenerator[Any]:
        yield SimpleNamespace(token="alice", user={"id": 2})  # noqa: S106

    async def delete(token: str) -> None:
        saves.append({"logged_out": token})

    monkeypatch.setattr(Session, "list", list_sessions)
    monkeypatch.setattr(Session, "delete", delete)
    monkeypatch.setattr(nebula.User, "load", classmethod(load))
    monkeypatch.setattr(nebula.User, "save", save)
    monkeypatch.setattr(nebula.db, "transaction", transaction)
    monkeypatch.setattr(Validator, "validators", {})
    monkeypatch.setattr(
        nebula.settings,
        "metatypes",
        {
            "full_name": MetaType(ns="u", metaclass=MetaClass.STRING, editable=True),
            "local_network_only": MetaType(
                ns="u", metaclass=MetaClass.BOOLEAN, editable=True
            ),
        },
    )
    return saves


async def ops(user: nebula.User, user_id: int, data: dict[str, Any]) -> None:
    operation = Operation(object_type=ObjectType.USER, id=user_id, data=data)
    request = OperationsRequest(operations=[operation])
    await Operations().run(request, user, raise_errors=True)


async def test_admin_edits_user(saved: list[dict[str, Any]]) -> None:
    data = {"local_network_only": False, "password": "long enough"}
    await ops(ADMIN, 2, data)
    assert saved[0]["local_network_only"] is not True
    assert saved[0]["password"] == hash_password("long enough")
    # A new password logs the user out everywhere
    assert saved[1] == {"logged_out": "alice"}


@pytest.mark.parametrize(
    "data",
    [{"api_key": hash_password("mine")}, {"id": 5}, {"password": "short"}],
)
async def test_admin_goes_through_checks(
    saved: list[dict[str, Any]], data: dict[str, Any]
) -> None:
    with pytest.raises(nebula.ValidationException):
        await ops(ADMIN, 2, data)
    assert saved == []


@pytest.mark.parametrize(
    "data",
    [
        {"full_name": "Alice"},
        {"password": "long enough"},
        {"local_network_only": False},
    ],
)
async def test_users_cannot_edit_users(
    saved: list[dict[str, Any]], data: dict[str, Any]
) -> None:
    # Not even themselves: that's what REST is for
    with pytest.raises(nebula.ForbiddenException):
        await ops(ALICE, 2, data)
    assert saved == []

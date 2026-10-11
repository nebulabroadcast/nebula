"""Access-controlled operations of nebula.User. No database needed."""

import re
from collections.abc import Iterator
from contextlib import AbstractContextManager
from typing import Any

import pytest

import nebula
from nebula.context import (
    RequestContext,
    is_system,
    request_context,
    set_default_system,
    system_context,
)
from nebula.enum import MetaClass
from nebula.objects.user import generate_api_key, hash_password
from nebula.settings.metatypes import MetaType

ADMIN = nebula.User(meta={"id": 1, "login": "admin", "is_admin": True})
ALICE = nebula.User(meta={"id": 2, "login": "alice"})
BOB = nebula.User(meta={"id": 3, "login": "bob"})


@pytest.fixture(autouse=True)
def server_process(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    default = is_system()
    set_default_system(False)
    monkeypatch.setattr(
        nebula.settings,
        "metatypes",
        {
            "phone": MetaType(ns="u", metaclass=MetaClass.STRING, editable=True),
            "badge": MetaType(ns="u", metaclass=MetaClass.STRING, editable=False),
            # As in setup/defaults/meta_types.py
            "is_admin": MetaType(ns="u", metaclass=MetaClass.BOOLEAN, editable=True),
            "title": MetaType(ns="m", metaclass=MetaClass.STRING),
        },
    )
    yield
    set_default_system(default)


def acting(user: nebula.User | None) -> AbstractContextManager[None]:
    return request_context(RequestContext(user=user))


def alice() -> nebula.User:
    return nebula.User(meta={"id": 2, "login": "alice", "can/asset_view": True})


@pytest.mark.parametrize(
    ("actor", "changes"),
    [
        (ADMIN, {"full_name": "Alice", "is_admin": True, "can/mcr": [1]}),
        (ALICE, {"full_name": "Alice", "email": "a@example.com", "phone": "123"}),
        (None, {"is_admin": True}),  # system context
    ],
)
def test_allowed_changes(actor: nebula.User | None, changes: dict[str, Any]) -> None:
    user = alice()
    if actor is None:
        with system_context():
            user.apply_changes(changes)
    else:
        with acting(actor):
            user.apply_changes(changes)
    for key, value in changes.items():
        assert user[key] == value


@pytest.mark.parametrize(
    ("actor", "changes", "status", "message"),
    [
        (ALICE, {"is_admin": True}, 403, "Only admins can change is_admin"),
        (ALICE, {"login": "x", "full_name": "x"}, 403, "Only admins can change login"),
        (ALICE, {"can/mcr": True}, 403, "Only admins"),
        (ALICE, {"badge": "x"}, 403, "Only admins can change badge"),
        (BOB, {"full_name": "x"}, 403, "not allowed to edit this user"),
        (None, {"full_name": "x"}, 401, "Authentication required"),
        (ADMIN, {"id": 5}, 422, "'id' is read-only"),
        (ADMIN, {"ctime": 5}, 422, "'ctime' is read-only"),
        (ADMIN, {"password": "x"}, 422, "can't be set directly"),
        (ADMIN, {"api_key_preview": "x"}, 422, "can't be set directly"),
    ],
)
def test_denied_changes(
    actor: nebula.User | None, changes: dict[str, Any], status: int, message: str
) -> None:
    user = alice()
    before = dict(user.meta)
    with acting(actor), pytest.raises(nebula.NebulaException) as exc_info:
        user.apply_changes(changes)
    assert exc_info.value.status == status
    assert message in exc_info.value.detail
    assert user.meta == before


def test_none_removes_key() -> None:
    user = alice()
    user["phone"] = "123"
    with acting(ALICE):
        user.apply_changes({"phone": None})
    assert "phone" not in user.meta


def test_new_user_needs_admin() -> None:
    new_user = nebula.User()
    with acting(ALICE), pytest.raises(nebula.ForbiddenException):
        new_user.apply_changes({"full_name": "x"})  # not "self": it has no id
    with acting(ALICE), pytest.raises(nebula.ForbiddenException):
        nebula.User.ensure_can_create()
    with acting(ADMIN):
        nebula.User.ensure_can_create()


def test_view_and_list() -> None:
    with acting(ALICE):
        alice().ensure_can_view()
        with pytest.raises(nebula.ForbiddenException):
            BOB.ensure_can_view()
        with pytest.raises(nebula.ForbiddenException):
            nebula.User.ensure_can_list()
    with acting(ADMIN):
        BOB.ensure_can_view()
        nebula.User.ensure_can_list()
    with acting(None), pytest.raises(nebula.UnauthorizedException):
        nebula.User.ensure_can_list()


def test_change_password() -> None:
    user = alice()
    with acting(ALICE):
        user.change_password("long enough")
        assert user["password"] == hash_password("long enough")
        assert user.has_password
        with pytest.raises(nebula.ValidationException, match="at least 8"):
            user.change_password("short")
    with acting(BOB), pytest.raises(nebula.ForbiddenException):
        user.change_password("long enough")


def test_regenerate_api_key() -> None:
    user = alice()
    with acting(ALICE):
        api_key = user.regenerate_api_key()
    assert re.fullmatch(r"nb(\.[A-Za-z0-9_]{12}){4}", api_key)
    assert user["api_key"] == hash_password(api_key)
    assert user["api_key_preview"] == f"{api_key[:4]}*******{api_key[-4:]}"
    with acting(BOB), pytest.raises(nebula.ForbiddenException):
        user.regenerate_api_key()


def test_api_keys_are_unique() -> None:
    assert len({generate_api_key() for _ in range(100)}) == 100


def test_permissions() -> None:
    user = alice()
    assert user.permissions == {"asset_view": True}
    user.set_permissions({"asset_view": None, "mcr": [1, 2]})
    assert user.permissions == {"mcr": [1, 2]}
    assert "can/asset_view" not in user.meta

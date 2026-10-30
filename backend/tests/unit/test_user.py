"""Access-controlled operations of nebula.User. No database needed."""

import re
from collections.abc import Iterator
from contextlib import AbstractContextManager
from typing import Any

import pytest

import nebula
import nebula.objects.user as user_module
from nebula.context import (
    RequestContext,
    is_system,
    request_context,
    set_default_system,
    system_context,
)
from nebula.enum import MetaClass
from nebula.objects.user import (
    generate_api_key,
    hash_api_key,
    hash_password,
    verify_password,
)
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


@pytest.mark.asyncio
async def test_change_password() -> None:
    user = alice()
    with acting(ALICE):
        await user.change_password("long enough")
        assert verify_password("long enough", user["password"])
        assert user.has_password
        with pytest.raises(nebula.ValidationException, match="at least 8"):
            await user.change_password("short")
    with acting(BOB), pytest.raises(nebula.ForbiddenException):
        await user.change_password("long enough")


def test_hash_password() -> None:
    stored = hash_password("heslo-řčž")  # non-ASCII used to crash
    assert stored.startswith("scrypt$")
    assert verify_password("heslo-řčž", stored)
    assert not verify_password("heslo-rcz", stored)
    # Salted: the same password never gives the same hash
    assert hash_password("heslo-řčž") != stored
    assert not verify_password("", "")


def test_verify_legacy_hash() -> None:
    # Unsalted SHA-256 of "password", as stored before scrypt
    legacy = "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"
    assert verify_password("password", legacy)
    assert not verify_password("Password", legacy)


def test_regenerate_api_key() -> None:
    user = alice()
    with acting(ALICE):
        api_key = user.regenerate_api_key()
    assert re.fullmatch(r"nb(\.[A-Za-z0-9_]{12}){4}", api_key)
    assert user["api_key"] == hash_api_key(api_key)
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


LEGACY = "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"


@pytest.fixture
def users_db(monkeypatch: pytest.MonkeyPatch) -> list[dict[str, Any]]:
    """Users as the login query sees them; UPDATEs are applied to them."""
    rows: list[dict[str, Any]] = [
        {"id": 1, "login": "old", "password": LEGACY},
        {"id": 2, "login": "new", "password": hash_password("password")},
        # Alice's login is Bob's email: both match "alice"
        {"id": 3, "login": "alice", "password": hash_password("alice's")},
        {"id": 4, "login": "bob", "email": "alice", "password": hash_password("bob's")},
    ]

    async def fetch(_query: str, username: str) -> list[dict[str, Any]]:
        name = username.lower()
        return [
            {"meta": row} for row in rows if name in (row["login"], row.get("email"))
        ]

    async def execute(
        query: str, password: str, meta_password: str, user_id: int
    ) -> None:
        assert query.strip().startswith("UPDATE users")
        assert password == meta_password
        next(row for row in rows if row["id"] == user_id)["password"] = password

    monkeypatch.setattr(user_module.db, "fetch", fetch)
    monkeypatch.setattr(user_module.db, "execute", execute)
    return rows


@pytest.mark.asyncio
async def test_login_upgrades_legacy_hash(users_db: list[dict[str, Any]]) -> None:
    user = await nebula.User.login("OLD", "password")
    assert user.id == 1
    stored = users_db[0]["password"]
    assert stored.startswith("scrypt$")
    assert verify_password("password", stored)
    # The next login uses the new hash
    assert (await nebula.User.login("old", "password")).id == 1


@pytest.mark.asyncio
async def test_login(users_db: list[dict[str, Any]]) -> None:
    assert (await nebula.User.login("new", "password")).id == 2
    assert (await nebula.User.login("alice", "alice's")).id == 3
    assert (await nebula.User.login("alice", "bob's")).id == 4
    for username, password in [("new", "wrong"), ("nobody", "password"), ("new", "")]:
        with pytest.raises(nebula.LoginFailedException):
            await nebula.User.login(username, password)
    assert users_db[1]["password"].startswith("scrypt$")

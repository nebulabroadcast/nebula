"""The /api/v2/users resource with users kept in memory instead of the DB."""

import copy
import shutil
import struct
import zlib
from collections.abc import Iterator
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import nebula
import nebula.helpers.avatars
import rest.users.avatar
from nebula.context import is_system, set_default_system
from nebula.enum import MetaClass
from nebula.objects.user import hash_password
from nebula.settings.metatypes import MetaType
from server.errors import REST_PREFIX, install_error_handlers
from server.middleware.context import RequestContextMiddleware
from server.rest import install_rest_routers
from server.session import Session

USERS = f"{REST_PREFIX}/users"


def token_for(user_id: int) -> str:
    return f"{user_id:064d}"


def auth(user_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {token_for(user_id)}"}


ADMIN = auth(1)
ALICE = auth(2)


class FakeUsers:
    def __init__(self) -> None:
        self.rows: dict[int, dict[str, Any]] = {
            1: {"id": 1, "login": "admin", "is_admin": True, "password": "hash"},
            2: {
                "id": 2,
                "login": "alice",
                "email": "alice@example.com",
                "phone": "123",
                "legacy": "hidden",
                "can/asset_view": True,
                "can/mcr": [1],
            },
        }
        self.refreshed: list[int] = []

    def session_user(self, token: str) -> dict[str, Any] | None:
        for user_id, meta in self.rows.items():
            if token == token_for(user_id):
                return copy.deepcopy(meta)
        return None


@pytest.fixture
def users(monkeypatch: pytest.MonkeyPatch) -> Iterator[FakeUsers]:
    fake = FakeUsers()

    async def check(token: str, _request: Any, _transient: bool = False) -> Any:
        if (meta := fake.session_user(token)) is None:
            return None
        return SimpleNamespace(user=meta)

    async def load(cls: type[nebula.User], user_id: int, **_: Any) -> nebula.User:
        if user_id not in fake.rows:
            raise nebula.NotFoundException(f"User ID {user_id} not found")
        return cls(meta=copy.deepcopy(fake.rows[user_id]))

    async def save(self: nebula.User, **_: Any) -> None:
        for user_id, meta in fake.rows.items():
            if meta["login"] == self.meta["login"] and user_id != self.id:
                raise nebula.ConflictException(f"Login '{self.meta['login']}' is taken")
        if not self.id:
            self.meta["id"] = max(fake.rows) + 1
        fake.rows[self.meta["id"]] = copy.deepcopy(self.meta)

    async def refresh_user(user: nebula.User) -> None:
        assert user.id is not None
        fake.refreshed.append(user.id)

    monkeypatch.setattr(Session, "check", check)
    monkeypatch.setattr(Session, "refresh_user", refresh_user)
    monkeypatch.setattr(nebula.User, "load", classmethod(load))
    monkeypatch.setattr(nebula.User, "save", save)
    monkeypatch.setattr(
        nebula.settings,
        "metatypes",
        {
            "phone": MetaType(ns="u", metaclass=MetaClass.STRING, editable=True),
            "is_admin": MetaType(ns="u", metaclass=MetaClass.BOOLEAN, editable=True),
            "title": MetaType(ns="m", metaclass=MetaClass.STRING, editable=True),
        },
    )

    default = is_system()
    set_default_system(False)
    yield fake
    set_default_system(default)


@pytest.fixture
def client(users: FakeUsers) -> TestClient:
    _ = users
    app = FastAPI()
    app.add_middleware(RequestContextMiddleware)
    install_error_handlers(app)
    install_rest_routers(app)
    return TestClient(app)


def test_discovery_mounts_users(client: TestClient) -> None:
    paths = client.app.openapi()["paths"]  # type: ignore[attr-defined]
    assert {
        "/api/v2/users",
        "/api/v2/users/query",
        "/api/v2/users/{user_id}",
        "/api/v2/users/{user_id}/password",
        "/api/v2/users/{user_id}/api-key",
        "/api/v2/users/{user_id}/avatar",
    } <= set(paths)
    assert set(paths["/api/v2/users"]) == {"get", "post", "query"}


#
# Reading
#


def test_get_user(client: TestClient, users: FakeUsers) -> None:
    users.rows[2]["api_key"] = hash_password("nb.key")
    users.rows[2]["api_key_preview"] = "nb.k*******.key"

    response = client.get(f"{USERS}/2", headers=ADMIN)
    assert response.status_code == 200
    assert response.json() == {
        "id": 2,
        "login": "alice",
        "ctime": None,
        "mtime": None,
        "email": "alice@example.com",
        "full_name": None,
        "language": None,
        "is_admin": False,
        "is_limited": False,
        "local_network_only": False,
        "permissions": {
            "asset_view": True,
            "asset_edit": False,
            "rundown_view": False,
            "rundown_edit": False,
            "scheduler_view": False,
            "scheduler_edit": False,
            "service_control": False,
            "mcr": [1],
            "job_control": False,
        },
        "api_key_preview": "nb.k*******.key",
        "has_password": False,
        "phone": "123",  # user metatype; "legacy" isn't one, so it's hidden
    }


def test_secrets_never_returned(client: TestClient) -> None:
    body = client.get(f"{USERS}/1", headers=ADMIN).json()
    assert "password" not in body
    assert body["has_password"] is True
    assert body["api_key_preview"] is None


def test_fields(client: TestClient) -> None:
    response = client.get(f"{USERS}/2?fields=login,phone", headers=ADMIN)
    assert response.json() == {"id": 2, "login": "alice", "phone": "123"}

    response = client.get(f"{USERS}/2?fields=login,password", headers=ADMIN)
    assert response.status_code == 422
    assert response.json()["detail"] == "Unknown field 'password'"


def test_read_access(client: TestClient) -> None:
    assert client.get(f"{USERS}/2", headers=ALICE).status_code == 200

    response = client.get(f"{USERS}/1", headers=ALICE)
    assert response.status_code == 403
    assert response.headers["content-type"] == "application/problem+json"

    assert client.get(f"{USERS}/2").status_code == 401
    assert client.get(f"{USERS}/99", headers=ADMIN).status_code == 404
    assert client.get(f"{USERS}/0", headers=ADMIN).status_code == 422


def test_list_needs_admin(client: TestClient) -> None:
    assert client.get(USERS, headers=ALICE).status_code == 403
    assert client.request("QUERY", USERS, headers=ALICE, json={}).status_code == 403
    assert client.post(f"{USERS}/query", headers=ALICE, json={}).status_code == 403


#
# Writing
#


def test_create_user(client: TestClient, users: FakeUsers) -> None:
    payload = {
        "login": "bob",
        "full_name": "Bob",
        "phone": "456",
        "permissions": {"rundown_view": [1, 2]},
    }
    response = client.post(USERS, headers=ADMIN, json=payload)
    assert response.status_code == 201
    assert response.headers["location"] == f"{USERS}/3"
    body = response.json()
    assert body["id"] == 3
    assert body["phone"] == "456"
    assert body["permissions"]["rundown_view"] == [1, 2]
    assert users.rows[3]["can/rundown_view"] == [1, 2]
    assert users.rows[3]["full_name"] == "Bob"


@pytest.mark.parametrize(
    "case",
    [
        (ALICE, {"login": "bob"}, 403, "not allowed to create users"),
        (ADMIN, {"login": "alice"}, 409, "Login 'alice' is taken"),
        (ADMIN, {"login": ""}, 422, "at least 1 character"),
        (ADMIN, {"full_name": "x"}, 422, "Field required"),
        (ADMIN, {"login": "x", "title": "x"}, 422, "Unknown user field 'title'"),
        (ADMIN, {"login": "x", "id": 5}, 422, "Unknown user field 'id'"),
        (ADMIN, {"login": "x", "password": "x" * 9}, 422, "Unknown user field"),
        (ADMIN, {"login": "x", "permissions": {"fly": True}}, 422, "Extra inputs"),
    ],
)
def test_create_user_rejected(
    client: TestClient, users: FakeUsers, case: tuple[Any, ...]
) -> None:
    headers, payload, status, detail = case
    response = client.post(USERS, headers=headers, json=payload)
    assert response.status_code == status
    assert detail in response.json()["detail"]
    assert set(users.rows) == {1, 2}


def test_patch_own_profile(client: TestClient, users: FakeUsers) -> None:
    response = client.patch(
        f"{USERS}/2",
        headers=ALICE,
        json={"full_name": "Alice", "phone": None},
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "Alice"
    assert "phone" not in response.json()
    assert users.rows[2]["full_name"] == "Alice"
    assert "phone" not in users.rows[2]
    assert users.refreshed == [2]


def test_patch_permissions_merge(client: TestClient, users: FakeUsers) -> None:
    response = client.patch(
        f"{USERS}/2",
        headers=ADMIN,
        json={"permissions": {"asset_view": None, "asset_edit": [3]}},
    )
    assert response.status_code == 200
    assert "can/asset_view" not in users.rows[2]
    assert users.rows[2]["can/asset_edit"] == [3]
    assert users.rows[2]["can/mcr"] == [1]  # untouched


@pytest.mark.parametrize(
    "case",
    [
        (ALICE, {"is_admin": True}, 403, "Only admins can change is_admin"),
        (ALICE, {"permissions": {"mcr": True}}, 403, "Only admins can change can/mcr"),
        (ADMIN, {"login": None}, 422, "'login' can't be removed"),
        (ADMIN, {"permissions": None}, 422, "'permissions' can't be null"),
        (ADMIN, {"api_key": "x"}, 422, "Unknown user field 'api_key'"),
        (ADMIN, {"login": "admin"}, 409, "is taken"),
    ],
)
def test_patch_rejected(
    client: TestClient, users: FakeUsers, case: tuple[Any, ...]
) -> None:
    headers, payload, status, detail = case
    before = copy.deepcopy(users.rows)
    response = client.patch(f"{USERS}/2", headers=headers, json=payload)
    assert response.status_code == status
    assert detail in response.json()["detail"]
    assert users.rows == before


def test_alice_cant_patch_admin(client: TestClient) -> None:
    response = client.patch(f"{USERS}/1", headers=ALICE, json={"full_name": "x"})
    assert response.status_code == 403


#
# Actions
#


def test_set_password(client: TestClient, users: FakeUsers) -> None:
    url = f"{USERS}/2/password"
    response = client.post(url, headers=ALICE, json={"password": "new password"})
    assert response.status_code == 204
    assert users.rows[2]["password"] == hash_password("new password")

    response = client.post(url, headers=ALICE, json={"password": "short"})
    assert response.status_code == 422

    response = client.post(
        f"{USERS}/1/password", headers=ALICE, json={"password": "long enough"}
    )
    assert response.status_code == 403


def test_regenerate_api_key(client: TestClient, users: FakeUsers) -> None:
    response = client.post(f"{USERS}/2/api-key", headers=ALICE)
    assert response.status_code == 200
    api_key = response.json()["api_key"]
    assert users.rows[2]["api_key"] == hash_password(api_key)

    body = client.get(f"{USERS}/2", headers=ALICE).json()
    assert body["api_key_preview"] == f"{api_key[:4]}*******{api_key[-4:]}"
    assert response.json()["api_key_preview"] == body["api_key_preview"]

    assert client.post(f"{USERS}/1/api-key", headers=ALICE).status_code == 403


#
# Avatar
#


def png(width: int, height: int) -> bytes:
    """A valid, solid-colour PNG."""

    def chunk(kind: bytes, data: bytes) -> bytes:
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    pixels = b"".join(b"\x00" + b"\x10\x80\xf0" * width for _ in range(height))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(pixels))
        + chunk(b"IEND", b"")
    )


def webp_size(data: bytes) -> tuple[int, int]:
    assert data[:4] == b"RIFF"
    assert data[8:16] == b"WEBPVP8 "
    width, height = struct.unpack("<HH", data[26:30])
    return width & 0x3FFF, height & 0x3FFF


@pytest.fixture
def avatar_dir(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    if shutil.which("ffmpeg") is None:
        pytest.skip("ffmpeg not available")

    def avatar_path(user: nebula.User, **_: Any) -> str:
        return str(tmp_path / f"{user.id}.webp")

    monkeypatch.setattr(nebula.helpers.avatars, "avatar_path", avatar_path)
    monkeypatch.setattr(rest.users.avatar, "avatar_path", avatar_path)
    return tmp_path


def test_avatar_lifecycle(client: TestClient, avatar_dir: Path) -> None:
    url = f"{USERS}/2/avatar"
    assert client.get(url, headers=ALICE).status_code == 404

    headers = {**ALICE, "Content-Type": "image/png"}
    response = client.post(url, headers=headers, content=png(640, 360))
    assert response.status_code == 204

    # Normalized to a 256x256 (lossy) WebP
    stored = avatar_dir / "2.webp"
    assert webp_size(stored.read_bytes()) == (256, 256)

    # Any logged-in user can see it; it's cached with an ETag
    response = client.get(url, headers=ADMIN)
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/webp"
    assert response.headers["cache-control"] == "private, no-cache"
    assert response.content == stored.read_bytes()
    etag = response.headers["etag"]

    response = client.get(url, headers={**ADMIN, "If-None-Match": etag})
    assert response.status_code == 304
    assert response.content == b""

    assert client.delete(url, headers=ALICE).status_code == 204
    assert not stored.exists()
    assert client.get(url, headers=ALICE).status_code == 404
    assert client.delete(url, headers=ALICE).status_code == 404


@pytest.mark.parametrize(
    "case",
    [
        (ADMIN | {"Content-Type": "image/png"}, b"not an image", 422, "not a valid"),
        (ADMIN | {"Content-Type": "image/gif"}, png(8, 8), 422, "must be one of"),
        (ALICE | {"Content-Type": "image/png"}, png(8, 8), 403, "not allowed"),
    ],
)
def test_avatar_rejected(
    client: TestClient, avatar_dir: Path, case: tuple[Any, ...]
) -> None:
    headers, content, status, detail = case
    response = client.post(f"{USERS}/1/avatar", headers=headers, content=content)
    assert response.status_code == status
    assert detail in response.json()["detail"]
    assert not (avatar_dir / "1.webp").exists()

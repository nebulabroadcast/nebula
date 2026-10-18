"""The /api/v2/assets resource with assets kept in memory instead of the DB.

Listing runs SQL, so it is tested against the stack DB
(tests/integration/test_assets_api.py).
"""

import contextlib
import copy
from collections.abc import AsyncIterator, Iterator
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import nebula
import nebula.objects.asset.changes
import rest.assets.aux
import rest.assets.detail
from nebula.context import (
    RequestContext,
    is_system,
    request_context,
    set_default_system,
)
from nebula.enum import MetaClass
from nebula.objects.asset.access import asset_acl
from nebula.objects.asset.query import INDEX_DEFINITION
from nebula.query import QueryValidationError
from nebula.settings.metatypes import MetaType
from nebula.sql import SQL
from rest.assets.fields import asset_response, response_keys
from server.errors import REST_PREFIX, install_error_handlers
from server.middleware.context import RequestContextMiddleware
from server.rest import install_rest_routers
from server.session import Session

ASSETS = f"{REST_PREFIX}/assets"

USERS: dict[int, dict[str, Any]] = {
    1: {"id": 1, "login": "admin", "is_admin": True},
    # Can view and edit folder 1 only
    2: {"id": 2, "login": "editor", "can/asset_view": [1], "can/asset_edit": [1]},
    3: {"id": 3, "login": "limited", "is_limited": True, "can/asset_edit": True},
}


def auth(user_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {user_id:064d}"}


ADMIN, EDITOR, LIMITED = auth(1), auth(2), auth(3)

METATYPES = {
    "id": MetaType(ns="o", metaclass=MetaClass.INTEGER),
    "id_folder": MetaType(ns="o", metaclass=MetaClass.INTEGER),
    "ctime": MetaType(ns="o", metaclass=MetaClass.DATETIME),
    "created_by": MetaType(ns="o", metaclass=MetaClass.INTEGER),
    "id_bin": MetaType(ns="o", metaclass=MetaClass.INTEGER),
    "status": MetaType(ns="a", metaclass=MetaClass.INTEGER),
    "title": MetaType(ns="m", metaclass=MetaClass.STRING),
    "subtitle": MetaType(ns="m", metaclass=MetaClass.STRING),
    "duration": MetaType(ns="f", metaclass=MetaClass.TIMECODE),
    "has_aired": MetaType(ns="v", metaclass=MetaClass.BOOLEAN),
    "login": MetaType(ns="u", metaclass=MetaClass.STRING),
}


async def check_token(token: str, _request: Any, _transient: bool = False) -> Any:
    for user_id, meta in USERS.items():
        if token == f"{user_id:064d}":
            return SimpleNamespace(user=copy.deepcopy(meta))
    return None


@contextlib.asynccontextmanager
async def no_transaction(**_: Any) -> AsyncIterator[None]:
    yield


class FakeStore:
    def __init__(self) -> None:
        self.assets: dict[int, dict[str, Any]] = {
            10: {"id": 10, "id_folder": 1, "title": "One", "subtitle": "Sub"},
            20: {"id": 20, "id_folder": 2, "title": "Two", "created_by": 3},
        }
        self.aux: dict[tuple[int, str], Any] = {}
        self.messages: list[list[int]] = []

    def load(self, asset_id: int) -> nebula.Asset:
        if asset_id not in self.assets:
            raise nebula.NotFoundException(f"Asset ID {asset_id} not found")
        return nebula.Asset(meta=copy.deepcopy(self.assets[asset_id]))

    def save(self, asset: nebula.Asset) -> None:
        if not asset.id:
            asset.meta["id"] = max(self.assets) + 1
        self.assets[asset.meta["id"]] = copy.deepcopy(asset.meta)

    async def get_aux(self, _type: Any, asset_id: int, key: str) -> Any:
        return self.aux.get((asset_id, key))

    async def put_aux(self, _type: Any, asset_id: int, key: str, data: Any) -> None:
        self.aux[(asset_id, key)] = data

    async def delete_aux(self, _type: Any, asset_id: int, key: str) -> None:
        self.aux.pop((asset_id, key), None)

    async def msg(self, _topic: str, **data: Any) -> None:
        self.messages.append(data["objects"])

    async def computed_values(self, asset_id: int, keys: list[str]) -> dict[str, Any]:
        values = {
            "has_aired": False,
            "__aux": sorted(key for (id_, key) in self.aux if id_ == asset_id),
        }
        return {key: value for key, value in values.items() if key in keys}


@pytest.fixture
def store(monkeypatch: pytest.MonkeyPatch) -> Iterator[FakeStore]:
    fake = FakeStore()

    async def load(_cls: Any, asset_id: int, **_: Any) -> nebula.Asset:
        return fake.load(asset_id)

    async def save(self: nebula.Asset, **_: Any) -> None:
        fake.save(self)

    async def delete(self: nebula.Asset) -> None:
        fake.assets.pop(self.meta["id"])

    monkeypatch.setattr(Session, "check", check_token)
    monkeypatch.setattr(nebula.Asset, "load", classmethod(load))
    monkeypatch.setattr(nebula.Asset, "save", save)
    monkeypatch.setattr(nebula.Asset, "delete", delete)
    monkeypatch.setattr(nebula.db, "transaction", no_transaction)
    monkeypatch.setattr(nebula.objects.asset.changes.Validator, "validators", {})
    monkeypatch.setattr(rest.assets.aux, "get_aux", fake.get_aux)
    monkeypatch.setattr(rest.assets.aux, "put_aux", fake.put_aux)
    monkeypatch.setattr(rest.assets.aux, "delete_aux", fake.delete_aux)
    monkeypatch.setattr(nebula, "msg", fake.msg)
    monkeypatch.setattr(rest.assets.detail, "computed_values", fake.computed_values)
    monkeypatch.setattr(nebula.settings, "metatypes", METATYPES)

    default = is_system()
    set_default_system(False)
    yield fake
    set_default_system(default)


@pytest.fixture
def client(store: FakeStore) -> TestClient:
    _ = store
    app = FastAPI()
    app.add_middleware(RequestContextMiddleware)
    install_error_handlers(app)
    install_rest_routers(app)
    return TestClient(app)


#
# Reading
#


def test_get_asset(client: TestClient) -> None:
    response = client.get(f"{ASSETS}/10", headers=ADMIN)
    assert response.status_code == 200
    # Every stored key, with the Asset defaults filled in on load, and the
    # computed fields
    assert response.json() == {
        "id": 10,
        "id_folder": 1,
        "title": "One",
        "subtitle": "Sub",
        "status": 1,
        "content_type": 2,
        "media_type": 0,
        "version_of": 0,
        "has_aired": False,
        "__aux": [],
    }

    response = client.get(f"{ASSETS}/10", params={"fields": "title"}, headers=ADMIN)
    assert response.json() == {"id": 10, "title": "One"}

    response = client.get(f"{ASSETS}/10", params={"fields": "login"}, headers=ADMIN)
    assert response.status_code == 422

    assert client.get(f"{ASSETS}/99", headers=ADMIN).status_code == 404


def test_read_access(client: TestClient) -> None:
    assert client.get(f"{ASSETS}/10", headers=EDITOR).status_code == 200
    assert client.get(f"{ASSETS}/20", headers=EDITOR).status_code == 403
    # Limited users see what they created
    assert client.get(f"{ASSETS}/20", headers=LIMITED).status_code == 200
    assert client.get(f"{ASSETS}/10", headers=LIMITED).status_code == 403
    assert client.get(f"{ASSETS}/10").status_code == 401


def test_response_keys(store: FakeStore) -> None:
    _ = store
    assert response_keys(None) is None
    assert response_keys(["title", "has_aired", "__aux"]) == [
        "id",
        "title",
        "has_aired",
        "__aux",
    ]
    for key in ("login", "id_bin", "nope", "__file/written"):
        with pytest.raises(QueryValidationError):
            response_keys([key])


def test_asset_response(store: FakeStore) -> None:
    _ = store
    meta = {"id": 1, "title": "T", "__file/written": 5, "empty": None, "x/y": 1}
    # Default: every stored key but the internal ones
    assert asset_response(meta).model_dump(by_alias=True, exclude_unset=True) == {
        "id": 1,
        "title": "T",
        "x/y": 1,
    }
    keys = ["id", "title", "duration", "has_aired", "__aux"]
    computed = {"has_aired": False, "__aux": ["k"]}
    response = asset_response(meta, keys, computed)
    assert response.model_dump(by_alias=True, exclude_unset=True) == {
        "id": 1,
        "title": "T",
        "has_aired": False,
        "__aux": ["k"],
    }


def test_asset_response_odd_values(store: FakeStore) -> None:
    _ = store
    # Stored data isn't always clean: a number where text is expected is
    # returned as text, a value that doesn't fit at all is left out
    meta = {"id": 1, "title": 1984, "status": 99, "content_type": 1}
    assert asset_response(meta).model_dump(by_alias=True, exclude_unset=True) == {
        "id": 1,
        "title": "1984",
        "content_type": 1,
    }


#
# Writing
#


def test_create_asset(client: TestClient, store: FakeStore) -> None:
    response = client.post(
        ASSETS, json={"id_folder": 1, "title": "New", "duration": 5}, headers=EDITOR
    )
    assert response.status_code == 201
    body = response.json()
    assert response.headers["location"] == f"{ASSETS}/{body['id']}"
    assert store.assets[body["id"]]["created_by"] == 2
    assert store.assets[body["id"]]["updated_by"] == 2
    assert body["duration"] == 5.0


def test_create_needs_folder(client: TestClient) -> None:
    response = client.post(ASSETS, json={"title": "New"}, headers=ADMIN)
    assert response.status_code == 422
    assert response.json()["key"] == "id_folder"
    # No edit rights in folder 2
    response = client.post(ASSETS, json={"id_folder": 2}, headers=EDITOR)
    assert response.status_code == 403


def test_patch_asset(client: TestClient, store: FakeStore) -> None:
    response = client.patch(
        f"{ASSETS}/10", json={"title": "Renamed", "subtitle": None}, headers=EDITOR
    )
    assert response.status_code == 200
    assert store.assets[10]["title"] == "Renamed"
    assert "subtitle" not in store.assets[10]
    assert store.assets[10]["updated_by"] == 2


@pytest.mark.parametrize(
    ("body", "detail"),
    [
        ({"id": 5}, "'id' is read-only"),
        ({"ctime": 5}, "'ctime' is read-only"),
        ({"created_by": 5}, "'created_by' is read-only"),
        ({"has_aired": True}, "'has_aired' is computed"),
        ({"__aux": ["x"]}, "'__aux' can't be set"),
        ({"login": "x"}, "Unknown asset field 'login'"),
        ({"id_bin": 1}, "Unknown asset field 'id_bin'"),
        ({"nope": 1}, "Unknown asset field 'nope'"),
    ],
)
def test_patch_rejected(
    client: TestClient, store: FakeStore, body: dict[str, Any], detail: str
) -> None:
    before = copy.deepcopy(store.assets[10])
    response = client.patch(f"{ASSETS}/10", json=body, headers=ADMIN)
    assert response.status_code == 422
    assert response.json()["detail"] == detail
    assert store.assets[10] == before


def test_patch_access(client: TestClient, store: FakeStore) -> None:
    # Not in a folder the editor can edit
    assert client.patch(f"{ASSETS}/20", json={}, headers=EDITOR).status_code == 403
    # Moving to a folder the editor can't edit
    response = client.patch(f"{ASSETS}/10", json={"id_folder": 2}, headers=EDITOR)
    assert response.status_code == 403
    assert store.assets[10]["id_folder"] == 1


def test_delete_asset(client: TestClient, store: FakeStore) -> None:
    assert client.delete(f"{ASSETS}/10", headers=EDITOR).status_code == 403
    assert client.delete(f"{ASSETS}/10", headers=ADMIN).status_code == 204
    assert 10 not in store.assets


#
# Aux
#


def test_aux_lifecycle(client: TestClient, store: FakeStore) -> None:
    url = f"{ASSETS}/10/aux/site:notes"
    assert client.get(url, headers=EDITOR).status_code == 404
    assert client.put(url, json=[1, {"a": 2}], headers=EDITOR).status_code == 204
    assert client.get(url, headers=EDITOR).json() == [1, {"a": 2}]
    assert client.get(f"{ASSETS}/10", headers=EDITOR).json()["__aux"] == ["site:notes"]
    assert store.messages == [[10]]
    assert client.delete(url, headers=EDITOR).status_code == 204
    assert client.get(url, headers=EDITOR).status_code == 404
    # Deleting what isn't there is fine
    assert client.delete(url, headers=EDITOR).status_code == 204


def test_aux_typed(client: TestClient, store: FakeStore) -> None:
    url = f"{ASSETS}/10/aux/nebula:transcription"
    segments = [{"start": 0, "end": 1.5, "text": "Hi"}]
    assert (
        client.put(url, json={"segments": segments}, headers=ADMIN).status_code == 204
    )
    assert store.aux[(10, "nebula:transcription")] == {
        "language": None,
        "segments": [{"start": 0.0, "end": 1.5, "text": "Hi"}],
    }
    response = client.put(url, json={"segments": [{"start": "x"}]}, headers=ADMIN)
    assert response.status_code == 422


def test_aux_typed_keeps_extra_fields(client: TestClient, store: FakeStore) -> None:
    # A Whisper result has more than the model checks; nothing is dropped
    url = f"{ASSETS}/10/aux/openai:transcription"
    doc = {
        "language": "en",
        "text": "Hi",
        "segments": [{"start": 0.0, "end": 1.5, "text": "Hi", "words": [{"w": "Hi"}]}],
    }
    assert client.put(url, json=doc, headers=ADMIN).status_code == 204
    assert store.aux[(10, "openai:transcription")] == doc


def test_aux_access(client: TestClient) -> None:
    assert client.get(f"{ASSETS}/20/aux/k", headers=EDITOR).status_code == 403
    assert client.put(f"{ASSETS}/20/aux/k", json=1, headers=EDITOR).status_code == 403
    # Keys are lowercase names
    assert (
        client.put(f"{ASSETS}/10/aux/Bad Key", json=1, headers=ADMIN).status_code == 422
    )


#
# SQL and helpers
#


def test_asset_acl() -> None:
    assert asset_acl(None) is None
    assert asset_acl(nebula.User(meta=USERS[1])) is None

    acl = asset_acl(nebula.User(meta=USERS[2]))
    assert acl is not None
    assert SQL.render(acl) == ('"a".id_folder = ANY($1::integer[])', [[1]])

    acl = asset_acl(nebula.User(meta=USERS[3]), "b")
    assert acl is not None
    sql, params = SQL.render(acl)
    assert "\"b\".meta->>'created_by' = $1::text" in sql
    assert "\"b\".meta->'assignees' @> $2::jsonb" in sql
    assert params == ["3", [3]]


def test_ensure_can_save(store: FakeStore) -> None:
    _ = store
    editor = nebula.User(meta=USERS[2])
    with request_context(RequestContext(user=editor)):
        asset = nebula.Asset(meta={"id": 10, "id_folder": 1})
        nebula.objects.asset.changes.ensure_can_save(asset, {"title": "x"})
        nebula.objects.asset.changes.ensure_can_save(asset, {"id_folder": "1"})
        with pytest.raises(nebula.ForbiddenException):
            nebula.objects.asset.changes.ensure_can_save(asset, {"id_folder": 2})
        with pytest.raises(nebula.ValidationException):
            nebula.objects.asset.changes.ensure_can_save(asset, {"id_folder": "x"})


def test_index_definition() -> None:
    definition = (
        "CREATE INDEX idx_title ON public.assets USING btree "
        "(((meta ->> 'title'::text)))"
    )
    match = INDEX_DEFINITION.search(definition)
    assert match is not None
    assert match.group(1) == "title"
    # Indexes on columns or on several keys don't make a meta key sortable
    assert not INDEX_DEFINITION.search(
        "CREATE INDEX idx_ctime ON public.assets USING btree (ctime)"
    )

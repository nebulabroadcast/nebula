"""Asset saves write activity rows in their transaction.

Every test rolls back what it wrote, so the tier stays read only.
"""

import json
from typing import Any

import pytest

import nebula
from nebula import activity, messaging
from nebula.context import RequestContext, request_context

pytestmark = pytest.mark.asyncio(loop_scope="session")


class Rollback(Exception):  # noqa: N818
    pass


@pytest.fixture
def published(monkeypatch: pytest.MonkeyPatch) -> list[Any]:
    messages: list[Any] = []

    async def publish(payload: str) -> None:
        messages.append(json.loads(payload)[3:])

    monkeypatch.setattr(messaging.redis, "publish", publish)
    return messages


async def last_id() -> int:
    row = await nebula.db.fetchrow("SELECT coalesce(max(id), 0) AS m FROM activity")
    assert row is not None
    return int(row["m"])


async def kinds_since(id_asset: int, since: int) -> list[Any]:
    return await nebula.db.fetch(
        "SELECT kind, summary, detail FROM activity"
        " WHERE id_asset = $1 AND id > $2 ORDER BY id",
        id_asset,
        since,
    )


async def test_save_writes_rows_and_rollback_drops_them(published: list[Any]) -> None:
    row = await nebula.db.fetchrow("SELECT id FROM assets ORDER BY id LIMIT 1")
    if row is None:
        pytest.skip("No assets")
    asset = await nebula.Asset.load(row["id"])
    assert asset.id is not None
    before = await last_id()

    async def save_and_roll_back() -> None:
        assert asset.id is not None
        async with nebula.db.transaction():
            asset["title"] = f"{asset['title']} (test)"
            asset["qc/state"] = 3 if asset["qc/state"] != 3 else 4
            await asset.save()
            assert asset.changed_keys() == {}
            rows = await kinds_since(asset.id, before)
            assert [r["kind"] for r in rows] == ["meta", "qc"]
            assert rows[0]["summary"] == {"keys": ["title"]}
            assert "title" in rows[0]["detail"]["changes"]

            await asset.save()  # nothing changed: no row
            assert len(await kinds_since(asset.id, before)) == 2
            raise Rollback

    with pytest.raises(Rollback):
        await save_and_roll_back()

    assert await last_id() == before
    assert published == []


async def test_new_asset_saved_twice_is_one_new_row(published: list[Any]) -> None:
    folder = await nebula.db.fetchrow("SELECT id FROM folders ORDER BY id LIMIT 1")
    if folder is None:
        pytest.skip("No folders")

    async def create_and_roll_back() -> None:
        async with nebula.db.transaction():
            asset = nebula.Asset(meta={"title": "test", "id_folder": folder["id"]})
            await asset.save()
            assert asset.id is not None
            asset["path"] = "media.dir/test.mxf"
            await asset.save()  # a validator completing the new asset
            rows = await kinds_since(asset.id, 0)
            assert [r["kind"] for r in rows] == ["new"]
            raise Rollback

    with pytest.raises(Rollback):
        await create_and_roll_back()
    assert published == []


async def test_comment_permissions(published: list[Any]) -> None:
    asset_row = await nebula.db.fetchrow("SELECT id FROM assets ORDER BY id LIMIT 1")
    user_row = await nebula.db.fetchrow("SELECT id FROM users ORDER BY id LIMIT 1")
    if asset_row is None or user_row is None:
        pytest.skip("No assets or users")
    id_asset = asset_row["id"]
    # only the author is written (id_user references users); the others act
    author = nebula.User(meta={"id": user_row["id"], "login": "author"})
    other = nebula.User(meta={"id": -1, "login": "other"})
    admin = nebula.User(meta={"id": -2, "login": "admin", "is_admin": True})

    def acting(user: nebula.User) -> Any:
        return request_context(RequestContext(user=user))

    async def check_and_roll_back() -> None:
        async with nebula.db.transaction():
            with acting(author):
                comment = await activity.add_comment(id_asset, "hello")
                await activity.add_activity(id_asset, "meta", {"keys": ["title"]})
                meta = (await activity.list_activities(id_asset, limit=1))[0][0]
                assert meta["kind"] == "meta"
            with acting(other), pytest.raises(nebula.ForbiddenException):
                await activity.edit_comment(id_asset, comment["id"], "hijacked")
            with acting(other), pytest.raises(nebula.ForbiddenException):
                await activity.delete_comment(id_asset, comment["id"])
            with acting(author), pytest.raises(nebula.ForbiddenException):
                await activity.edit_comment(id_asset, meta["id"], "rewritten")
            with acting(admin), pytest.raises(nebula.ForbiddenException):
                await activity.edit_comment(id_asset, comment["id"], "admin text")
            with acting(admin):
                await activity.delete_comment(id_asset, comment["id"])
            with acting(author), pytest.raises(nebula.ForbiddenException):
                await activity.edit_comment(id_asset, comment["id"], "undeleted")
            row = await activity.get_activity(id_asset, comment["id"])
            assert row["summary"] == {"deleted": True}
            raise Rollback

    with pytest.raises(Rollback):
        await check_and_roll_back()
    assert published == []

"""nebula.Asset.query / iterate against a real database. Read-only."""

import pytest
import pytest_asyncio

import nebula
from nebula.context import RequestContext, request_context, system_context

pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest_asyncio.fixture(loop_scope="session")
async def folder() -> int:
    """The smallest folder with a few assets, so it can be read in full."""
    row = await nebula.db.fetchrow(
        """
        SELECT id_folder FROM assets GROUP BY id_folder
        HAVING COUNT(*) >= 5 ORDER BY COUNT(*) LIMIT 1
        """
    )
    if row is None:
        pytest.skip("No assets in the database")
    return int(row["id_folder"])


async def folder_ids(folder: int) -> list[int]:
    rows = await nebula.db.fetch(
        "SELECT id FROM assets WHERE id_folder = $1 ORDER BY id DESC", folder
    )
    return [row["id"] for row in rows]


async def test_query_pages(folder: int) -> None:
    expected = await folder_ids(folder)
    flt = {"key": "id_folder", "op": "eq", "value": folder}

    page = await nebula.Asset.query(flt, sort=["-id"], limit=2)
    assert all(isinstance(asset, nebula.Asset) for asset in page.items)
    assert [asset.id for asset in page.items] == expected[:2]
    assert page.has_more
    assert page.items[0]["id_folder"] == folder  # full meta, not REST rows

    page = await nebula.Asset.query(flt, sort=["-id"], limit=2, cursor=page.next_cursor)
    assert [asset.id for asset in page.items] == expected[2:4]


async def test_iterate(folder: int) -> None:
    flt = {"key": "id_folder", "op": "eq", "value": folder}
    ids = [asset.id async for asset in nebula.Asset.iterate(flt, page_size=3)]
    assert ids == await folder_ids(folder)  # default sort is -id


async def test_query_invalid() -> None:
    with pytest.raises(nebula.ValidationException):
        await nebula.Asset.query({"key": "no/such/key", "op": "eq", "value": 1})
    with pytest.raises(nebula.ValidationException):
        await nebula.Asset.query({"key": "title", "nope": 1})  # not a filter
    with pytest.raises(nebula.ValidationException):
        await nebula.Asset.query(sort=["subtitle"])  # not sortable


async def test_query_access(folder: int) -> None:
    flt = {"key": "id_folder", "op": "eq", "value": folder}
    # A limited user who created nothing sees nothing
    limited = nebula.User(meta={"id": -1, "login": "limited", "is_limited": True})
    with request_context(RequestContext(user=limited)):
        page = await nebula.Asset.query(flt)
    assert page.items == []
    # A system context (stand-alone service) sees everything
    with request_context(RequestContext(system=True)):
        page = await nebula.Asset.query(flt, limit=1)
    assert len(page.items) == 1
    # ...also inside a user's request: system_context keeps the user
    with request_context(RequestContext(user=limited)), system_context():
        page = await nebula.Asset.query(flt, limit=1)
    assert len(page.items) == 1


async def test_query_needs_list_rights() -> None:
    # As the REST listing: no asset_view at all is a 403, no user a 401
    viewer = nebula.User(meta={"id": -2, "login": "nobody"})
    with request_context(RequestContext(user=viewer)):
        with pytest.raises(nebula.ForbiddenException):
            await nebula.Asset.query()
        with pytest.raises(nebula.ForbiddenException):
            _ = [a async for a in nebula.Asset.iterate()]
    with request_context(RequestContext()), pytest.raises(nebula.UnauthorizedException):
        await nebula.Asset.query()

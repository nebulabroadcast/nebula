"""Legacy browse query (api/browse_assets). No database."""

import pytest

import nebula
from api.browse_assets._models import BrowseAssetsRequest
from api.browse_assets._query import build_order
from api.browse_assets.browse_assets import BrowseAssets
from nebula.context import RequestContext, request_context
from nebula.enum import MetaClass
from nebula.settings.metatypes import MetaType


@pytest.fixture(autouse=True)
def metatypes(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        nebula.settings,
        "metatypes",
        {
            "title": MetaType(ns="m", metaclass=MetaClass.STRING),
            "duration": MetaType(ns="m", metaclass=MetaClass.TIMECODE),
        },
    )


def test_order_by_known_keys() -> None:
    assert build_order("ctime") == "ctime"
    assert build_order("title") == "a.meta->>'title'"
    assert build_order("duration") == (
        "COALESCE(CAST(a.meta->>'duration' AS NUMERIC), 0)"
    )


def test_order_by_unknown_key_is_not_inlined() -> None:
    # The client picks both the columns and order_by, so order_by can be
    # anything: it must never reach the SQL
    injection = "x' OR 1=1; DROP TABLE users; --"
    assert build_order(injection) == "ctime"


@pytest.mark.asyncio
async def test_browse_needs_list_rights() -> None:
    # No asset_view at all: asset_acl adds no condition, so without the check
    # the query would return every asset
    nobody = nebula.User(meta={"id": 5, "login": "nobody"})
    with (
        request_context(RequestContext(user=nobody)),
        pytest.raises(nebula.ForbiddenException),
    ):
        await BrowseAssets().handle(BrowseAssetsRequest(), nobody)

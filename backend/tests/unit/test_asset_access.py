"""Proxy video and send-to need view access to the asset. No database."""

from typing import Any

import pytest

import nebula
from api.jobs import send_to as send_to_module
from api.jobs.send_to import SendTo, SendToRequest
from api.media.proxy import GetProxyInfo, ServeProxy
from nebula.context import RequestContext, request_context

pytestmark = pytest.mark.asyncio

# Limited users see only the assets they created
LIMITED = nebula.User(
    meta={"id": 2, "login": "limited", "is_limited": True, "can/job_control": True}
)
ASSETS = {
    7: {"id": 7, "id_folder": 1, "created_by": 2},
    8: {"id": 8, "id_folder": 1, "created_by": 1},
}


@pytest.mark.parametrize("endpoint", [ServeProxy, GetProxyInfo])
async def test_proxy_needs_view_access(endpoint: Any) -> None:
    asset = nebula.Asset(meta=ASSETS[8])
    with (
        request_context(RequestContext(user=LIMITED)),
        pytest.raises(nebula.ForbiddenException),
    ):
        await endpoint().handle(LIMITED, asset)


async def test_send_needs_view_access(monkeypatch: pytest.MonkeyPatch) -> None:
    jobs: list[int] = []

    async def fetch(_query: str, ids: list[int]) -> list[dict[str, Any]]:
        return [{"id": i, "meta": ASSETS[i]} for i in ids if i in ASSETS]

    async def send_to(id_asset: int, **_: Any) -> int:
        jobs.append(id_asset)
        return id_asset

    monkeypatch.setattr(nebula.db, "fetch", fetch)
    monkeypatch.setattr(send_to_module, "send_to", send_to)

    assert (
        await SendTo().handle(SendToRequest(ids=[7], id_action=1), LIMITED)
    ).ids == [7]
    # One asset the user can't see: no job at all, not even for the other
    with pytest.raises(nebula.ForbiddenException):
        await SendTo().handle(SendToRequest(ids=[7, 8], id_action=1), LIMITED)
    with pytest.raises(nebula.NotFoundException):
        await SendTo().handle(SendToRequest(ids=[9], id_action=1), LIMITED)
    assert jobs == [7]

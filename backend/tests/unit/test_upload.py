"""Media upload needs edit rights on the asset. No database, no files."""

import pytest
from starlette.requests import Request

import nebula
from api.media.upload import UploadMedia
from nebula.context import RequestContext, request_context
from nebula.enum import MediaType

VIEWER = nebula.User(meta={"id": 2, "login": "viewer", "can/asset_view": True})


@pytest.mark.asyncio
async def test_upload_needs_edit_rights() -> None:
    asset = nebula.Asset(meta={"id": 1, "id_folder": 1, "media_type": MediaType.FILE})
    request = Request({"type": "http", "headers": []})
    with (
        request_context(RequestContext(user=VIEWER)),
        pytest.raises(nebula.ForbiddenException),
    ):
        await UploadMedia().handle(request, asset, VIEWER)

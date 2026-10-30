import os

import anyio
from starlette.responses import FileResponse

import nebula
from server import APIModel, APIRequest
from server.dependencies import AssetInPath, CurrentUser


def get_proxy_path(id_asset: int) -> str:
    sys_settings = nebula.settings.system
    proxy_storage_path = nebula.storages[sys_settings.proxy_storage].local_path
    proxy_path_template = os.path.join(proxy_storage_path, sys_settings.proxy_path)

    _vars = {
        "id": id_asset,
        "id1000": id_asset // 1000,
    }

    return proxy_path_template.format(**_vars)


class ServeProxy(APIRequest):
    """Serve a low-res (proxy) media for a given asset.

    This endpoint supports range requests, so it is possible to use
    the file in media players that support HTTPS pseudo-streaming.
    """

    name = "proxy"
    path = "/proxy/{id_asset}"
    title = "Serve proxy"
    category = "Asset management"
    methods = ["GET"]

    async def handle(self, user: CurrentUser, asset: AssetInPath) -> FileResponse:
        # user first: anonymous requests get 401 before the asset is looked up
        _ = user
        asset.ensure_can_view()  # checks the request's user (nebula.context)
        assert asset.id is not None
        video_path = get_proxy_path(asset.id)
        if not await anyio.Path(video_path).exists():
            raise nebula.NotFoundException("Proxy not found")
        return FileResponse(video_path, media_type="video/mp4")


#
# Proxy info
#


class ProxyInfo(APIModel):
    id: int
    available: bool
    timestamp: float | None


class GetProxyInfo(APIRequest):
    """Get proxy info for a given asset."""

    name = "get_proxy_info"
    path = "/proxy/{id_asset}/info"
    title = "Get proxy info"
    category = "Asset management"
    methods = ["GET"]

    async def handle(self, user: CurrentUser, asset: AssetInPath) -> ProxyInfo:
        _ = user  # see ServeProxy
        asset.ensure_can_view()
        assert asset.id is not None
        video_path = get_proxy_path(asset.id)
        timestamp = None
        if exists := await anyio.Path(video_path).exists():
            stat = await anyio.Path(video_path).stat()
            timestamp = stat.st_mtime

        return ProxyInfo(
            id=asset.id,
            available=exists,
            timestamp=timestamp,
        )

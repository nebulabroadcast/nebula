import os

from starlette.responses import FileResponse

import nebula
from server import APIModel, APIRequest
from server.dependencies import CurrentUser


def get_proxy_path(id_asset: int) -> str:
    sys_settings = nebula.settings.system
    proxy_storage_path = nebula.storages[sys_settings.proxy_storage].local_path
    proxy_path_template = os.path.join(proxy_storage_path, sys_settings.proxy_path)

    vars = {
        "id": id_asset,
        "id1000": id_asset // 1000,
    }

    return proxy_path_template.format(**vars)


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

    async def handle(self, id_asset: int, user: CurrentUser) -> FileResponse:
        video_path = get_proxy_path(id_asset)
        if not os.path.exists(video_path):
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

    async def handle(self, id_asset: int, user: CurrentUser) -> ProxyInfo:
        video_path = get_proxy_path(id_asset)
        exists = os.path.exists(video_path)
        timestamp = os.path.getmtime(video_path) if exists else None

        return ProxyInfo(
            id=id_asset,
            available=exists,
            timestamp=timestamp,
        )

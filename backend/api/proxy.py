import os

from fastapi import Request
from fastapi.responses import FileResponse

import nebula
from server.dependencies import CurrentUser
from server.request import APIRequest


class ServeProxy(APIRequest):
    """Serve a low-res (proxy) media for a given asset.

    This endpoint supports range requests, so it is possible to use
    the file in media players that support HTTPS pseudo-streaming.
    """

    name = "proxy"
    path = "/proxy/{id_asset}"
    title = "Serve proxy"
    methods = ["GET"]

    async def handle(
        self,
        request: Request,
        id_asset: int,
        user: CurrentUser,
    ) -> FileResponse:
        sys_settings = nebula.settings.system
        proxy_storage_path = nebula.storages[sys_settings.proxy_storage].local_path
        proxy_path_template = os.path.join(proxy_storage_path, sys_settings.proxy_path)

        vars = {
            "id": id_asset,
            "id1000": id_asset // 1000,
        }

        video_path = proxy_path_template.format(**vars)

        if not os.path.exists(video_path):
            # maybe return content too? with a placeholder image?
            raise nebula.NotFoundException("Proxy not found")

        return FileResponse(video_path, media_type="video/mp4")

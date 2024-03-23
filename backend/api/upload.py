import os
import time

import aiofiles
from fastapi import Request, Response

import nebula
from nebula.enum import MediaType, ObjectStatus
from nebula.filetypes import FileTypes
from server.dependencies import AssetInPath, CurrentUser
from server.request import APIRequest


class UploadRequest(APIRequest):
    """Upload a media file for a given asset.

    This endpoint is used by the web frontend to upload media files.
    """

    name: str = "upload"
    path: str = "/upload/{id_asset}"
    title: str = "Get objects"
    response_class = Response

    async def handle(
        self,
        request: Request,
        asset: AssetInPath,
        user: CurrentUser,
    ) -> None:
        assert asset["media_type"] == MediaType.FILE, "Only file assets can be uploaded"
        extension = request.headers.get("X-nebula-extension")
        assert extension, "Missing X-nebula-extension header"

        assert FileTypes.get(extension) == asset["content_type"], "Invalid content type"

        if nebula.settings.system.upload_storage and nebula.settings.system.upload_dir:
            direct = False
            storage = nebula.storages[nebula.settings.system.upload_storage]
            upload_dir = nebula.settings.system.upload_dir
            base_name = nebula.settings.system.upload_base_name.format(**asset.meta)
            upload_full_dir = os.path.join(storage.local_path, upload_dir)
            if not os.path.isdir(upload_full_dir):
                try:
                    os.makedirs(upload_full_dir)
                except Exception as e:
                    raise nebula.NebulaException(
                        "Unable to create uplad directory"
                    ) from e
            target_path = os.path.join(upload_full_dir, f"{base_name}.{extension}")
        else:
            direct = True
            storage = nebula.storages[asset["id_storage"]]
            assert asset.path, f"{asset} does not have path set"
            bname = os.path.splitext(asset.path)[0]
            target_path = f"{bname}.{extension}"

        nebula.log.debug(f"Uploading media file for {asset}", user=user.name)

        temp_dir = os.path.join(storage.local_path, ".nx", "creating")
        if not os.path.isdir(temp_dir):
            os.makedirs(temp_dir)

        temp_path = os.path.join(temp_dir, f"upload-{asset.id}-{time.time()}")

        i = 0
        async with aiofiles.open(temp_path, "wb") as f:
            async for chunk in request.stream():
                i += len(chunk)
                await f.write(chunk)
        nebula.log.debug(f"Uploaded {i} bytes", user=user.name)

        os.rename(temp_path, target_path)
        if direct:
            if extension != os.path.splitext(asset["path"])[1][1:]:
                nebula.log.warning(
                    f"Uploaded media file extension {extension} does not match "
                    f"asset extension {os.path.splitext(asset['path'])[1][1:]}"
                )
                asset["path"] = os.path.splitext(asset["path"])[0] + "." + extension
                # TODO: remove old file?
            asset["status"] = ObjectStatus.CREATING
            await asset.save()
        nebula.log.info(f"Uploaded media file for {asset}", user=user.name)

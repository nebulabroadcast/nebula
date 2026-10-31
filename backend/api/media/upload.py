import os
import time
from dataclasses import dataclass

import aiofiles
from fastapi import Request
from starlette.requests import ClientDisconnect

import nebula
from nebula.enum import MediaType, ObjectStatus
from nebula.exceptions import BadRequestException
from nebula.filetypes import FileTypes
from server.dependencies import AssetInPath, CurrentUser
from server.request import APIRequest


@dataclass(frozen=True)
class ParsedMediaRequest:
    extension: str


def validate_request(request: Request, asset: nebula.Asset) -> ParsedMediaRequest:
    asset.ensure_can_edit()
    if asset["media_type"] != MediaType.FILE:
        raise BadRequestException("Only file assets can be uploaded")

    extension = request.headers.get("X-nebula-extension")

    if not extension:
        raise BadRequestException("Missing X-nebula-extension header")

    if FileTypes.get(extension) != asset["content_type"]:
        raise BadRequestException(f"Invalid file extension: {extension}")

    return ParsedMediaRequest(extension=extension)


class UploadMedia(APIRequest):
    """Upload a media file for a given asset.

    This endpoint is used by the web frontend to upload media files.
    """

    name = "upload"
    path = "/upload/{id_asset}"
    title = "Get objects"
    category = "Asset management"

    async def handle(
        self,
        request: Request,
        asset: AssetInPath,
        user: CurrentUser,
    ) -> None:
        _ = user  # Required to gate this endpoint behind authentication

        parsed_request = validate_request(request, asset)

        if nebula.settings.system.upload_storage and nebula.settings.system.upload_dir:
            direct = False
            storage = nebula.storages[nebula.settings.system.upload_storage]
            upload_dir = nebula.settings.system.upload_dir
            base_name = nebula.settings.system.upload_base_name.format(**asset.meta)
            upload_full_dir = os.path.join(storage.local_path, upload_dir)

            try:
                os.makedirs(upload_full_dir, exist_ok=True)
            except Exception as e:
                raise nebula.NebulaException("Unable to create upload directory") from e

            target_path = os.path.join(
                upload_full_dir, f"{base_name}.{parsed_request.extension}"
            )
        else:
            direct = True
            storage = nebula.storages[asset["id_storage"]]
            if not asset.path:
                raise nebula.NotFoundException(
                    f"Asset {asset} does not have a path set"
                )
            bname = os.path.splitext(asset.path)[0]
            target_path = f"{bname}.{parsed_request.extension}"

        nebula.log.debug(f"Uploading media file for {asset}")

        temp_dir = os.path.join(storage.local_path, ".nx", "creating")

        try:
            os.makedirs(temp_dir, exist_ok=True)
        except Exception as e:
            raise nebula.NebulaException(
                "Unable to create temp upload directory"
            ) from e

        temp_path = os.path.join(temp_dir, f"upload-{asset.id}-{time.time()}")

        i = 0
        try:
            async with aiofiles.open(temp_path, "wb") as f:
                async for chunk in request.stream():
                    i += len(chunk)
                    await f.write(chunk)
            nebula.log.debug(f"Uploaded {i} bytes")
        except ClientDisconnect:
            nebula.log.warning(f"Upload cancelled for {asset}")
            try:
                os.remove(temp_path)
            except OSError:
                nebula.log.error(f"Unable to remove temp file {temp_path}")
            return

        os.rename(temp_path, target_path)
        if direct:
            if parsed_request.extension != os.path.splitext(asset["path"])[1][1:]:
                nebula.log.warning(
                    f"Uploaded file extension {parsed_request.extension} doesn't match "
                    f"asset extension {os.path.splitext(asset['path'])[1][1:]}"
                )
                asset["path"] = (
                    os.path.splitext(asset["path"])[0] + "." + parsed_request.extension
                )
                # TODO: remove old file?
            asset["status"] = ObjectStatus.CREATING
            # The file is complete: meta skips its completion wait
            # if the file still has the uploaded size
            asset["__file/written"] = i
            await asset.save()
        nebula.log.info(f"Uploaded media file for {asset}")

import hashlib
import os

from fastapi import APIRouter, Request, Response
from fastapi.responses import FileResponse

import nebula
from nebula.helpers.avatars import (
    AVATAR_MEDIA_TYPE,
    MAX_AVATAR_BYTES,
    avatar_path,
    delete_avatar,
    save_avatar,
)
from rest.users.common import PREFIX, UserId

router = APIRouter(prefix=PREFIX)

# Browsers may cache the image, but must revalidate it (ETag)
CACHE_CONTROL = "private, no-cache"


def file_etag(stat_result: os.stat_result) -> str:
    base = f"{stat_result.st_mtime}-{stat_result.st_size}"
    return f'"{hashlib.md5(base.encode(), usedforsecurity=False).hexdigest()}"'


@router.get(
    "/{user_id}/avatar",
    operation_id="users_avatar_get",
    summary="Get a user's avatar",
    response_class=FileResponse,
    responses={
        200: {"content": {AVATAR_MEDIA_TYPE: {}}},
        304: {"description": "Not modified"},
    },
)
async def get_avatar(user_id: UserId, request: Request) -> Response:
    """Any logged-in user can see avatars. 404 when the user has none."""
    user = await nebula.User.load(user_id)
    path = avatar_path(user)
    try:
        stat_result = os.stat(path)
    except FileNotFoundError as e:
        raise nebula.NotFoundException("User has no avatar") from e

    etag = file_etag(stat_result)
    headers = {"ETag": etag, "Cache-Control": CACHE_CONTROL}
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers=headers)
    return FileResponse(
        path, media_type=AVATAR_MEDIA_TYPE, headers=headers, stat_result=stat_result
    )


@router.post(
    "/{user_id}/avatar",
    status_code=204,
    operation_id="users_avatar_upload",
    summary="Upload a user's avatar",
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                media_type: {"schema": {"type": "string", "format": "binary"}}
                for media_type in ("image/png", "image/jpeg", "image/webp")
            },
        }
    },
)
async def upload_avatar(user_id: UserId, request: Request) -> None:
    """Upload an image as the request body (PNG, JPEG or WebP, max 10 MB).
    It is cropped to a square and converted to WebP.

    Admins can change any avatar, users their own.
    """
    user = await nebula.User.load(user_id)
    user.ensure_can_edit()

    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_AVATAR_BYTES:
        raise nebula.ValidationException("Avatar file is too large")

    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > MAX_AVATAR_BYTES:
            raise nebula.ValidationException("Avatar file is too large")

    content_type = request.headers.get("content-type", "").split(";")[0].strip()
    await save_avatar(user, bytes(data), content_type)


@router.delete(
    "/{user_id}/avatar",
    status_code=204,
    operation_id="users_avatar_delete",
    summary="Delete a user's avatar",
)
async def remove_avatar(user_id: UserId) -> None:
    """Admins can delete any avatar, users their own."""
    user = await nebula.User.load(user_id)
    await delete_avatar(user)

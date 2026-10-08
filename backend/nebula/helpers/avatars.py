"""User avatars.

Stored like proxies: in a configurable storage and path (system settings
`avatar_storage` and `avatar_path`). Every upload is normalized to a square
WebP image with ffmpeg, so the server never serves a client's file as is.
"""

import asyncio
import os

import aiofiles
import aiofiles.os

import nebula

AVATAR_SIZE = 256
MAX_AVATAR_BYTES = 10 * 1024 * 1024
AVATAR_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp"}
AVATAR_MEDIA_TYPE = "image/webp"


def avatar_path(user: nebula.User, *, writable: bool = False) -> str:
    assert user.id, "Unsaved user can't have an avatar"
    sys_settings = nebula.settings.system
    storage = nebula.storages[sys_settings.avatar_storage]
    if not (storage.is_writable if writable else storage.is_mounted):
        raise nebula.NebulaException("Avatar storage is not available")
    path = sys_settings.avatar_path.format(id=user.id)
    return os.path.join(storage.local_path, path)


async def normalize_image(data: bytes) -> bytes:
    """Crop and scale an image to a square WebP. Raises 422 if it isn't one."""
    size = AVATAR_SIZE
    process = await asyncio.create_subprocess_exec(
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        "pipe:0",
        "-vf",
        f"scale={size}:{size}:force_original_aspect_ratio=increase,crop={size}:{size}",
        "-frames:v",
        "1",
        "-c:v",
        "libwebp",
        "-quality",
        "85",
        "-f",
        "webp",
        "pipe:1",
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await process.communicate(data)
    if process.returncode != 0 or not stdout:
        nebula.log.debug(f"Avatar conversion failed: {stderr.decode(errors='replace')}")
        raise nebula.ValidationException("The file is not a valid image")
    return stdout


async def save_avatar(user: nebula.User, data: bytes, content_type: str) -> None:
    user.ensure_can_edit()
    if content_type not in AVATAR_CONTENT_TYPES:
        types = ", ".join(sorted(AVATAR_CONTENT_TYPES))
        raise nebula.ValidationException(f"Avatar must be one of: {types}")
    if len(data) > MAX_AVATAR_BYTES:
        raise nebula.ValidationException("Avatar file is too large")

    image = await normalize_image(data)
    path = avatar_path(user, writable=True)
    await aiofiles.os.makedirs(os.path.dirname(path), exist_ok=True)
    temp_path = f"{path}.uploading"
    async with aiofiles.open(temp_path, "wb") as f:
        await f.write(image)
    await aiofiles.os.replace(temp_path, path)


async def delete_avatar(user: nebula.User) -> None:
    user.ensure_can_edit()
    path = avatar_path(user, writable=True)
    if not await aiofiles.os.path.exists(path):
        raise nebula.NotFoundException("User has no avatar")
    await aiofiles.os.remove(path)

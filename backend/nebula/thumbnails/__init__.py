"""Asset thumbnails (spec 011).

A thumbnail is a 320 px wide WebP of the asset's poster frame (or of the
frame 15 % in), made with ffmpeg from the asset's file the first time it
is asked for, and stored in the `thumbnails` table. It is current while
its hash equals the asset's `asset_thumbnail_hash(meta)` (schema.sql): a
changed file, poster frame or mark changes the hash, and the next request
makes a new one. Only video and image files have thumbnails.
"""

__all__ = [
    "Thumbnail",
    "ThumbnailBusyError",
    "get_thumbnail",
    "make_thumbnail",
]

import os

from nx.logging import logger as log

from nebula.exceptions import NotFoundException
from nebula.objects.asset import Asset
from nebula.thumbnails.queue import ThumbnailBusyError, ThumbnailQueue
from nebula.thumbnails.render import RenderError, render, webp_size
from nebula.thumbnails.store import Thumbnail, ThumbnailState, load_state, save

_queue: ThumbnailQueue[Thumbnail] | None = None


def stored(state: ThumbnailState, *, retry_failed: bool = False) -> Thumbnail | None:
    """The stored thumbnail when it is current; None when one must be made."""
    if state.hash is None:
        raise NotFoundException("The asset has no thumbnail")
    if not state.current:
        return None
    if state.last is None and not retry_failed:
        raise NotFoundException("Unable to make a thumbnail of the asset")
    return state.last


def source_path(state: ThumbnailState) -> str:
    """The asset's file. Never the proxy: proxies can have burn-ins."""
    path = Asset.from_meta(state.meta).local_path
    if path is None or not os.path.isfile(path):
        raise NotFoundException("The asset's file is not available")
    return path


async def get_thumbnail(id_asset: int) -> Thumbnail:
    """The asset's current thumbnail, made through the queue when needed.

    While the file is offline, the last stored thumbnail is returned even
    if it is stale (its hash differs from the asset's): the file is needed
    for a new one. NotFoundException: the asset can't have one, making it
    failed, or the file is offline and nothing is stored.
    ThumbnailBusyError: it wasn't made in time; ask again later.
    """
    state = await load_state(id_asset)
    if (thumbnail := stored(state)) is not None:
        return thumbnail
    try:
        source_path(state)
    except NotFoundException:
        if state.last is not None:
            return state.last  # stale, but the best there is
        raise

    global _queue  # noqa: PLW0603
    if _queue is None:
        _queue = ThumbnailQueue(make_thumbnail)
    return await _queue.get(id_asset)


async def make_thumbnail(id_asset: int, *, retry_failed: bool = False) -> Thumbnail:
    """Make and store the asset's thumbnail, unless the stored one is current.

    Not queued: one call runs one ffmpeg. A file ffmpeg can't read is
    stored as failed, so it isn't tried again until its hash changes.
    """
    # Read again: another request or replica may have made it meanwhile
    state = await load_state(id_asset)
    if (thumbnail := stored(state, retry_failed=retry_failed)) is not None:
        return thumbnail
    path = source_path(state)
    assert state.hash is not None  # checked by stored()
    try:
        data = await render(path, state.position)
    except RenderError as e:
        log.warning(f"Unable to make a thumbnail of asset {id_asset}: {e}")
        await save(id_asset, state, None)
        raise NotFoundException("Unable to make a thumbnail of the asset") from e
    width, height = webp_size(data) or (None, None)
    thumbnail = Thumbnail(state.hash, data, width, height)
    await save(id_asset, state, thumbnail)
    log.debug(f"Made a thumbnail of asset {id_asset} ({len(data)} bytes)")
    return thumbnail

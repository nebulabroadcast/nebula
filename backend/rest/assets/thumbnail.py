"""Thumbnail of an asset (spec 011): made on request, kept in the database."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, Response

import nebula
from nebula.thumbnails import ThumbnailBusyError, get_thumbnail
from rest.assets.common import PREFIX, AssetId

router = APIRouter(prefix=PREFIX)

# With the current hash in the URL, the picture behind the URL never changes
IMMUTABLE = "private, max-age=31536000, immutable"
REVALIDATE = "private, no-cache"
RETRY_AFTER_SECONDS = 2


@router.get(
    "/{asset_id}/thumbnail",
    operation_id="assets_thumbnail_get",
    summary="Get the thumbnail of an asset",
    response_class=Response,
    responses={
        200: {"content": {"image/webp": {}}},
        304: {"description": "Not modified"},
        503: {"description": "Not made yet: retry after `Retry-After` seconds"},
    },
)
async def get_asset_thumbnail(
    asset_id: AssetId,
    request: Request,
    thumbnail_hash: Annotated[
        str | None,
        Query(
            alias="hash",
            description="The asset's `thumbnail_hash`. With the current one, "
            "the response may be cached for good.",
        ),
    ] = None,
) -> Response:
    """A 320 px wide WebP of the asset's poster frame, or of an image asset.

    Made the first time it is asked for. 404 when the asset can't have one
    (not a video or image file), its file is offline and there is no
    current one, or ffmpeg couldn't read the file.
    """
    asset = await nebula.Asset.load(asset_id)
    asset.ensure_can_view()
    try:
        thumbnail = await get_thumbnail(asset_id)
    except ThumbnailBusyError as e:
        raise HTTPException(
            503,
            "The thumbnail is not ready yet",
            headers={"Retry-After": str(RETRY_AFTER_SECONDS)},
        ) from e

    etag = f'"{thumbnail.hash}"'
    headers = {
        "ETag": etag,
        "Cache-Control": IMMUTABLE if thumbnail_hash == thumbnail.hash else REVALIDATE,
    }
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers=headers)
    return Response(thumbnail.data, media_type=thumbnail.mime, headers=headers)

"""Activity feed of an asset: changes, QC, uploads and comments (spec 010).

Whoever can view the asset reads its whole feed and comments on it.
"""

from typing import Annotated, Any

from fastapi import APIRouter, Path, Query
from pydantic import BaseModel, StringConstraints, TypeAdapter

import nebula
from nebula import activity
from nebula.activity import KINDS, Activity
from nebula.query.models import QueryResponse
from rest.assets.common import PREFIX, AssetId
from server.query.params import split_list

router = APIRouter(prefix=PREFIX)

ActivityId = Annotated[int, Path(description="Activity ID", ge=1)]
ACTIVITY: TypeAdapter[Activity] = TypeAdapter(Activity)


class CommentPayload(BaseModel):
    text: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=10_000),
    ]


class ActivityPage(QueryResponse[Activity]):
    pass


async def ensure_can_view_asset(asset_id: int) -> None:
    asset = await nebula.Asset.load(asset_id)
    asset.ensure_can_view()


def activity_response(row: dict[str, Any]) -> Activity:
    return ACTIVITY.validate_python(row)


@router.get(
    "/{asset_id}/activities",
    operation_id="assets_activities_list",
    summary="List the activity of an asset",
    response_model_exclude_unset=True,
)
async def list_activities(
    asset_id: AssetId,
    kind: Annotated[
        str | None,
        Query(description=f"Comma-separated kinds ({', '.join(KINDS)})"),
    ] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 50,
    cursor: Annotated[
        str | None, Query(description="Value of `next_cursor` from the previous page")
    ] = None,
) -> ActivityPage:
    """Newest first. Rows have no `detail`; read a single row for it."""
    await ensure_can_view_asset(asset_id)
    rows, next_cursor = await activity.list_activities(
        asset_id, kinds=split_list(kind), limit=limit, cursor=cursor
    )
    return ActivityPage(
        items=[activity_response(row) for row in rows],
        next_cursor=next_cursor,
        has_more=next_cursor is not None,
    )


@router.get(
    "/{asset_id}/activities/{activity_id}",
    operation_id="assets_activities_get",
    summary="Get an activity row with its detail",
    response_model_exclude_unset=True,
)
async def get_activity(asset_id: AssetId, activity_id: ActivityId) -> Activity:
    """`detail` holds the full old and new values of a `meta` row."""
    await ensure_can_view_asset(asset_id)
    return activity_response(await activity.get_activity(asset_id, activity_id))


@router.post(
    "/{asset_id}/activities",
    status_code=201,
    operation_id="assets_activities_comment",
    summary="Comment on an asset",
    response_model_exclude_unset=True,
)
async def add_comment(asset_id: AssetId, payload: CommentPayload) -> Activity:
    await ensure_can_view_asset(asset_id)
    return activity_response(await activity.add_comment(asset_id, payload.text))


@router.patch(
    "/{asset_id}/activities/{activity_id}",
    operation_id="assets_activities_edit",
    summary="Edit your comment",
    response_model_exclude_unset=True,
)
async def edit_comment(
    asset_id: AssetId, activity_id: ActivityId, payload: CommentPayload
) -> Activity:
    """Only the author edits a comment. Other kinds can't be changed."""
    await ensure_can_view_asset(asset_id)
    row = await activity.edit_comment(asset_id, activity_id, payload.text)
    return activity_response(row)


@router.delete(
    "/{asset_id}/activities/{activity_id}",
    status_code=204,
    operation_id="assets_activities_delete",
    summary="Delete a comment",
)
async def delete_comment(asset_id: AssetId, activity_id: ActivityId) -> None:
    """The author or an admin. The row stays, without its text."""
    await ensure_can_view_asset(asset_id)
    await activity.delete_comment(asset_id, activity_id)

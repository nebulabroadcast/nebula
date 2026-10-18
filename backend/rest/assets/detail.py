from typing import Annotated

from fastapi import APIRouter, Query, Response

import nebula
from nebula.objects.asset.changes import save_asset_changes
from nebula.objects.asset.query import COMPUTED_KEYS, asset_query_fields, assets_base
from nebula.query import QueryRequest, fetch_page
from rest.assets.common import PREFIX, AssetId
from rest.assets.fields import asset_response, response_keys
from rest.assets.models import Asset, AssetCreate, AssetPatch
from server.errors import REST_PREFIX
from server.query.params import split_list

router = APIRouter(prefix=PREFIX)


async def computed_values(asset_id: int, keys: list[str]) -> dict[str, object]:
    """Values of the computed fields among `keys`, as the listing has them."""
    if not (computed := [key for key in keys if key in COMPUTED_KEYS]):
        return {}
    request = QueryRequest(fields=computed, limit=1)
    page = await fetch_page(
        request, asset_query_fields(), assets_base(t"a.id = {asset_id}")
    )
    return dict(page.rows[0]) if page.rows else {}


@router.post(
    "",
    status_code=201,
    operation_id="assets_create",
    summary="Create an asset",
    response_model_exclude_unset=True,
)
async def create_asset(payload: AssetCreate, response: Response) -> Asset:
    """Create an asset. The asset validator plugin runs as for any save.

    Needs `asset_edit` for the asset's folder.
    """
    asset = nebula.Asset()
    await save_asset_changes(asset, payload.to_meta_changes())
    response.headers["Location"] = f"{REST_PREFIX}/assets/{asset.id}"
    return asset_response(asset.meta)


@router.get(
    "/{asset_id}",
    operation_id="assets_get",
    summary="Get an asset",
    response_model_exclude_unset=True,
)
async def get_asset(
    asset_id: AssetId,
    fields: Annotated[
        str | None, Query(description="Comma-separated fields to return")
    ] = None,
) -> Asset:
    """Without `fields`, every stored field and the computed fields
    (`has_aired`, `__aux`) are returned."""
    asset = await nebula.Asset.load(asset_id)
    asset.ensure_can_view()
    keys = response_keys(split_list(fields))
    computed = await computed_values(asset_id, keys or list(COMPUTED_KEYS))
    return asset_response(asset.meta, keys, computed)


@router.patch(
    "/{asset_id}",
    operation_id="assets_update",
    summary="Update an asset",
    response_model_exclude_unset=True,
)
async def update_asset(asset_id: AssetId, payload: AssetPatch) -> Asset:
    """Change some of the asset's fields. Omitted fields stay as they are,
    null removes a value. The asset validator plugin runs as for any save.

    Needs `asset_edit` for the asset's folder, and for the new one when the
    folder changes.
    """
    asset = await nebula.Asset.load(asset_id)
    await save_asset_changes(asset, payload.to_meta_changes())
    return asset_response(asset.meta)


@router.delete(
    "/{asset_id}",
    status_code=204,
    operation_id="assets_delete",
    summary="Delete an asset",
)
async def delete_asset(asset_id: AssetId) -> None:
    """Delete the asset, with its rundown items and aux data.

    Admins only. 409 when an item of the asset has aired.
    """
    asset = await nebula.Asset.load(asset_id)
    asset.ensure_can_delete()
    await asset.delete()

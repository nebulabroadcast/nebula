"""Aux data of an asset: one JSON document per key (rest/README.md §9)."""

from typing import Annotated, Any

from fastapi import APIRouter, Body
from pydantic import ValidationError

import nebula
from nebula.enum import ObjectTypeId
from nebula.helpers.aux import delete_aux, get_aux, put_aux
from rest.assets.common import PREFIX, AssetId, AuxKey
from rest.assets.models import AUX_MODELS

router = APIRouter(prefix=PREFIX)

KNOWN_KEYS = ", ".join(f"`{key}`" for key in AUX_MODELS)


async def notify(asset_id: int) -> None:
    # The asset's `__aux` changed
    await nebula.msg("objects_changed", object_type="asset", objects=[asset_id])


@router.get(
    "/{asset_id}/aux/{key}",
    operation_id="assets_aux_get",
    summary="Get aux data of an asset",
)
async def get_asset_aux(asset_id: AssetId, key: AuxKey) -> Any:
    """The document stored under the key. 404 when there is none."""
    asset = await nebula.Asset.load(asset_id)
    asset.ensure_can_view()
    data = await get_aux(ObjectTypeId.ASSET, asset_id, key)
    if data is None:
        raise nebula.NotFoundException(f"Asset has no aux data '{key}'")
    return data


@router.put(
    "/{asset_id}/aux/{key}",
    status_code=204,
    operation_id="assets_aux_put",
    summary="Store aux data of an asset",
    description="Store a JSON document under the key, replacing the previous "
    f"one. Documents of known keys ({KNOWN_KEYS}) are validated.\n\n"
    "Needs `asset_edit` for the asset's folder.",
)
async def put_asset_aux(
    asset_id: AssetId,
    key: AuxKey,
    data: Annotated[Any, Body(description="Any JSON value")],
) -> None:
    asset = await nebula.Asset.load(asset_id)
    asset.ensure_can_edit()
    if model := AUX_MODELS.get(key):
        try:
            data = model.model_validate(data).model_dump()
        except ValidationError as e:
            raise nebula.ValidationException(f"Invalid '{key}': {e}") from e
    await put_aux(ObjectTypeId.ASSET, asset_id, key, data)
    await notify(asset_id)


@router.delete(
    "/{asset_id}/aux/{key}",
    status_code=204,
    operation_id="assets_aux_delete",
    summary="Delete aux data of an asset",
)
async def delete_asset_aux(asset_id: AssetId, key: AuxKey) -> None:
    """Needs `asset_edit` for the asset's folder. 204 also when there was none."""
    asset = await nebula.Asset.load(asset_id)
    asset.ensure_can_edit()
    await delete_aux(ObjectTypeId.ASSET, asset_id, key)
    await notify(asset_id)

from string.templatelib import Template
from typing import Annotated

from fastapi import APIRouter, Depends

import nebula
from nebula.context import current_user
from nebula.enum import ObjectTypeId
from nebula.helpers.assets import asset_acl
from nebula.query import (
    FulltextSearch,
    QueryRequest,
    fetch_page,
)
from rest.assets.common import PREFIX
from rest.assets.fields import (
    asset_query_fields,
    asset_response,
    indexed_meta_keys,
    response_keys,
)
from rest.assets.models import AssetList
from server.query.params import query_params_dependency

router = APIRouter(prefix=PREFIX)

SEARCH = FulltextSearch(ObjectTypeId.ASSET)


def assets_base(where: Template | None = None) -> Template:
    """Assets matching `where` (on `a`). fetch_page adds filters, sorting..."""
    condition = t"WHERE {where}" if where is not None else t""
    return t"""
        SELECT a.id, a.id_folder, a.status, a.content_type, a.media_type,
            a.ctime, a.mtime, a.meta
        FROM assets a {condition}
    """


async def query_assets(request: QueryRequest) -> AssetList:
    nebula.Asset.ensure_can_list()
    keys = response_keys(request.fields)
    fields = asset_query_fields(await indexed_meta_keys())
    base = assets_base(asset_acl(current_user(), "a"))
    page = await fetch_page(request, fields, base, SEARCH)
    items = [asset_response(row["meta"], keys, dict(row)) for row in page.rows]
    return AssetList.model_validate(page.response(items))


@router.get(
    "",
    operation_id="assets_list",
    summary="List assets",
    response_model_exclude_unset=True,
)
async def list_assets(
    query: Annotated[
        QueryRequest, Depends(query_params_dependency(asset_query_fields))
    ],
) -> AssetList:
    """List assets. Query parameters other than the options are equality
    filters (`?id_folder=1&status=1`); repeat one to match any of the values.

    `q` is a fulltext search. Without `fields`, every stored field is
    returned. Users see the assets of the folders they can view; limited
    users see the assets they created or are assigned to.
    """
    return await query_assets(query)


@router.api_route(
    "",
    methods=["QUERY"],
    operation_id="assets_query",
    summary="Query assets",
    response_model_exclude_unset=True,
)
async def query_assets_query(query: QueryRequest) -> AssetList:
    """Query assets with the full query model (filter tree, search, sort)."""
    return await query_assets(query)


@router.post(
    "/query",
    operation_id="assets_query_post",
    summary="Query assets (POST)",
    response_model_exclude_unset=True,
)
async def query_assets_post(query: QueryRequest) -> AssetList:
    """Same as `QUERY /assets`, for clients that can't send the QUERY method."""
    return await query_assets(query)

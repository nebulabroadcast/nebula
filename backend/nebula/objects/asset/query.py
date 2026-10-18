"""Querying assets: what they can be filtered and sorted by, and the query.

Fields are the asset metatypes, the indexed table columns and the computed
fields. Meta keys are sortable only when they have an index: assets can be
many, and a sort without an index sorts every matching row on every page.

The REST listing (rest/assets) and `Asset.query` / `Asset.iterate` use them.
"""

import re
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass
from string.templatelib import Template
from typing import TYPE_CHECKING, Any

from nx.db import db
from pydantic import ValidationError

from nebula.context import current_user
from nebula.enum import ObjectTypeId
from nebula.objects.asset.access import asset_acl
from nebula.objects.asset.keys import is_asset_key
from nebula.query import (
    Field,
    FieldKind,
    FilterNode,
    FulltextSearch,
    QueryRequest,
    QueryValidationError,
    column,
    fetch_page,
    meta,
)
from nebula.query.fields import METACLASS_KINDS
from nebula.settings import settings

if TYPE_CHECKING:
    from nebula.objects.asset import Asset

# Table columns, all indexed
COLUMNS = [
    column(key, FieldKind.INTEGER)
    for key in (
        "id",
        "id_folder",
        "status",
        "content_type",
        "media_type",
        "ctime",
        "mtime",
    )
]

COMPUTED_FIELDS = [
    Field(
        "has_aired",
        FieldKind.BOOLEAN,
        t"COALESCE(has_aired.value, FALSE)",
        join=t"""LEFT JOIN LATERAL (
            SELECT TRUE AS value
            FROM items i JOIN asrun r ON r.id_item = i.id
            WHERE i.id_asset = b.id
            LIMIT 1
        ) AS has_aired ON TRUE""",
        sortable=True,
    ),
    Field(
        "__aux",
        FieldKind.LIST,
        t"aux_keys.value",
        join=t"""LEFT JOIN LATERAL (
            SELECT COALESCE(jsonb_agg(key ORDER BY key), '[]') AS value
            FROM aux WHERE object_type = 0 AND id_object = b.id
        ) AS aux_keys ON TRUE""",
    ),
]
COMPUTED_KEYS = frozenset(field.key for field in COMPUTED_FIELDS)

SEARCH = FulltextSearch(ObjectTypeId.ASSET)


def asset_query_fields(indexed: frozenset[str] = frozenset()) -> list[Field]:
    """Fields of the asset listing. `indexed`: meta keys with an index."""
    fields = [*COLUMNS, *COMPUTED_FIELDS]
    for key, meta_type in settings.metatypes.items():
        if not is_asset_key(key):
            continue
        kind = METACLASS_KINDS[meta_type.metaclass]
        # Indexes are on the text value, so only strings can use them
        sortable = kind == FieldKind.STRING and key in indexed
        fields.append(meta(key, kind, sortable=sortable))
    return fields


def assets_base(where: Template | None = None) -> Template:
    """Assets matching `where` (on `a`). fetch_page adds filters, sorting..."""
    condition = t"WHERE {where}" if where is not None else t""
    return t"""
        SELECT a.id, a.id_folder, a.status, a.content_type, a.media_type,
            a.ctime, a.mtime, a.meta
        FROM assets a {condition}
    """


#
# Meta keys with an index (setup creates them for metatypes with
# `index: True`). Indexes only change with setup, so they are cached.
#

INDEX_DEFINITION = re.compile(r"USING btree \(\(\(meta ->> '([^']+)'::text\)\)\)$")
INDEX_CACHE_SECONDS = 60
_indexed: tuple[float, frozenset[str]] | None = None


async def indexed_meta_keys() -> frozenset[str]:
    global _indexed  # noqa: PLW0603
    if _indexed is not None and time.monotonic() - _indexed[0] < INDEX_CACHE_SECONDS:
        return _indexed[1]
    rows = await db.fetch(
        """
        SELECT indexdef FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'assets'
        """
    )
    keys = frozenset(
        match.group(1)
        for row in rows
        if (match := INDEX_DEFINITION.search(row["indexdef"]))
    )
    _indexed = (time.monotonic(), keys)
    return keys


#
# Asset.query / Asset.iterate
#


@dataclass
class AssetPage:
    """One page of `Asset.query`. Pass `next_cursor` to get the next one."""

    items: list[Asset]
    next_cursor: str | None
    has_more: bool


async def query_assets(  # noqa: PLR0913
    cls: type[Asset],
    filter: FilterNode | dict[str, Any] | None = None,  # noqa: A002
    *,
    q: str | None = None,
    sort: list[str] | None = None,
    limit: int = 100,
    cursor: str | None = None,
) -> AssetPage:
    """One page of the assets matching the filter, as asset objects.

    The current user's asset access condition applies (none in a system
    context, e.g. a stand-alone service). Raises ValidationException for an
    invalid filter, sort or cursor, as the REST listing does (422/400).
    """
    try:
        request = QueryRequest.model_validate(
            {"filter": filter, "q": q, "sort": sort, "limit": limit, "cursor": cursor}
        )
    except ValidationError as e:
        raise QueryValidationError(f"Invalid asset query: {e}") from e
    fields = asset_query_fields(await indexed_meta_keys())
    base = assets_base(asset_acl(current_user(), "a"))
    page = await fetch_page(request, fields, base, SEARCH)
    return AssetPage(
        items=[cls.from_meta(row["meta"]) for row in page.rows],
        next_cursor=page.next_cursor,
        has_more=page.has_more,
    )


async def iterate_assets(
    cls: type[Asset],
    filter: FilterNode | dict[str, Any] | None = None,  # noqa: A002
    *,
    q: str | None = None,
    sort: list[str] | None = None,
    page_size: int = 100,
) -> AsyncIterator[Asset]:
    """Every asset matching the filter, fetched page by page."""
    cursor = None
    while True:
        page = await query_assets(
            cls, filter, q=q, sort=sort, limit=page_size, cursor=cursor
        )
        for asset in page.items:
            yield asset
        if not page.has_more:
            return
        cursor = page.next_cursor

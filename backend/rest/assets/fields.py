"""What asset lists can filter and sort by, and how an asset is returned.

Fields are the asset metatypes, the indexed table columns and the computed
fields. Meta keys are sortable only when they have an index: assets can be
many, and a sort without an index sorts every matching row on every page.
"""

import re
import time
from collections.abc import Mapping
from typing import Any

import nebula
from nebula.objects.asset import is_asset_key
from rest.assets.models import Asset
from server.query import Field, FieldKind, QueryValidationError, column, meta
from server.query.fields import METACLASS_KINDS

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


def asset_query_fields(indexed: frozenset[str] = frozenset()) -> list[Field]:
    """Fields of the asset listing. `indexed`: meta keys with an index."""
    fields = [*COLUMNS, *COMPUTED_FIELDS]
    for key, meta_type in nebula.settings.metatypes.items():
        if not is_asset_key(key):
            continue
        kind = METACLASS_KINDS[meta_type.metaclass]
        # Indexes are on the text value, so only strings can use them
        sortable = kind == FieldKind.STRING and key in indexed
        fields.append(meta(key, kind, sortable=sortable))
    return fields


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
    rows = await nebula.db.fetch(
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
# Response
#


def response_keys(fields: list[str] | None) -> list[str] | None:
    """Keys for the requested `fields` (checked), None for the default.

    The default is every stored meta key, except internal `__` keys.
    """
    if fields is None:
        return None
    for key in fields:
        if key not in COMPUTED_KEYS and not is_asset_key(key):
            raise QueryValidationError(f"Unknown field '{key}'")
    return list(dict.fromkeys(["id", *fields]))


def asset_response(
    meta: Mapping[str, Any],
    keys: list[str] | None = None,
    computed: Mapping[str, Any] | None = None,
) -> Asset:
    """The asset with the given keys, or the default ones (keys=None).

    The default is every stored key except internal `__` ones, plus the
    computed fields found in `computed`.
    """
    computed = computed or {}
    if keys is None:
        values = {
            key: value
            for key, value in meta.items()
            if not key.startswith("__") and value is not None
        }
        values.update({key: computed[key] for key in COMPUTED_KEYS if key in computed})
    else:
        values = {}
        for key in keys:
            source = computed if key in COMPUTED_KEYS else meta
            value = source.get(key)
            if value is not None:
                values[key] = value
    values["id"] = meta["id"]
    return Asset.model_validate(values)

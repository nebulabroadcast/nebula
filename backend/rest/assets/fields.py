"""How an asset is returned by the REST API.

What assets can be filtered and sorted by is in nebula.objects.asset.query
(re-exported here for the resource's modules).
"""

from collections.abc import Mapping
from typing import Any

from pydantic import TypeAdapter, ValidationError

import nebula
from nebula.objects.asset import is_asset_key
from nebula.objects.asset.query import (
    COLUMNS,
    COMPUTED_FIELDS,
    COMPUTED_KEYS,
    INDEX_DEFINITION,
    asset_query_fields,
    indexed_meta_keys,
)
from nebula.query import QueryValidationError
from rest.assets.models import Asset

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
    check_core_values(values)
    return Asset.model_validate(values)


# Typed fields of the Asset model that come from stored meta. Stored data
# isn't always clean (old data, direct db writes), and one odd value must
# not fail the whole response.
CORE_ADAPTERS: dict[str, TypeAdapter[Any]] = {
    name: TypeAdapter(field.annotation)
    for name, field in Asset.model_fields.items()
    if name != "id"
    and name not in COMPUTED_KEYS
    and field.alias is None
    and field.annotation is not None
}


def check_core_values(values: dict[str, Any]) -> None:
    """Make stored values fit the typed fields: a number where text is
    expected becomes text, anything else that doesn't fit is left out."""
    for key, adapter in CORE_ADAPTERS.items():
        if key not in values:
            continue
        value = values[key]
        try:
            adapter.validate_python(value)
            continue
        except ValidationError:
            pass
        try:
            values[key] = adapter.validate_python(str(value))
            continue
        except ValidationError:
            del values[key]
            nebula.log.warning(
                f"Asset {values.get('id')}: stored '{key}' {value!r} "
                "doesn't fit its type, left out of the response"
            )


__all__ = [
    "COLUMNS",
    "COMPUTED_FIELDS",
    "COMPUTED_KEYS",
    "INDEX_DEFINITION",
    "asset_query_fields",
    "asset_response",
    "check_core_values",
    "indexed_meta_keys",
    "response_keys",
]

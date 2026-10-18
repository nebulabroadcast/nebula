"""Which metadata keys are asset fields, and which a client may set."""

from typing import Any

from nebula.exceptions import ValidationException
from nebula.settings import settings

# Metatype namespaces of asset metadata, and the asset keys of the object
# namespace ("o", shared with items, bins and events)
ASSET_NAMESPACES = {"a", "ai", "f", "m", "q"}
ASSET_OBJECT_KEYS = {"id", "id_folder", "created_by", "updated_by", "ctime", "mtime"}
# Namespace of virtual fields: computed by the server, never written
VIRTUAL_NAMESPACE = "v"
# Set by the server only
READ_ONLY_KEYS = {"id", "ctime", "mtime", "created_by", "updated_by"}


def is_asset_key(key: str) -> bool:
    """Whether the key is an asset metatype (virtual ones excluded)."""
    if (meta_type := settings.metatypes.get(key)) is None:
        return False
    return meta_type.ns in ASSET_NAMESPACES or key in ASSET_OBJECT_KEYS


def check_asset_changes(changes: dict[str, Any]) -> None:
    """Raise unless every key is asset metadata a client may set."""
    for key in changes:
        if key.startswith("__"):
            raise ValidationException(f"'{key}' can't be set", key=key)
        if key in READ_ONLY_KEYS:
            raise ValidationException(f"'{key}' is read-only", key=key)
        meta_type = settings.metatypes.get(key)
        if meta_type is not None and meta_type.ns == VIRTUAL_NAMESPACE:
            raise ValidationException(f"'{key}' is computed", key=key)
        if not is_asset_key(key):
            raise ValidationException(f"Unknown asset field '{key}'", key=key)

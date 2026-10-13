import os
from typing import TYPE_CHECKING, Any, cast

import asyncpg

from nebula.context import get_request_context, require_access
from nebula.enum import ContentType, MediaType, ObjectStatus, ObjectTypeId
from nebula.exceptions import (
    ConflictException,
    ForbiddenException,
    UnauthorizedException,
    ValidationException,
)
from nebula.helpers.aux import delete_aux
from nebula.objects.base import BaseObject
from nebula.settings import settings
from nebula.storages import storages
from nebula.utils import get_base_name, slugify

if TYPE_CHECKING:
    from nebula.objects.user import User

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


def can_view_asset(user: User, meta: dict[str, Any]) -> bool:
    if user.is_admin or user.id in meta.get("assignees", []):
        return True
    if user.is_limited:
        return bool(meta.get("created_by") == user.id)
    if id_folder := meta.get("id_folder"):
        return user.can("asset_view", id_folder)
    return False


def asset_edit_denial(user: User, id_folder: int | None) -> str | None:
    """Why the user can't edit assets in the folder, None if they can."""
    if user.is_admin:
        return None
    acl = user.get("can/asset_edit", False)
    if not acl:
        return "You are not allowed to edit assets"
    if isinstance(acl, list) and id_folder not in acl:
        return "You are not allowed to edit assets in this folder"
    return None


class Asset(BaseObject):
    object_type: str = "asset"
    db_columns: list[str] = [
        "id_folder",
        "content_type",
        "media_type",
        "status",
        "version_of",
        "ctime",
        "mtime",
    ]

    defaults = {
        "content_type": ContentType.VIDEO,
        "media_type": MediaType.VIRTUAL,
        "status": ObjectStatus.ONLINE,
        "version_of": 0,  # NOTE: V5 Compatibility, remove in V6, should be None
    }

    #
    # Access controlled operations
    # (trusted code in system context always passes the checks)
    #

    @classmethod
    def ensure_can_list(cls) -> None:
        """Which assets a user sees is limited by the listing (asset_acl)."""
        require_access(
            lambda u: u.is_admin or u.is_limited or u.can("asset_view", anyval=True),
            "You are not allowed to list assets",
        )

    def ensure_can_view(self) -> None:
        require_access(
            lambda u: can_view_asset(u, self.meta),
            "You are not allowed to view this asset",
        )

    def ensure_can_edit(self, id_folder: int | None = None) -> None:
        """Check edit rights in the asset's folder, or in `id_folder`."""
        context = get_request_context()
        if context.system:
            return
        if context.user is None:
            raise UnauthorizedException("Authentication required")
        folder = self["id_folder"] if id_folder is None else id_folder
        if denial := asset_edit_denial(context.user, folder):
            raise ForbiddenException(denial)

    def ensure_can_delete(self) -> None:
        require_access(lambda u: u.is_admin, "You are not allowed to delete assets")

    def check_changes(self, changes: dict[str, Any]) -> None:
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

    #
    # Deleting
    #

    async def delete(self) -> None:
        try:
            await super().delete()
        except asyncpg.exceptions.ForeignKeyViolationError as e:
            # asrun keeps aired items, which keep their asset
            raise ConflictException(f"{self} has aired and can't be deleted") from e

    async def delete_children(self) -> None:
        if self.id is not None:
            await delete_aux(ObjectTypeId.ASSET, self.id)

    @property
    def base_name(self) -> str | None:
        """Return base name of the asset file

        Base name is a file name without extension and path.
        In case of virtual assets, returns None.
        """
        if path := self.meta.get("path"):
            return get_base_name(path)
        return None

    @property
    def path(self) -> str | None:
        """Return a local path to the file asset.

        Returns None if asset is virtual.
        """
        id_storage = self["id_storage"]
        path = self["path"]
        if not (id_storage and path):
            return None
        storage_path = storages[id_storage].local_path
        return os.path.join(storage_path, path)

    @property
    def local_path(self) -> str | None:
        """Return a local path to the file asset.

        Returns None if asset is virtual or file does not exist.
        """
        id_storage = self["id_storage"]
        path = self["path"]
        if not (id_storage and path):
            return None
        storage_path = storages[id_storage].local_path
        full_path = os.path.join(storage_path, path)
        if not os.path.exists(full_path):
            return None
        return full_path

    @property
    def slug(self) -> str | None:
        """Return slug of the asset.
        Slug is a title and subtitle converted to a slug.
        In case of virtual assets, returns None.
        """
        return slugify(f"{self['title']} {self['subtitle']}")

    @property
    def title(self) -> str:
        """Return display title.

        Display title is a title with optional subtitle.
        """
        separator = settings.system.subtitle_separator
        if not (title := self.get("title")):
            title = f"Asset {self.id}" if self.id else "New asset"

        if subtitle := self.get("subtitle"):
            return f"{title}{separator}{subtitle}"
        return str(title)

    @property
    def duration(self) -> float:
        """Return duration of the asset in seconds.
        Takes in account mark_in and mark_out.
        """
        duration = self["duration"]
        if not duration:
            return 0
        if mark_out := self["mark_out"]:
            duration = min(duration, mark_out)
        if mark_in := self["mark_in"]:
            duration -= mark_in
        return cast("float", duration)

    #
    # Playout helpers
    #

    def get_colocated_playout_path(self, id_channel: int) -> str | None:
        """Return this asset's path relative to the channel's playout dir.

        Some channels ("channel in a box") use the same storage for both
        assets and playout media, with the asset path already living
        under the channel's playout_dir - e.g. because it was imported
        there directly instead of being copied there by a channel-specific
        transfer job. In that case the asset can be considered ready for
        playout directly, without playout_status/{id_channel} tracking.
        Returns None if the asset is not colocated with the channel's
        playout dir.
        """
        playout_config = settings.get_playout_channel(id_channel)
        if playout_config is None:
            return None
        if not (playout_config.playout_storage and playout_config.playout_dir):
            return None
        if self["id_storage"] != playout_config.playout_storage:
            return None
        path = self["path"]
        if not path:
            return None
        rel_path = os.path.relpath(path, playout_config.playout_dir)
        if rel_path == os.curdir or rel_path.partition(os.sep)[0] == os.pardir:
            return None
        return rel_path

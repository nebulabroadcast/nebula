"""Assets: media files or virtual objects in a folder.

The class is here; access rules (access.py), which keys are asset fields
(keys.py), saving client changes (changes.py) and querying (query.py) are
in the submodules. Every name this module had before it became a package
is still importable from it.
"""

import os
from collections.abc import AsyncIterator
from typing import TYPE_CHECKING, Any, cast

import asyncpg
from nx.db import db

from nebula.context import require_access, require_no_denial
from nebula.enum import ContentType, MediaType, ObjectStatus, ObjectTypeId
from nebula.exceptions import ConflictException
from nebula.helpers.aux import delete_aux
from nebula.messaging import msg
from nebula.objects.asset.access import (
    asset_acl,
    asset_edit_denial,
    can_view_asset,
)
from nebula.objects.asset.keys import (
    ASSET_NAMESPACES,
    ASSET_OBJECT_KEYS,
    READ_ONLY_KEYS,
    VIRTUAL_NAMESPACE,
    check_asset_changes,
    is_asset_key,
)
from nebula.objects.base import BaseObject
from nebula.settings import settings
from nebula.storages import storages
from nebula.utils import get_base_name, slugify

if TYPE_CHECKING:
    from nebula.objects.asset.query import AssetPage
    from nebula.query import FilterNode

__all__ = [
    "ASSET_NAMESPACES",
    "ASSET_OBJECT_KEYS",
    "READ_ONLY_KEYS",
    "VIRTUAL_NAMESPACE",
    "Asset",
    "asset_acl",
    "asset_edit_denial",
    "can_view_asset",
    "is_asset_key",
]


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
        folder = self["id_folder"] if id_folder is None else id_folder
        require_no_denial(lambda user: asset_edit_denial(user, folder))

    def ensure_can_delete(self) -> None:
        require_access(lambda u: u.is_admin, "You are not allowed to delete assets")

    def check_changes(self, changes: dict[str, Any]) -> None:
        """Raise unless every key is asset metadata a client may set."""
        check_asset_changes(changes)

    #
    # Querying
    #

    @classmethod
    async def query(
        cls,
        filter: FilterNode | dict[str, Any] | None = None,  # noqa: A002
        *,
        q: str | None = None,
        sort: list[str] | None = None,
        limit: int = 100,
        cursor: str | None = None,
    ) -> AssetPage:
        """One page of the assets matching the filter (REST filter language).

        `q` is a fulltext query; `sort`, `limit` and `cursor` as in the REST
        listing. The current user's access condition applies (none in a
        system context, e.g. a stand-alone service).
        """
        from nebula.objects.asset.query import query_assets  # noqa: PLC0415

        return await query_assets(
            cls, filter, q=q, sort=sort, limit=limit, cursor=cursor
        )

    @classmethod
    async def iterate(
        cls,
        filter: FilterNode | dict[str, Any] | None = None,  # noqa: A002
        *,
        q: str | None = None,
        sort: list[str] | None = None,
        page_size: int = 100,
    ) -> AsyncIterator[Asset]:
        """Every asset matching the filter, fetched page by page."""
        from nebula.objects.asset.query import iterate_assets  # noqa: PLC0415

        async for asset in iterate_assets(
            cls, filter, q=q, sort=sort, page_size=page_size
        ):
            yield asset

    #
    # Deleting
    #

    async def delete(self) -> None:
        """Delete the asset, its rundown items (by cascade) and aux data.

        The bins that held its items are refreshed, and clients are told
        the asset is gone (`objects_changed`).
        """
        from nebula.helpers.scheduling import bin_refresh  # noqa: PLC0415

        bins = []
        if self.id is not None:
            rows = await db.fetch(
                "SELECT DISTINCT id_bin FROM items WHERE id_asset = $1", self.id
            )
            bins = [row["id_bin"] for row in rows]
        try:
            await super().delete()
        except asyncpg.exceptions.ForeignKeyViolationError as e:
            # asrun keeps aired items, which keep their asset
            raise ConflictException(f"{self} has aired and can't be deleted") from e
        await bin_refresh(bins)
        await msg("objects_changed", object_type=self.object_type, objects=[self.id])

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

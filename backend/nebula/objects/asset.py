import os

from nxtools import get_base_name, slugify

from nebula.enum import ContentType, MediaType, ObjectStatus
from nebula.objects.base import BaseObject
from nebula.settings import settings
from nebula.storages import storages


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
        full_path = os.path.join(storage_path, path)
        return full_path

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
        return title

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
        return duration

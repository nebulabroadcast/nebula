from nxtools import get_base_name, slugify

from nebula.enum import ContentType, MediaType, ObjectStatus
from nebula.objects.base import BaseObject


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
        """Return base name of the asset.
        Base name is a file name without extension and path.
        In case of virtual assets, returns None.
        """
        if path := self.meta.get("path"):
            return get_base_name(path)
        return None

    @property
    def slug(self) -> str | None:
        """Return slug of the asset.
        Slug is a title and subtitle converted to a slug.
        In case of virtual assets, returns None.
        """

        return slugify(f"{self['title']} {self['subtitle']}")

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

from typing import TYPE_CHECKING, Any

from nxtools import format_filesize, format_time, s2tc

from nebula.enum import ContentType, MediaType, MetaClass, ObjectStatus, QCState
from nebula.metadata.utils import get_cs_titles
from nebula.settings import settings

if TYPE_CHECKING:
    from nebula.objects.base import BaseObject
    from nebula.settings.metatypes import MetaType


def format_cs_values(meta_type: "MetaType", values: list[str]) -> str:
    if meta_type.cs is None:
        return ",".join(values)
    return ", ".join(get_cs_titles(meta_type.cs, tuple(values)))


def format_meta(object: "BaseObject", key: str, **kwargs: dict[str, Any]) -> str:
    """Return a human-readable string representation of a metadata value."""
    if not (value := object.get(key)):
        return ""

    match key:
        case "title" | "subtitle" | "description":
            return value  # Most common, so test it first
        case "content_type":
            return ContentType(int(value)).name
        case "media_type":
            return MediaType(int(value)).name
        case "status":
            return ObjectStatus(int(value)).name
        case "qc/state":
            return QCState(int(value)).name
        case "duration":
            return s2tc(value)
        case "file/size":
            return format_filesize(value)
        case "id_folder":
            if not (folder := settings.get_folder(value)):
                return "UNKNOWN"
            return folder.name

    meta_type = settings.metatypes[key]

    match meta_type.metaclass:
        case MetaClass.STRING | MetaClass.TEXT:
            return str(value)
        case MetaClass.INTEGER:
            return str(value)
        case MetaClass.NUMERIC:
            return str(round(value, 3))
        case MetaClass.BOOLEAN:
            return "yes" if value else "no"
        case MetaClass.DATETIME:
            return format_time(value)
        case MetaClass.TIMECODE:
            return s2tc(value)
        case MetaClass.SELECT:
            return format_cs_values(meta_type, [value])
        case MetaClass.LIST:
            return format_cs_values(meta_type, value)
        case MetaClass.COLOR:
            return f"#{value:06x}"

    return str(value)

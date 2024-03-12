from typing import Any

from nebula.enum import MetaClass
from nebula.settings import settings

ALWAYS_TO_INT = [
    "id_folder",
    "id_event",
    "id_channel",
    "content_type",
    "media_type",
    "status",
    "ctime",
    "mtime",
    "position",
    "start",
    "stop",
]


def is_serializable(value: Any) -> bool:
    """Check if a value is serializable.

    This is used to check if a value can be stored in the database.
    """
    if isinstance(value, (str, int, float, bool, dict, list, tuple)):
        return True
    return False


def normalize_meta(key: str, value: Any) -> Any:
    """Ensure that metadata is in the correct format.

    Returns the correct value for the given key.
    Raises a ValueError if the value cannot be converted.
    """
    # Some keys we need to enforce really hard
    if key in ALWAYS_TO_INT:
        return int(value or 0)

    # If there's no matching metatype, just return the value
    if key not in settings.metatypes:
        assert is_serializable(
            value
        ), f"Value {value} set to unknown key {key} is not supported."
        return value

    meta_type = settings.metatypes[key]

    if value == meta_type.default:
        return value

    match meta_type.metaclass:
        case MetaClass.STRING:
            return str(value).strip()

        case MetaClass.TEXT:
            return str(value).strip()

        case MetaClass.INTEGER:
            return int(value or 0)

        case MetaClass.NUMERIC:
            return float(value)

        case MetaClass.BOOLEAN:
            if isinstance(value, str):
                if value.lower() in ("yes", "true", "1"):
                    return True
                if value.lower() in ("no", "false", "0"):
                    return False
            return bool(value)

        case MetaClass.DATETIME:
            return float(value)

        case MetaClass.TIMECODE:
            return float(value)

        case MetaClass.OBJECT:
            assert is_serializable(
                value
            ), f"Value {value} of key {key} is not supported."
            return value

        case MetaClass.FRACTION:
            assert isinstance(value, str), f"{key} must be a string. is {type(value)}"
            return value

        case MetaClass.SELECT:
            assert isinstance(value, str), f"{key} must be a string. is {type(value)}"
            return str(value)

        case MetaClass.LIST:
            if not value:
                return None
            assert isinstance(value, list), f"{key} must be a list. is {type(value)}"
            return [str(v) for v in value]

        case MetaClass.COLOR:
            if isinstance(value, str):
                if value.startswith("#"):
                    value = value[1:]
                return int(value, 16)
            return int(value)

        case _:
            return value

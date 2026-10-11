"""What user lists can filter and sort by, and how a user is returned.

Permissions are stored as `can/*` meta keys and returned grouped as
`permissions`. Secrets are never returned, only `has_password` and
`api_key_preview`.
"""

from dataclasses import dataclass
from typing import Any

import nebula
from rest.users.models import USER_NAMESPACE, User
from server.models.user_models import UserPermissionsModel
from server.query import (
    Field,
    FieldKind,
    QueryValidationError,
    column,
    meta,
    meta_namespace,
)

FLAGS = ("is_admin", "is_limited", "local_network_only")


def user_query_fields() -> list[Field]:
    # There are few users, so every field can be sorted by without an index
    return [
        column("id", FieldKind.INTEGER),
        column("login", FieldKind.STRING),
        meta("ctime", FieldKind.NUMBER, sortable=True),
        meta("mtime", FieldKind.NUMBER, sortable=True),
        meta("email", FieldKind.STRING, sortable=True),
        meta("full_name", FieldKind.STRING, sortable=True),
        meta("language", FieldKind.STRING, sortable=True),
        # A missing flag is false, as in the response
        *(
            Field(
                key,
                FieldKind.BOOLEAN,
                t"COALESCE((b.meta->>{key:literal})::boolean, FALSE)",
                sortable=True,
            )
            for key in FLAGS
        ),
        *meta_namespace(USER_NAMESPACE, sortable=True),
    ]


@dataclass(frozen=True)
class ResponseKeys:
    """Keys a user response has: `always`, and `when_set` if they have a value."""

    always: list[str]
    when_set: list[str]


def response_keys(fields: list[str] | None) -> ResponseKeys:
    """Keys for the requested `fields` (checked), or the default ones.

    By default, every core field, and user metatypes that have a value.
    """
    metatype_keys = [
        key
        for key, meta_type in nebula.settings.metatypes.items()
        if meta_type.ns == USER_NAMESPACE and key not in User.model_fields
    ]
    if fields is None:
        return ResponseKeys(list(User.model_fields), metatype_keys)
    allowed = {*User.model_fields, *metatype_keys}
    for key in fields:
        if key not in allowed:
            raise QueryValidationError(f"Unknown field '{key}'")
    return ResponseKeys(list(dict.fromkeys(["id", *fields])), [])


def user_response(user: nebula.User, keys: ResponseKeys | None = None) -> User:
    keys = keys or response_keys(None)
    values = {key: user_value(user, key) for key in keys.always}
    for key in keys.when_set:
        if user.meta.get(key) is not None:
            values[key] = user.meta[key]
    return User.model_validate(values)


def user_value(user: nebula.User, key: str) -> Any:
    if key in FLAGS:
        return bool(user.meta.get(key))
    match key:
        case "permissions":
            # Every permission explicitly, unset ones as false
            return UserPermissionsModel.model_validate(user.permissions).model_dump()
        case "has_password":
            return user.has_password
        case "api_key_preview":
            return (
                user.meta.get("api_key_preview") if user.meta.get("api_key") else None
            )
    return user.meta.get(key)

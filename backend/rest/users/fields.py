"""What user lists can filter and sort by, and how a user is returned.

Permissions are stored as `can/*` meta keys and returned grouped as
`permissions`. Secrets are never returned, only `has_password` and
`api_key_preview`.
"""

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
        meta("is_admin", FieldKind.BOOLEAN, sortable=True),
        meta("is_limited", FieldKind.BOOLEAN, sortable=True),
        meta("local_network_only", FieldKind.BOOLEAN, sortable=True),
        *meta_namespace(USER_NAMESPACE, sortable=True),
    ]


def user_metatype_keys() -> list[str]:
    """User metatypes that aren't core fields of the User model."""
    return [
        key
        for key, meta_type in nebula.settings.metatypes.items()
        if meta_type.ns == USER_NAMESPACE and key not in User.model_fields
    ]


def response_keys(fields: list[str] | None) -> list[str] | None:
    """The requested `fields`, checked. None means the default fields."""
    if fields is None:
        return None
    allowed = {*User.model_fields, *user_metatype_keys()}
    for key in fields:
        if key not in allowed:
            raise QueryValidationError(f"Unknown field '{key}'")
    return list(dict.fromkeys(["id", *fields]))


def user_response(user: nebula.User, keys: list[str] | None = None) -> User:
    if keys is None:
        # Every core field, and user metatypes that have a value
        extra = [key for key in user_metatype_keys() if user.meta.get(key) is not None]
        keys = [*User.model_fields, *extra]
    return User.model_validate({key: user_value(user, key) for key in keys})


def user_value(user: nebula.User, key: str) -> Any:
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
        case "is_admin" | "is_limited" | "local_network_only":
            return bool(user.meta.get(key))
    return user.meta.get(key)

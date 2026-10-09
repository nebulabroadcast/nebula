from typing import Annotated, Any

from fastapi import Path

from rest.users.models import (
    CORE_FIELDS,
    DEFAULT_FIELDS,
    User,
    user_metatype_keys,
)
from server.models.user_models import UserPermissionsModel
from server.query import FieldKind, QuerySchema, QueryValidationError, SubstringSearch

PREFIX = "/users"

UserId = Annotated[int, Path(description="User ID", ge=1)]

BOOLEAN_FIELDS = {"is_admin", "is_limited", "local_network_only"}


def users_query_schema() -> QuerySchema:
    schema = QuerySchema(
        "users",
        "u",
        search=SubstringSearch(("login", "full_name", "email")),
    )
    schema.add_column("id", FieldKind.INTEGER)
    schema.add_column("login", FieldKind.STRING)
    schema.add_meta("ctime", FieldKind.NUMBER)
    schema.add_meta("mtime", FieldKind.NUMBER)
    for key in ("email", "full_name", "language"):
        schema.add_meta(key, FieldKind.STRING)
    for key in BOOLEAN_FIELDS:
        schema.add_meta(key, FieldKind.BOOLEAN)
    schema.add_metatypes("u")
    return schema


def resolve_fields(fields: list[str] | None) -> set[str] | None:
    """Validate requested fields. None means the default set."""
    if fields is None:
        return None
    allowed = CORE_FIELDS | set(user_metatype_keys())
    for key in fields:
        if key not in allowed:
            raise QueryValidationError(f"Unknown field '{key}'")
    return {"id", *fields}


def field_value(meta: dict[str, Any], key: str) -> Any:
    if key == "permissions":
        permissions = {
            k.removeprefix("can/"): v for k, v in meta.items() if k.startswith("can/")
        }
        # Every permission explicitly, unset ones as false
        return UserPermissionsModel.model_validate(permissions).model_dump()
    if key == "has_password":
        return bool(meta.get("password"))
    if key == "api_key_preview":
        return meta.get("api_key_preview") if meta.get("api_key") else None
    if key in BOOLEAN_FIELDS:
        return bool(meta.get(key))
    return meta.get(key)


def serialize_user(meta: dict[str, Any], fields: set[str] | None = None) -> User:
    """Build the API representation of a user from its stored meta."""
    if fields is None:
        # Default: all core fields, plus user metatypes that have a value
        extra = {key for key in user_metatype_keys() if meta.get(key) is not None}
        fields = DEFAULT_FIELDS | extra
    return User.model_validate({key: field_value(meta, key) for key in fields})

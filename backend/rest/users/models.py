"""User resource models (see rest/README.md §4.1).

Core fields are typed. Extra fields are allowed only for metatypes in the
user namespace ("u"). Permissions are stored as `can/*` meta keys and
exposed grouped as `permissions`.
"""

from typing import Annotated, Any, Self

from pydantic import ConfigDict, Field, model_validator

import nebula
from nebula.metadata.normalize import normalize_meta
from nebula.settings.common import LanguageCode
from server.models import APIModel
from server.models.user_models import PermissionValue, UserPermissionsModel
from server.query import QueryResponse

USER_NAMESPACE = "u"

CORE_FIELDS = {
    "id",
    "login",
    "ctime",
    "mtime",
    "email",
    "full_name",
    "language",
    "is_admin",
    "is_limited",
    "local_network_only",
    "permissions",
    "api_key_preview",
    "has_password",
}

DEFAULT_FIELDS = CORE_FIELDS


def is_user_metatype(key: str) -> bool:
    meta_type = nebula.settings.metatypes.get(key)
    return meta_type is not None and meta_type.ns == USER_NAMESPACE


def user_metatype_keys() -> list[str]:
    return [
        key
        for key, meta_type in nebula.settings.metatypes.items()
        if meta_type.ns == USER_NAMESPACE and key not in CORE_FIELDS
    ]


class UserExtraFieldsModel(APIModel):
    """Allows extra keys, as long as they are user metatypes."""

    model_config = ConfigDict(extra="allow")

    @model_validator(mode="after")
    def validate_extra_fields(self) -> Self:
        extra = self.model_extra or {}
        for key, value in extra.items():
            if not is_user_metatype(key):
                raise ValueError(f"Unknown user field '{key}'")
            if value is not None:
                try:
                    extra[key] = normalize_meta(key, value)
                except (AssertionError, ValueError) as e:
                    raise ValueError(f"Invalid value for '{key}': {e}") from e
        return self


class User(UserExtraFieldsModel):
    """A user. With `fields`, only the requested fields are present."""

    id: Annotated[int, Field(description="User ID", examples=[1])]
    login: Annotated[str | None, Field(examples=["admin"])] = None
    ctime: Annotated[float | None, Field(description="Creation time")] = None
    mtime: Annotated[float | None, Field(description="Last modification time")] = None
    email: str | None = None
    full_name: str | None = None
    language: LanguageCode | None = None
    is_admin: bool | None = None
    is_limited: bool | None = None
    local_network_only: bool | None = None
    permissions: UserPermissionsModel | None = None
    api_key_preview: Annotated[
        str | None,
        Field(description="Masked API key, if the user has one"),
    ] = None
    has_password: Annotated[
        bool | None,
        Field(description="Whether the user can log in with a password"),
    ] = None


class UserList(QueryResponse[User]):
    """A page of users."""


class UserPermissionsPatch(APIModel):
    """Permissions to change. Omitted ones stay, null removes one."""

    model_config = ConfigDict(extra="forbid")

    asset_view: PermissionValue | None = None
    asset_edit: PermissionValue | None = None
    rundown_view: PermissionValue | None = None
    rundown_edit: PermissionValue | None = None
    scheduler_view: PermissionValue | None = None
    scheduler_edit: PermissionValue | None = None
    service_control: PermissionValue | None = None
    mcr: PermissionValue | None = None
    job_control: PermissionValue | None = None


class UserPatch(UserExtraFieldsModel):
    """Fields to change. Omitted fields stay as they are, null removes one."""

    login: Annotated[str | None, Field(min_length=1)] = None
    email: str | None = None
    full_name: str | None = None
    language: LanguageCode | None = None
    is_admin: bool | None = None
    is_limited: bool | None = None
    local_network_only: bool | None = None
    permissions: UserPermissionsPatch | None = None

    @model_validator(mode="after")
    def login_cant_be_removed(self) -> Self:
        if "login" in self.model_fields_set and self.login is None:
            raise ValueError("'login' can't be removed")
        return self

    def to_meta_changes(self) -> dict[str, Any]:
        """Changes as meta keys (permissions as `can/*`), for User.apply_changes."""
        changes = self.model_dump(exclude_unset=True, exclude={"permissions"})
        if self.permissions is not None:
            for key, value in self.permissions.model_dump(exclude_unset=True).items():
                changes[f"can/{key}"] = value
        return changes

    @model_validator(mode="after")
    def permissions_cant_be_null(self) -> Self:
        if "permissions" in self.model_fields_set and self.permissions is None:
            raise ValueError("'permissions' can't be null, set single permissions")
        return self


class UserCreate(UserPatch):
    """A new user. Set the password and API key with their actions afterwards."""

    login: Annotated[str, Field(min_length=1, examples=["jdoe"])]


class ApiKey(APIModel):
    api_key: Annotated[
        str,
        Field(description="The new API key. It is shown only once"),
    ]
    api_key_preview: Annotated[
        str,
        Field(description="Masked key, as returned with the user from now on"),
    ]


class NewPassword(APIModel):
    password: Annotated[str, Field(description="New password")]

import time
from typing import Annotated, Any

from pydantic import BaseModel, Field

PermissionValue = bool | list[int]


class UserPermissionsModel(BaseModel):
    """User permission model."""

    asset_view: Annotated[
        PermissionValue,
        Field(
            title="Can view assets",
            description="List of folder IDs user can view. Use 'true' for all folders",
        ),
    ] = False
    asset_edit: Annotated[
        PermissionValue,
        Field(
            title="Can asset edit",
            description="List of folder IDs user can edit. Use 'true' for all folders",
        ),
    ] = False
    rundown_view: Annotated[
        PermissionValue,
        Field(
            title="Can view rundown",
            description="List of channel IDs user can view. 'true' for all channels",
        ),
    ] = False
    rundown_edit: Annotated[
        PermissionValue,
        Field(
            title="Can edit rundown",
            description="List of channel IDs user can edit. 'true' for all channels",
        ),
    ] = False
    scheduler_view: Annotated[
        PermissionValue,
        Field(
            title="Can view scheduler",
            description="List of channel IDs user can view. 'true' for all channels",
        ),
    ] = False
    scheduler_edit: Annotated[
        PermissionValue,
        Field(
            title="Can edit scheduler",
            description="List of channel IDs user can edit. 'true' for all channels",
        ),
    ] = False
    service_control: Annotated[
        PermissionValue,
        Field(
            title="Can control services",
            description="List of service IDs user can control",
        ),
    ] = False
    mcr: Annotated[
        PermissionValue,
        Field(
            title="Can control playout",
            description="List of channel IDs user can control",
        ),
    ] = False
    job_control: Annotated[
        PermissionValue,
        Field(
            title="Can control jobs",
            description="Use list of action IDs to grant access to specific actions",
        ),
    ] = False


class UserModel(BaseModel):
    id: int | None = None
    login: str
    ctime: float = Field(default_factory=lambda: int(time.time()))
    mtime: float = Field(default_factory=lambda: int(time.time()))

    email: str | None = None
    full_name: str | None = None

    local_network_only: bool = False
    is_admin: bool = False
    is_limited: bool = False
    permissions: UserPermissionsModel = Field(default_factory=UserPermissionsModel)

    password: str | None = None
    api_key: str | None = None

    @classmethod
    def from_meta(cls, meta: dict[str, Any]) -> "UserModel":
        udata: dict[str, Any] = {"permissions": {}}
        for key, value in meta.items():
            if key == "api_key_preview":
                continue
            if key == "api_key":
                udata[key] = meta.get("api_key_preview", "*****")
            elif key == "password":
                continue
            elif key.startswith("can/"):
                udata["permissions"][key[4:]] = value
            else:
                udata[key] = value
        return cls(**udata)

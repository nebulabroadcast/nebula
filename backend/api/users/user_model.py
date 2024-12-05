from pydantic import Field

from server.models import ResponseModel


class UserModel(ResponseModel):
    id: int | None = Field(None, title="User ID")
    login: str = Field(..., title="Login name")
    full_name: str | None = Field(None, title="Full name")
    email: str | None = Field(None, title="Email")
    is_admin: bool = Field(False, title="Is administrator")
    is_limited: bool = Field(False, title="Is limited user")
    local_network_only: bool = Field(False, title="Allow local login only")
    password: str | None = Field(None, title="Password")
    api_key: str | None = Field(None, title="API key")

    can_asset_view: bool | list[int] = Field(
        False,
        title="Can view assets",
        description="List of folder IDs user can view. Use 'true' for all folders",
    )
    can_asset_edit: bool | list[int] = Field(
        False,
        title="Can asset edit",
        description="List of folder IDs user can edit. Use 'true' for all folders",
    )
    can_scheduler_view: bool | list[int] = Field(
        False,
        title="Can view scheduler",
        description="List of channel IDs user can view. Use 'true' for all channels",
    )
    can_scheduler_edit: bool | list[int] = Field(
        False,
        title="Can edit scheduler",
        description="List of channel IDs user can edit. Use 'true' for all channels",
    )
    can_rundown_view: bool | list[int] = Field(
        False,
        title="Can view rundown",
        description="List of channel IDs user can view. Use 'true' for all channels",
    )
    can_rundown_edit: bool | list[int] = Field(
        False,
        title="Can edit rundown",
        description="List of channel IDs user can edit. Use 'true' for all channels",
    )
    can_mcr: bool | list[int] = Field(
        False,
        title="Can control playout",
        description="List of channel IDs user can control",
    )
    can_job_control: bool | list[int] = Field(
        False,
        title="Can control jobs",
        description="Use list of action IDs to grant access to specific actions",
    )
    can_service_control: bool | list[int] = Field(
        False,
        title="Can control services",
        description="List of service IDs user can control",
    )

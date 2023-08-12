from fastapi import Response
from pydantic import Field

import nebula
from server.dependencies import CurrentUser
from server.models import ResponseModel
from server.request import APIRequest


class UserModel(ResponseModel):
    id: int | None = Field(None, title="User ID")
    login: str = Field(..., title="Login name")
    full_name: str | None = Field(None, title="Full name")
    email: str | None = Field(None, title="Email address")
    is_admin: bool = Field(False, title="Is user an administrator")
    is_limited: bool = Field(False, title="Is user limited")
    local_network_only: bool = Field(False, title="Allow only local login")
    password: str | None = Field(None, title="Password")

    can_asset_view: bool | list[int] = Field(False)
    can_asset_edit: bool | list[int] = Field(False)
    can_scheduler_view: bool | list[int] = Field(False)
    can_scheduler_edit: bool | list[int] = Field(False)
    can_rundown_view: bool | list[int] = Field(False)
    can_rundown_edit: bool | list[int] = Field(
        False,
        description="Use list of channel IDs for channel-specific rights",
    )
    can_job_control: bool | list[int] = Field(
        False,
        description="Use list of action IDs to grant access to specific actions",
    )
    can_mcr: bool | list[int] = Field( False)


class UserListResponseModel(ResponseModel):
    """Response model for listing users"""

    users: list[UserModel] = Field(..., title="List of users")


class UserListRequest(APIRequest):
    """Get a list of users"""

    name: str = "user_list"
    title: str = "Get a list of users"
    response_model = UserListResponseModel

    async def handle(self, user: CurrentUser) -> UserListResponseModel:
        if not user.is_admin:
            raise nebula.ForbiddenException("You are not allowed to list users")

        query = "SELECT meta FROM users ORDER BY login ASC"

        users = []
        async for row in nebula.db.iterate(query):
            meta = {}
            for key, value in row["meta"].items():
                if key == "password":
                    continue
                elif key.startswith("can/"):
                    meta[key.replace("can/", "can_")] = value
                else:
                    meta[key] = value

            users.append(UserModel(**meta))

        return UserListResponseModel(users=users)


class SaveUserRequest(APIRequest):
    """Save user data"""

    name: str = "save_user"
    title: str = "Save user data"
    responses = [204, 201]

    async def handle(self, user: CurrentUser, payload: UserModel) -> None:
        new_user = payload.id is None

        if not user.is_admin:
            raise nebula.ForbiddenException("You are not allowed to edit users")

        meta = payload.dict()
        meta.pop("id", None)

        password = meta.pop("password", None)

        for key, value in list(meta.items()):
            if key.startswith("can_"):
                meta[key.replace("can_", "can/")] = value
                del meta[key]

        if new_user:
            user = nebula.User(from_meta=meta)
        else:
            user = await nebula.User.load(payload.id)
            user.update(meta)

        if password:
            user.set_password(password)

        await user.save()

        if new_user:
            return Response(status_code=201)
        else:
            return Response(status_code=204)

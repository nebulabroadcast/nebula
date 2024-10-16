from pydantic import Field

import nebula
from server.dependencies import CurrentUser
from server.models import ResponseModel
from server.request import APIRequest

from .user_model import UserModel


class ListUsersResponseModel(ResponseModel):
    """Response model for listing users"""

    users: list[UserModel] = Field(..., title="List of users")


class ListUsersRequest(APIRequest):
    """Get a list of users"""

    name = "user_list"
    title = "Get user list"
    response_model = ListUsersResponseModel

    async def handle(self, user: CurrentUser) -> ListUsersResponseModel:
        if not user.is_admin:
            raise nebula.ForbiddenException("You are not allowed to list users")

        query = "SELECT meta FROM users ORDER BY login ASC"

        users = []
        async for row in nebula.db.iterate(query):
            meta = {}
            for key, value in row["meta"].items():
                if key == "api_key_preview":
                    continue
                if key == "api_key":
                    meta[key] = row["meta"].get("api_key_preview", "*****")
                elif key == "password":
                    continue
                elif key.startswith("can/"):
                    meta[key.replace("can/", "can_")] = value
                else:
                    meta[key] = value

            users.append(UserModel(**meta))

        return ListUsersResponseModel(users=users)

from pydantic import Field

import nebula
from server.dependencies import CurrentUser
from server.models import ResponseModel, UserModel
from server.request import APIRequest


class ListUsersResponseModel(ResponseModel):
    """Response model for listing users"""

    users: list[UserModel] = Field(..., title="List of users")


class ListUsersRequest(APIRequest):
    """Get a list of users"""

    name = "list-users"
    title = "Get user list"
    response_model = ListUsersResponseModel

    async def handle(self, user: CurrentUser) -> ListUsersResponseModel:
        if not user.is_admin:
            raise nebula.ForbiddenException("You are not allowed to list users")

        query = "SELECT meta FROM users ORDER BY login ASC"
        users = []
        async for row in nebula.db.iterate(query):
            users.append(UserModel.from_meta(row["meta"]))

        return ListUsersResponseModel(users=users)

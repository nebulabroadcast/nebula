from pydantic import Field

import nebula
from server import APIModel, APIRequest, UserModel
from server.dependencies import CurrentUser


class ListUsersResponse(APIModel):
    """Response model for listing users"""

    users: list[UserModel] = Field(..., title="List of users")


class ListUsers(APIRequest):
    """Get a list of users"""

    name = "list-users"
    title = "Get user list"
    category = "User management"

    async def handle(self, user: CurrentUser) -> ListUsersResponse:
        if not user.is_admin:
            raise nebula.ForbiddenException("You are not allowed to list users")

        query = "SELECT meta FROM users ORDER BY login ASC"
        users = [
            UserModel.from_meta(row["meta"]) async for row in nebula.db.iterate(query)
        ]

        return ListUsersResponse(users=users)

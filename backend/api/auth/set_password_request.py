from fastapi import Response
from pydantic import Field

import nebula
from server.dependencies import CurrentUser
from server.models import RequestModel
from server.request import APIRequest


class PasswordRequestModel(RequestModel):
    login: str | None = Field(None, title="Login", examples=["admin"])
    password: str = Field(..., title="Password", examples=["Password.123"])


class SetPasswordRequest(APIRequest):
    """Set a new password for the current (or a given) user.

    Normal users can only change their own password.

    In order to set a password for another user,
    the current user must be an admin, otherwise a 403 error is returned.
    """

    name = "password"
    title = "Set password"

    async def handle(
        self,
        request: PasswordRequestModel,
        user: CurrentUser,
    ) -> Response:
        if request.login:
            if not user.is_admin:
                raise nebula.ForbiddenException(
                    "Only admin can change other user's password"
                )
            query = "SELECT meta FROM users WHERE login = $1"
            async for row in nebula.db.iterate(query, request.login):
                target_user = nebula.User.from_row(row)
                break
            else:
                raise nebula.NotFoundException(f"User {request.login} not found")
        else:
            target_user = user

        if len(request.password) < 8:
            raise nebula.BadRequestException("Password is too short")

        target_user.set_password(request.password)
        await target_user.save()

        return Response(status_code=204)

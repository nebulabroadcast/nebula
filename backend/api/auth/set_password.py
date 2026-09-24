from typing import Annotated

from fastapi import Response
from pydantic import Field

import nebula
from server.dependencies import CurrentUser
from server.models import APIModel
from server.request import APIRequest


class SetPasswordRequest(APIModel):
    login: Annotated[
        str | None,
        Field(
            title="Login",
            examples=["admin"],
        ),
    ] = None

    password: Annotated[
        str,
        Field(
            title="Password",
            examples=["Password.123"],
        ),
    ]


class SetPassword(APIRequest):
    """Set a new password for the current (or a given) user.

    Normal users can only change their own password.

    In order to set a password for another user,
    the current user must be an admin, otherwise a 403 error is returned.
    """

    name = "password"
    title = "Set password"
    category = "Authentication"

    async def handle(
        self,
        request: SetPasswordRequest,
        user: CurrentUser,
    ) -> Response:
        if request.login:
            if not user.is_admin:
                raise nebula.ForbiddenException(
                    "Only admin can change other user's password"
                )
            query = "SELECT meta FROM users WHERE login = $1"
            row = await nebula.db.fetchrow(query, request.login)
            if not row:
                raise nebula.NotFoundException(f"User {request.login} not found")
            target_user = nebula.User.from_row(row)
        else:
            target_user = user

        if len(request.password) < 8:
            raise nebula.BadRequestException("Password is too short")

        target_user.set_password(request.password)
        await target_user.save()

        return Response(status_code=204)

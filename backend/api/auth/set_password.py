from typing import Annotated

from fastapi import Request, Response
from pydantic import Field

import nebula
from nebula.objects.user import WrongPasswordException
from server.dependencies import CurrentUser
from server.login_attempts import check_failed_login, set_failed_login
from server.models import APIModel
from server.request import APIRequest
from server.session import Session
from server.utils import get_real_ip


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

    current_password: Annotated[
        str | None,
        Field(
            title="Current password",
            description="Required when users change their own password, "
            "unless they have none yet",
        ),
    ] = None


class SetPassword(APIRequest):
    """Set a new password for the current (or a given) user.

    Normal users can only change their own password.

    In order to set a password for another user,
    the current user must be an admin, otherwise a 403 error is returned.

    Deprecated: use `POST /api/v2/users/{user_id}/password`.
    """

    name = "password"
    deprecated = True
    title = "Set password"
    category = "Authentication"

    async def handle(
        self,
        request: SetPasswordRequest,
        user: CurrentUser,
        http_request: Request,
    ) -> Response:
        ip_address = get_real_ip(http_request)
        await check_failed_login(ip_address)
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
            # The session's user has no password hash or API key to save back
            assert user.id is not None, "Logged-in user without id"
            target_user = await nebula.User.load(user.id)

        try:
            await target_user.change_password(
                request.password, request.current_password
            )
        except WrongPasswordException:
            await set_failed_login(ip_address)
            raise
        await target_user.save()
        await Session.revoke_user(target_user.id)

        return Response(status_code=204)

from fastapi import Depends, Header, Response, Request
from pydantic import Field

import nebula
from server.dependencies import current_user
from server.models import RequestModel, ResponseModel
from server.request import APIRequest
from server.session import Session
from server.utils import parse_access_token

#
# Models
#


class LoginRequestModel(RequestModel):
    username: str = Field(
        ...,
        title="Username",
        example="admin",
        regex=r"^[a-zA-Z0-9_\-\.]{3,}$",
    )
    password: str = Field(
        ...,
        title="Password",
        description="Password in plain text",
        example="Password.123",
    )


class LoginResponseModel(ResponseModel):
    access_token: str = Field(
        ...,
        title="Access token",
        description="Access token to be used in Authorization header"
        "for the subsequent requests",
    )


class PasswordRequestModel(RequestModel):
    login: str | None = Field(None, title="Login", example="admin")
    password: str = Field(..., title="Password", example="Password.123")


#
# Request
#


class LoginRequest(APIRequest):
    """Login using a username and password"""

    name: str = "login"
    response_model = LoginResponseModel

    async def handle(
        self,
        request: Request,
        payload: LoginRequestModel,
    ) -> LoginResponseModel:
        user = await nebula.User.login(payload.username, payload.password)
        session = await Session.create(user, request)
        return LoginResponseModel(access_token=session.token)


class LogoutRequest(APIRequest):
    """Log out the current user"""

    name: str = "logout"
    title: str = "Logout"

    async def handle(self, authorization: str | None = Header(None)):
        if not authorization:
            raise nebula.UnauthorizedException("No authorization header provided")

        access_token = parse_access_token(authorization)
        if not access_token:
            raise nebula.UnauthorizedException("Invalid authorization header provided")

        await Session.delete(access_token)

        raise nebula.UnauthorizedException("Logged out")


class SetPassword(APIRequest):
    """Set a new password for the current (or a given) user.

    In order to set a password for another user, the current user must be an admin.
    """

    name: str = "password"
    title: str = "Set password"

    async def handle(
        self,
        request: PasswordRequestModel,
        user: nebula.User = Depends(current_user),
    ):
        if request.login:
            if not user.is_admin:
                raise nebula.UnauthorizedException(
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

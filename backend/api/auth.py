from fastapi import Header
from pydantic import Field

import nebula
from nebula.exceptions import UnauthorizedException
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


#
# Request
#


class LoginRequest(APIRequest):
    """Login using a username and password"""

    name: str = "login"
    response_model = LoginResponseModel

    async def handle(self, request: LoginRequestModel) -> LoginResponseModel:
        user = await nebula.User.login(request.username, request.password)
        session = await Session.create(user)
        return LoginResponseModel(access_token=session.token)


class LogoutRequest(APIRequest):
    """Log out the current user"""

    name: str = "logout"
    title: str = "Logout"

    async def handle(self, authorization: str | None = Header(None)):
        if not authorization:
            raise UnauthorizedException("No authorization header provided")

        access_token = parse_access_token(authorization)
        if not access_token:
            raise UnauthorizedException("Invalid authorization header provided")

        await Session.delete(access_token)

        raise UnauthorizedException("Logged out")

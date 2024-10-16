from fastapi import Header

import nebula
from server.request import APIRequest
from server.session import Session
from server.utils import parse_access_token


class LogoutRequest(APIRequest):
    """Log out the current user.

    This request will invalidate the access token used in the Authorization header.
    """

    name = "logout"
    title = "Logout"

    async def handle(self, authorization: str | None = Header(None)) -> None:
        if not authorization:
            raise nebula.UnauthorizedException("No authorization header provided")

        access_token = parse_access_token(authorization)
        if not access_token:
            raise nebula.UnauthorizedException("Invalid authorization header provided")

        await Session.delete(access_token)

        raise nebula.UnauthorizedException("Logged out")

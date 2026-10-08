from fastapi import Header, Request

import nebula
from server.auth_cookie import clear_auth_cookie, token_from_cookie
from server.request import APIRequest
from server.session import Session
from server.utils import parse_access_token


class Logout(APIRequest):
    """Log out the current user.

    This request will invalidate the access token used in the Authorization
    header and/or the auth cookie, and remove the cookie from the client.
    """

    name = "logout"
    title = "Logout"
    category = "Authentication"

    async def handle(
        self,
        request: Request,
        authorization: str | None = Header(None),
    ) -> None:
        # token_from_cookie rejects cross-site requests before anything is cleared
        candidates = [
            parse_access_token(authorization) if authorization else None,
            token_from_cookie(request),
        ]
        tokens = {token for token in candidates if token}

        clear_auth_cookie(request)
        if not tokens:
            raise nebula.UnauthorizedException("No access token provided")

        for access_token in tokens:
            await Session.delete(access_token)

        raise nebula.UnauthorizedException("Logged out")

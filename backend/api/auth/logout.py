from fastapi import Request

import nebula
from server.auth_cookie import clear_auth_cookie, token_from_cookie
from server.middleware.context import access_token_from_request
from server.request import APIRequest
from server.session import Session


class Logout(APIRequest):
    """Log out the current user.

    Invalidates the access token (Authorization header or `token` query
    parameter) and the session of the auth cookie, and removes the cookie
    from the client.
    The cookie's session is kept when the request comes from another site.
    """

    name = "logout"
    title = "Logout"
    category = "Authentication"

    async def handle(self, request: Request) -> None:
        # As for any request, an explicit token decides: an invalid one is
        # rejected without touching the cookie's session
        token = access_token_from_request(request)
        if token and await Session.check(token, request, transient=True) is None:
            raise nebula.UnauthorizedException("Invalid access token")

        try:
            cookie_token = token_from_cookie(request)
        except nebula.UnauthorizedException:
            if not token:
                raise  # another site, cookie only: nothing to log out
            cookie_token = None  # another site: log out the token only

        if not token and not cookie_token:
            raise nebula.UnauthorizedException("No access token provided")
        if token:
            await Session.delete(token)
        if cookie_token:
            await Session.delete(cookie_token)
            clear_auth_cookie(request)
        raise nebula.UnauthorizedException("Logged out")

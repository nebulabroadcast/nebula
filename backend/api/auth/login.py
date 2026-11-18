from fastapi import Request

import nebula
from server.auth_cookie import set_auth_cookie
from server.login_attempts import (
    check_failed_login,
    clear_failed_login,
    set_failed_login,
)
from server.models.login import LoginRequest, LoginResponse
from server.request import APIRequest
from server.session import Session
from server.utils import get_real_ip


class Login(APIRequest):
    """Login using a username and password

    This request will return an access token that can be used in the
    Authorization header for the subsequent requests.
    If the login fails, request will return 401 Unauthorized.

    If the login fails too many (configurable) times,
    the IP address will be banned for a certain amount of time (configurable).
    """

    name = "login"
    title = "Login"
    category = "Authentication"

    async def handle(self, request: Request, payload: LoginRequest) -> LoginResponse:
        if request is not None:
            await check_failed_login(get_real_ip(request))

        try:
            user = await nebula.User.login(payload.username, payload.password)
        except nebula.LoginFailedException:
            if request is not None:
                await set_failed_login(get_real_ip(request))
            # re-raise the exception
            raise

        if request is not None:
            await clear_failed_login(get_real_ip(request))

        session = await Session.create(user, request)
        set_auth_cookie(request, session.token)
        return LoginResponse(access_token=session.token)

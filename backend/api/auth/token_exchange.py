from fastapi import Request

import nebula
from server.models.login import LoginResponse, TokenExchangeRequest
from server.request import APIRequest
from server.session import Session


class TokenExchange(APIRequest):
    """Exchange a transient access token for a normal one

    This request will exchange an access token for a new one.
    The original access token will be invalidated.
    """

    name = "token-exchange"
    title = "Token exchange"
    category = "Authentication"

    async def handle(
        self,
        request: Request,
        payload: TokenExchangeRequest,
    ) -> LoginResponse:
        session = await Session.check(payload.access_token, request, transient=True)
        if not session:
            raise nebula.UnauthorizedException("Invalid token")
        user_id = session.user["id"]
        user = await nebula.User.load(user_id)
        session = await Session.create(user, request)
        nebula.log.debug(f"{user} token exchanged")
        await Session.delete(payload.access_token)
        return LoginResponse(access_token=session.token)

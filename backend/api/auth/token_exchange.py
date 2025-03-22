from fastapi import Request

import nebula
from server.models.login import LoginResponseModel, TokenExchangeRequestModel
from server.request import APIRequest
from server.session import Session


class TokenExchangeRequest(APIRequest):
    name: str = "token-exchange"
    response_model = LoginResponseModel

    async def handle(
        self,
        request: Request,
        payload: TokenExchangeRequestModel,
    ) -> LoginResponseModel:
        session = await Session.check(payload.access_token, request)
        if not session:
            raise nebula.UnauthorizedException("Invalid token")
        user_id = session.user["id"]
        user = await nebula.User.load(user_id)
        new_session = await Session.create(user, None)
        nebula.log.debug(f"{user} token exchanged")
        await Session.delete(payload.access_token)
        session = await Session.create(user, request)
        return LoginResponseModel(access_token=new_session.token)


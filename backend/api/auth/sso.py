from authlib.integrations.starlette_client import OAuthError
from fastapi import Request
from fastapi.responses import RedirectResponse

import nebula
from server.request import APIRequest
from server.session import Session
from server.sso import NebulaSSO


class SSOLoginRequest(APIRequest):
    name = "sso_login"
    path = "/api/sso/login/{provider}"
    response_model = RedirectResponse
    methods = ["GET"]

    async def handle(self, request: Request, provider: str) -> RedirectResponse:

        oauth = NebulaSSO.get_oauth()

        redirect_uri = request.url_for("sso_callback", provider=provider)
        return await oauth.google.authorize_redirect(request, redirect_uri)


class SSOLoginCallback(APIRequest):
    name = "sso_callback"
    path = "/api/sso/callback/{provider}"
    methods = ["GET"]
    response_model = RedirectResponse

    async def handle(self, request: Request, provider: str) -> RedirectResponse:

        oauth = NebulaSSO.get_oauth()

        try:
            token = await oauth.google.authorize_access_token(request)
        except OAuthError as error:
            return f"<h1>{error.error}</h1>"
        user = token.get("userinfo", {})
        email = user.get("email")

        if not email:
            return "user email not found"

        user = await nebula.User.by_email(email)
        session = await Session.create(user, request)
        return RedirectResponse(f"/?authorize={session.token}")

from urllib.parse import urlparse

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

        referer = request.headers.get("referer")
        if referer:
            parsed_url = urlparse(referer)
            base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
        else:
            base_url = "http://localhost:4455"

        # We cannot use request.url_for here because it screws the frontend
        # dev server proxy

        redirect_uri = f"{base_url}/api/sso/callback/{provider}"
        nebula.log.debug(f"Redirect URI: {redirect_uri}")
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

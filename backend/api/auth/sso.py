from urllib.parse import urlparse

from fastapi import Request
from fastapi.responses import RedirectResponse

import nebula
from server.request import APIRequest
from server.session import Session
from server.sso import NebulaSSO


class SSOLoginRequest(APIRequest):
    name = "sso_login"
    path = "/api/sso/login/{provider}"
    methods = ["GET"]

    async def handle(self, request: Request, provider: str) -> RedirectResponse:
        client = NebulaSSO.client(provider)

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
        return await client.authorize_redirect(request, redirect_uri)


class SSOLoginCallback(APIRequest):
    name = "sso_callback"
    path = "/api/sso/callback/{provider}"
    methods = ["GET"]

    async def handle(self, request: Request, provider: str) -> RedirectResponse:
        remote = NebulaSSO.client(provider)
        if not remote:
            return RedirectResponse("/?error=Invalid provider")

        code = request.query_params.get("code")
        id_token = request.query_params.get("id_token")
        oauth_verifier = request.query_params.get("oauth_verifier")

        user_info = {}

        if code:
            token = await remote.authorize_access_token(request)
            user_info = token.get("userinfo", {})

        if id_token and not user_info:
            token = {"id_token": id_token}
            user_info = await remote.parse_id_token(request, token)

        if oauth_verifier and not user_info:
            token = await remote.authorize_access_token(request)

        if token and not user_info:
            user_info = await remote.userinfo(token=token)

        if not user_info:
            return RedirectResponse("/?error=Invalid response from provider")

        email = user_info.get("email")

        if not email:
            return RedirectResponse("/?error=User email not found")

        try:
            user = await nebula.User.by_email(email)
        except nebula.NotFoundException:
            return RedirectResponse("/?error=User not found")
        session = await Session.create(user, request, transient=True)
        return RedirectResponse(f"/?authorize={session.token}")

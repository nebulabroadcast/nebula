from typing import cast

from authlib.common.errors import AuthlibBaseError
from fastapi import Request
from fastapi.responses import RedirectResponse

import nebula
from server.request import APIRequest
from server.session import Session
from server.sso import NebulaSSO
from server.utils import server_url_from_request


class SSOLogin(APIRequest):
    """Redirect the user to the SSO provider's login page"""

    name = "sso-login"
    title = "SSO Login"
    path = "/api/sso/login/{provider}"
    methods = ["GET"]
    category = "Authentication"

    async def handle(self, request: Request, provider: str) -> RedirectResponse:
        client = NebulaSSO.client(provider)

        # Not request.url_for: it breaks behind the frontend dev server proxy
        base_url = server_url_from_request(request)
        redirect_uri = f"{base_url}/api/sso/callback/{provider}"
        nebula.log.debug(f"Redirect URI: {redirect_uri}")
        return await client.authorize_redirect(request, redirect_uri)  # type: ignore[no-any-return]


class SSOLoginCallback(APIRequest):
    """Handle the callback from the SSO provider and log in the user"""

    name = "sso-callback"
    title = "SSO login callback"
    path = "/api/sso/callback/{provider}"
    methods = ["GET"]
    category = "Authentication"

    async def handle(self, request: Request, provider: str) -> RedirectResponse:  # noqa: C901, PLR0911
        remote = NebulaSSO.client(provider)
        if not remote:
            return RedirectResponse("/?error=Invalid provider")

        code = request.query_params.get("code")
        id_token = request.query_params.get("id_token")
        oauth_verifier = request.query_params.get("oauth_verifier")

        user_info = {}
        # None when the provider sends none of them (e.g. ?error=access_denied
        # after the user cancels)
        token = None

        try:
            if code:
                token = await remote.authorize_access_token(request)  # type: ignore[no-untyped-call]
                user_info = token.get("userinfo", {})

            if id_token and not user_info:
                token = {"id_token": id_token}
                user_info = await remote.parse_id_token(request, token)

            if oauth_verifier and not user_info:
                token = await remote.authorize_access_token(request)  # type: ignore[no-untyped-call]

            if token and not user_info:
                user_info = await remote.userinfo(token=token)
        except AuthlibBaseError as e:
            # Mismatching state, expired code, invalid id_token...
            nebula.log.warning(f"SSO login with {provider} failed: {e}")
            return RedirectResponse("/?error=Login failed")

        if not user_info:
            return RedirectResponse("/?error=Invalid response from provider")

        email = cast("str", user_info.get("email"))

        if not email:
            return RedirectResponse("/?error=User email not found")

        # Absent (GitHub) is fine; some providers send it as a string
        if user_info.get("email_verified") in (False, "false"):
            return RedirectResponse("/?error=Email not verified")

        try:
            user = await nebula.User.by_email(email)
        except nebula.NotFoundException:
            return RedirectResponse("/?error=User not found")
        session = await Session.create(user, request, transient=True)
        return RedirectResponse(f"/?authorize={session.token}")

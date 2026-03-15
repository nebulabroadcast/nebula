import functools
import os
from typing import cast, get_args

import fastapi

import nebula
from nebula.plugins.frontend import get_frontend_plugins
from nebula.settings import load_settings
from nebula.settings.common import LanguageCode
from server import APIRequest, UserModel
from server.context import server_context
from server.dependencies import CurrentUserOptional
from server.sso import NebulaSSO

from ._client_settings import get_client_settings
from ._models import ServerInfoResponse


@functools.cache
def is_login_background_enabled() -> bool:
    img_path = f"/mnt/{nebula.config.site_name}_01/.nx/login-background.jpg"
    return os.path.isfile(img_path)


class GetServerInfo(APIRequest):
    """Initial client request to ensure user is logged in.

    If a valid access token is provided, user information
    and Nebula settings are returned. If no access token is
    provided, only the message of the day and OAuth2 options
    are returned.
    """

    name = "init"
    title = "Get server info"
    category = "System"

    async def handle(
        self,
        request: fastapi.Request,
        user: CurrentUserOptional,
    ) -> ServerInfoResponse:
        default_motd = f"Nebula {nebula.__version__} @ {nebula.config.site_name}"
        motd = nebula.config.motd or default_motd

        # Nebula is not installed. Frontend should display
        # an error message or redirect to the installation page.
        if not nebula.settings.installed:
            await load_settings()
            if not nebula.settings.installed:
                return ServerInfoResponse(installed=False)

        # Not logged in. Only return motd and oauth2 options.
        if user is None:
            sso_options = await NebulaSSO.options() or None
            return ServerInfoResponse(
                motd=motd,
                sso_options=sso_options,
                experimental=nebula.config.enable_experimental or None,
                background=is_login_background_enabled(),
            )

        # User preferred language

        lang: LanguageCode = "en"
        accept_language = request.headers.get("Accept-Language", "en")
        preferred_language = accept_language.split(",")[0].strip().lower()
        if len(preferred_language) > 2:
            preferred_language = preferred_language[:2]
        if preferred_language in get_args(LanguageCode):
            lang = cast("LanguageCode", user.meta.get("language")) or preferred_language

        # Construct client settings

        client_settings = await get_client_settings(lang)
        client_settings.server_url = f"{request.url.scheme}://{request.url.netloc}"
        plugins = get_frontend_plugins()

        # Return response

        return ServerInfoResponse(
            installed=True,
            motd=motd,
            user=UserModel.from_meta(user.meta),
            settings=client_settings,
            frontend_plugins=plugins,
            scoped_endpoints=server_context.scoped_endpoints,
            experimental=nebula.config.enable_experimental or None,
        )

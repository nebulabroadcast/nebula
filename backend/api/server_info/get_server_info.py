import functools
import os

import fastapi

import nebula
from nebula.plugins.frontend import get_frontend_plugins
from nebula.settings import load_settings
from server import APIRequest, UserModel
from server.client_settings import get_user_client_settings
from server.context import server_context
from server.dependencies import CurrentUserOptional
from server.sso import NebulaSSO

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

        client_settings = await get_user_client_settings(request, user)
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

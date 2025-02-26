from typing import Annotated, Any, get_args

import fastapi
from pydantic import Field

import nebula
from nebula.plugins.frontend import PluginItemModel, get_frontend_plugins
from nebula.settings import load_settings
from nebula.settings.common import LanguageCode
from server.context import ScopedEndpoint, server_context
from server.dependencies import CurrentUserOptional
from server.models import ResponseModel, UserModel
from server.request import APIRequest

from .client_settings import ClientSettingsModel, get_client_settings


class InitResponseModel(ResponseModel):
    installed: Annotated[
        bool | None,
        Field(
            title="Installed",
            description="Is Nebula installed?",
        ),
    ] = True

    motd: Annotated[
        str | None,
        Field(
            title="Message of the day",
            description="Server welcome string (displayed on login page)",
        ),
    ] = None

    user: Annotated[
        UserModel | None,
        Field(
            title="Current user",
            description="User data if user is logged in",
        ),
    ] = None

    settings: Annotated[
        ClientSettingsModel | None,
        Field(
            title="Client settings",
        ),
    ] = None

    frontend_plugins: Annotated[
        list[PluginItemModel] | None,
        Field(
            title="Frontend plugins",
            description="List of plugins available for the web frontend",
        ),
    ] = None

    scoped_endpoints: Annotated[
        list[ScopedEndpoint] | None,
        Field(
            title="Scoped endpoints",
            description="List of available scoped endpoints",
        ),
    ] = None

    oauth2_options: Annotated[
        list[dict[str, Any]] | None,
        Field(
            title="OAuth2 options",
        ),
    ] = None

    experimental: Annotated[
        bool | None, Field(title="Enable experimental features")
    ] = None


class InitRequest(APIRequest):
    """Initial client request to ensure user is logged in.

    If a valid access token is provided, user information
    and Nebula settings are returned. If no access token is
    provided, only the message of the day and OAuth2 options
    are returned.
    """

    name = "init"
    title = "Init"
    response_model = InitResponseModel

    async def handle(
        self,
        request: fastapi.Request,
        user: CurrentUserOptional,
    ) -> InitResponseModel:
        default_motd = f"Nebula {nebula.__version__} @ {nebula.config.site_name}"
        motd = nebula.config.motd or default_motd

        # Nebula is not installed. Frontend should display
        # an error message or redirect to the installation page.
        if not nebula.settings.installed:
            await load_settings()
            if not nebula.settings.installed:
                return InitResponseModel(installed=False)

        # Not logged in. Only return motd and oauth2 options.
        # TODO: return oauth2 options
        if user is None:
            return InitResponseModel(
                motd=motd,
                experimental=nebula.config.enable_experimental or None,
            )

        # User preferred language

        lang: LanguageCode = "en"
        accept_language = request.headers.get("Accept-Language", "en")
        preferred_language = accept_language.split(",")[0].strip().lower()
        if len(preferred_language) > 2:
            preferred_language = preferred_language[:2]
        if preferred_language in get_args(LanguageCode):
            lang = user.meta.get("language") or preferred_language  # type: ignore

        # Construct client settings

        client_settings = await get_client_settings(lang)
        client_settings.server_url = f"{request.url.scheme}://{request.url.netloc}"
        plugins = get_frontend_plugins()

        # Return response

        return InitResponseModel(
            installed=True,
            motd=motd,
            user=UserModel.from_meta(user.meta),
            settings=client_settings,
            frontend_plugins=plugins,
            scoped_endpoints=server_context.scoped_endpoints,
            experimental=nebula.config.enable_experimental or None,
        )

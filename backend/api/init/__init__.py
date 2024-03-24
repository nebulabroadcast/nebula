from typing import Any, Literal

import fastapi
from pydantic import Field

import nebula
from nebula.plugins.frontend import PluginItemModel, get_frontend_plugins
from nebula.settings import load_settings
from nebula.settings.common import LanguageCode
from server.context import ScopedEndpoint, server_context
from server.dependencies import CurrentUserOptional
from server.models import ResponseModel
from server.request import APIRequest

from .settings import ClientSettingsModel, get_client_settings


class InitResponseModel(ResponseModel):
    installed: Literal[True] | None = Field(
        True,
        title="Installed",
        description="Is Nebula installed?",
    )

    motd: str | None = Field(
        None,
        title="Message of the day",
        description="Server welcome string (displayed on login page)",
    )

    user: dict[str, Any] | None = Field(
        None,
        title="User data",
        description="User data if user is logged in",
    )

    settings: ClientSettingsModel | None = Field(
        None,
        title="Client settings",
    )

    frontend_plugins: list[PluginItemModel] = Field(
        default_factory=list,
        title="Frontend plugins",
        description="List of plugins available for the web frontend",
    )

    scoped_endpoints: list[ScopedEndpoint] = Field(default_factory=list)

    oauth2_options: list[dict[str, Any]] = Field(
        default_factory=list,
        title="OAuth2 options",
    )


class Request(APIRequest):
    """Initial client request to ensure user is logged in.

    If a valid access token is provided, user data is returned,
    in the result.

    Additionally (regadless the authorization), a message of the day
    (motd) and OAuth2 options are returned.
    """

    name: str = "init"
    title: str = "Login"
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
        if user is None:
            return InitResponseModel(motd=motd)

        # TODO: get preferred user language
        lang: LanguageCode = user.language

        # Construct client settings
        client_settings = await get_client_settings(lang)
        client_settings.server_url = f"{request.url.scheme}://{request.url.netloc}"
        plugins = get_frontend_plugins()

        return InitResponseModel(
            installed=True,
            motd=motd,
            user=user.meta,
            settings=client_settings,
            frontend_plugins=plugins,
            scoped_endpoints=server_context.scoped_endpoints,
        )

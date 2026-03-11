from typing import Annotated

from pydantic import Field

from nebula.plugins.frontend import PluginItemModel
from server import APIModel, UserModel
from server.context import ScopedEndpoint
from server.sso import SSOOption

from ._client_settings import ClientSettingsModel


class ServerInfoResponse(APIModel):
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

    background: Annotated[
        bool,
        Field(
            title="Background",
            description="Is the login background image enabled?",
        ),
    ] = False

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

    sso_options: Annotated[
        list[SSOOption] | None,
        Field(
            title="SSO options",
        ),
    ] = None

    experimental: Annotated[
        bool | None, Field(title="Enable experimental features")
    ] = None

    is_login_background_enabled: Annotated[
        bool | None,
        Field(
            title="Is login background enabled",
            description="Whether the login background image is enabled",
        ),
    ] = None

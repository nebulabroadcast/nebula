from typing import Any

from pydantic import Field

import nebula
from nebula.enum import ContentType
from nebula.filetypes import FileTypes
from nebula.settings.common import LanguageCode, SettingsModel
from nebula.settings.models import (
    BasePlayoutChannelSettings,
    BaseSystemSettings,
    CSItemRole,
    FolderSettings,
    ViewSettings,
)

# Meta types and CS models slightly differs from the server ones
# The main difference is that the client models does not contain
# different aliases for different languages (only the language
# preferred by the user is used).

# Additionally, metatype.type is a string, not an Enum


class ClientMetaTypeModel(SettingsModel):
    ns: str = Field(
        "m",
        title="Namespace",
    )
    type: str = Field(
        "string",
        title="Type",
        description="Type of the value",
    )
    title: str = Field(
        title="Title",
        description="Title of the field",
    )
    header: str | None = Field(
        None,
        title="Header",
        description="Shortened title used as a column header",
    )
    description: str | None
    cs: str | None = Field(
        None,
        title="Classification scheme",
        description="Classification scheme URN",
    )
    mode: str | None = Field(
        None,
        title="Mode",
        description="Mode / widget of the field",
    )
    format: str | None = Field(
        None,
        title="Format",
        description="Format of the field",
    )
    order: str | None = Field(
        None,
        title="Order",
        description="Order of values in lists",
    )
    filter: str | None = Field(
        None,
        title="Filter",
        description="Filter for values in lists",
    )
    default: Any | None = Field(None, title="Default value")


#
# Classifications
#


class ClientCSItemModel(SettingsModel):
    title: str
    description: str | None = Field(None)
    role: CSItemRole | None = Field(None)


ClientCSModel = dict[str, ClientCSItemModel]


class UserInfo(SettingsModel):
    id: int
    name: str
    full_name: str | None = Field(None)


#
# Client settings model
#


class ClientSettingsModel(SettingsModel):
    """Client settings.

    This model is returned by the server to the client in the
    /api/init request along with the current user information.
    """

    system: BaseSystemSettings = Field(default_factory=BaseSystemSettings)
    folders: list[FolderSettings] = Field(default_factory=list)
    views: list[ViewSettings] = Field(default_factory=list)
    users: list[UserInfo] = Field(default_factory=list)
    metatypes: dict[str, ClientMetaTypeModel] = Field(default_factory=dict)
    cs: dict[str, ClientCSModel] = Field(default_factory=dict)
    playout_channels: list[BasePlayoutChannelSettings] = Field(default_factory=list)
    filetypes: dict[str, ContentType] = Field(default_factory=dict)
    server_url: str | None = Field(None, title="Server URL")


#
# Server -> Client settings conversion
#


async def get_client_settings(lang: LanguageCode) -> ClientSettingsModel:
    """Convert server settings to client settings."""
    #
    # Users
    #

    users = []
    async for row in nebula.db.iterate("SELECT meta FROM users"):
        meta = row["meta"]
        users.append(
            UserInfo(
                id=meta["id"],
                name=meta["login"],
                full_name=meta.get("full_name", meta["login"]),
            )
        )

    #
    # Classification schemes
    #

    client_cs = {}
    for urn, cs in nebula.settings.cs.items():
        csdata = {}
        for value, csitem in cs.items():
            als = csitem.aliases.get(lang, csitem.aliases.get("en"))
            if als:
                csdata[value] = ClientCSItemModel(
                    title=als.title,
                    description=als.description,
                    role=csitem.role,
                )
            else:
                csdata[value] = ClientCSItemModel(
                    title=value,
                    role=csitem.role,
                    description=None,
                )
        client_cs[urn] = csdata

    #
    # Meta types
    #

    client_metatypes = {}
    for k, v in nebula.settings.metatypes.items():
        if mals := v.aliases.get(lang, v.aliases.get("en")):
            title = mals.title
            header = mals.header
            description = mals.description
        else:
            title = k
            header = None
            description = None

        client_metatypes[k] = ClientMetaTypeModel(
            ns=v.ns,
            type=v.metaclass.name.lower(),
            title=title,
            header=header,
            description=description,
            cs=v.cs,
            mode=v.mode,
            format=v.format,
            order=v.order,
            filter=v.filter,
            default=v.default,
        )

    #
    # FileTypes
    #

    filetypes: dict[str, ContentType] = FileTypes.data

    #
    # Construct the client settings
    #

    return ClientSettingsModel(
        system=BaseSystemSettings(**nebula.settings.system.model_dump()),
        playout_channels=[
            BasePlayoutChannelSettings(**r.model_dump())
            for r in nebula.settings.playout_channels
        ],
        folders=nebula.settings.folders,
        views=nebula.settings.views,
        cs=client_cs,
        metatypes=client_metatypes,
        users=users,
        filetypes=filetypes,
        server_url=None,
    )

from typing import Annotated, Any, Literal, TypeVar

from pydantic import AfterValidator, BeforeValidator, Field

from nebula.config import config
from nebula.enum import ContentType, MediaType, ServiceState
from nebula.settings.common import LanguageCode, SettingsModel
from nebula.settings.metatypes import MetaType

CSItemRole = Literal["hidden", "header", "label", "option"]


class CSAlias(SettingsModel):
    title: Annotated[
        str,
        Field(
            title="Option title",
        ),
    ]
    description: Annotated[
        str | None,
        Field(
            title="Option description",
            description="Describes the classification value. Displayed as a tooltip",
        ),
    ] = None


class CSItemModel(SettingsModel):
    role: Annotated[
        CSItemRole | None,
        Field(
            title="Special item role",
        ),
    ] = None
    aliases: Annotated[
        dict[str, CSAlias],
        Field(
            title="Classification option value localization",
            default_factory=dict,
        ),
    ]

    @classmethod
    def from_settings(cls, value: str, settings: dict[str, Any]) -> "CSItemModel":
        aliases = {}
        adef: dict[str, str] = settings.get("aliases", {})
        ddef: dict[str, str] = settings.get("description", {})

        for lang in adef:
            aliases[lang] = CSAlias(
                title=adef[lang],
                description=ddef.get(lang),
            )

        # If no alias is defined, use the value as an alias
        if not aliases:
            aliases["en"] = CSAlias(title=value, description="")

        return cls(role=settings.get("role"), aliases=aliases)


CSModel = dict[str, CSItemModel]


#
# System settings.
#


class BaseSystemSettings(SettingsModel):
    """Base system settings.

    Contains settings that are common for server and client.
    Not all settings are used by the client.
    """

    site_name: Annotated[
        str,
        Field(
            default=config.site_name,
            pattern=r"^[a-zA-Z0-9_]+$",
            title="Site name",
            description="A name used as the site (instance) identification",
        ),
    ]

    language: Annotated[
        LanguageCode,
        Field(
            default="en",
            title="Default language",
            examples=["en", "cs"],
        ),
    ]

    ui_asset_create: Annotated[
        bool,
        Field(
            title="Create assets in UI",
            description="Allow creating assets in the UI"
            "(when set to false, assets can only be created via API and watch folders)",
        ),
    ] = True

    ui_asset_preview: Annotated[
        bool,
        Field(
            title="Preview assets in UI",
            description="Allow previewing low-res proxies of assets in the UI",
        ),
    ] = True

    ui_asset_upload: Annotated[
        bool,
        Field(
            title="Upload assets in UI",
            description="Allow uploading asset media files in the UI "
            "(when set to false, assets can  be uploaded via API and watch folders)",
        ),
    ] = True

    subtitle_separator: Annotated[
        str,
        Field(
            title="Subtitle separator",
            description="String used to separate title and subtitle in displayed title",
        ),
    ] = ": "


class SSOProvider(SettingsModel):
    name: Annotated[
        str,
        Field(
            title="Name",
            examples=["myoauth"],
        ),
    ]

    title: Annotated[
        str,
        Field(
            title="Title",
            description="Used on the SSO button on the login page",
            examples=["Log in using MyOauth"],
        ),
    ]

    profile: Annotated[
        Literal["google", "github"] | None,
        Field(
            title="Profile",
            description="Configuration preset if entrypoint is not provided",
        ),
    ] = None

    entrypoint: Annotated[
        str | None,
        Field(
            title="Entrypoint",
            description="URL to the SSO provider configuration endpoint",
            examples=[
                "https://iam.example.com/realms/nebula/.well-known/openid-configuration"
            ],
        ),
    ] = None

    client_id: Annotated[
        str,
        Field(
            title="Client ID",
            examples=["myclientid"],
        ),
    ]

    client_secret: Annotated[
        str,
        Field(
            title="Client secret",
            examples=["myclientsecret"],
        ),
    ]


class SystemSettings(BaseSystemSettings):
    """System settings.

    Expanded version of the base system settings.
    Contains settings that are used only by the server.
    """

    proxy_storage: Annotated[
        int,
        Field(
            title="Proxy storage",
            examples=[1],
        ),
    ] = 1

    proxy_path: Annotated[
        str,
        Field(
            title="Proxy path",
        ),
    ] = ".nx/proxy/{id1000:04d}/{id}.mp4"

    worker_plugin_storage: Annotated[
        int,
        Field(
            title="Worker plugin storage",
        ),
    ] = 1

    worker_plugin_path: Annotated[
        str,
        Field(
            title="Worker plugin path",
        ),
    ] = ".nx/plugins"

    upload_storage: Annotated[
        int | None,
        Field(
            title="Upload storage",
        ),
    ] = None

    upload_dir: Annotated[
        str | None,
        Field(
            title="Upload directory",
        ),
    ] = None

    upload_base_name: Annotated[
        str,
        Field(
            title="Upload base name",
        ),
    ] = "{id}"

    sso_providers: Annotated[
        list[SSOProvider],
        Field(
            title="List of SSO providers",
            default_factory=list,
        ),
    ]

    smtp_host: Annotated[
        str | None,
        Field(
            title="SMTP host",
            examples=["smtp.example.com"],
        ),
    ] = None

    smtp_port: Annotated[
        int | None,
        Field(
            title="SMTP port",
            examples=[465],
        ),
    ] = None

    smtp_user: Annotated[
        str | None,
        Field(
            title="SMTP user",
            examples=["smtpuser"],
        ),
    ] = None

    smtp_pass: Annotated[
        str | None,
        Field(
            title="SMTP password",
            examples=["smtppass.1"],
        ),
    ] = None

    smtp_tls: Annotated[
        bool,
        Field(
            title="SMTP TLS",
            description="Use TLS for SMTP connection",
        ),
    ] = True

    mail_from: Annotated[
        str | None,
        Field(
            default=None,
            title="Mail from",
            description="Email address used as the sender",
            examples=["Nebula <noreply@example.com>"],
        ),
    ] = None


class BaseListItemModel(SettingsModel):
    id: Annotated[
        int,
        Field(
            title="ID",
            examples=[1],
        ),
    ]

    name: Annotated[
        str,
        Field(
            title="Name",
            examples=["Name"],
        ),
    ]


#
# Action settings
#


class BaseActionSettings(BaseListItemModel):
    type: Annotated[
        str,
        Field(
            title="Action type",
            examples=["conv"],
        ),
    ]


class ActionSettings(BaseActionSettings):
    settings: Annotated[
        str,
        Field(
            title="Action settings",
        ),
    ] = "<action/>"


#
# Service settings
#


class BaseServiceSettings(BaseListItemModel):
    type: Annotated[
        str,
        Field(
            title="Service type",
            examples=["conv"],
        ),
    ]

    host: Annotated[
        str,
        Field(
            title="Host",
            examples=["node01"],
        ),
    ]

    autostart: Annotated[
        bool,
        Field(
            title="Autostart",
            examples=[True],
        ),
    ] = True

    loop_delay: Annotated[
        int,
        Field(
            title="Loop delay",
            description="Seconds of sleep between runs",
        ),
    ] = 5

    state: Annotated[
        ServiceState,
        Field(
            ServiceState.STOPPED,
        ),
    ]

    last_seen: Annotated[
        int,
        Field(
            title="Last seen",
            examples=[1949155890],
        ),
    ] = 0


class ServiceSettings(BaseServiceSettings):
    settings: str = Field("<service/>")
    pid: int = Field(0)


#
# Storage settings.
#


class BaseStorageSettings(BaseListItemModel):
    protocol: Annotated[
        Literal["samba", "local"],
        Field(
            title="Connection protocol",
            examples=["samba", "local"],
        ),
    ]

    path: Annotated[
        str,
        Field(
            title="Path",
            examples=["//server/share"],
        ),
    ]


class ExtendedStorageSettings(BaseStorageSettings):
    options: Annotated[
        dict[str, Any],
        Field(
            default_factory=dict,
            title="Connection options",
        ),
    ]


class StorageOverrideSettings(SettingsModel):
    hostname: Annotated[
        str,
        Field(
            title="Hostname",
            description=(
                "Hostname of the host for which the override applies"
                " (use __server__ for the server hosts)"
            ),
            examples=[
                "worker01",
                "__server__",
            ],
        ),
    ]

    enabled: Annotated[
        bool,
        Field(
            title="Enabled",
            description="Set to false to disable the storage access on the host",
        ),
    ] = True

    protocol: Annotated[
        Literal["samba", "local"] | None,
        Field(
            title="Connection protocol",
            examples=["samba", "local"],
        ),
    ] = None

    path: Annotated[
        str | None,
        Field(
            title="Path",
            examples=["//server/share"],
        ),
    ] = None

    options: Annotated[
        dict[str, Any],
        Field(
            default_factory=dict,
            title="Connection options",
        ),
    ]


class StorageSettings(ExtendedStorageSettings):
    overrides: Annotated[
        list[StorageOverrideSettings],
        Field(
            default_factory=list,
            title="Overrides",
            description="List of storage overrides for specific hosts",
        ),
    ]


#
# Folder settings
#


class FolderField(SettingsModel):
    name: Annotated[
        str,
        Field(
            title="Field name",
        ),
    ]

    section: Annotated[
        str | None,
        Field(
            title="Section",
        ),
    ] = None

    mode: Annotated[
        str | None,
        Field(
            title="Editor mode",
        ),
    ] = None

    format: Annotated[
        str | None,
        Field(
            title="Value format",
        ),
    ] = None

    order: Annotated[
        str | None,
        Field(
            title="Enumerator order mode",
        ),
    ] = None

    filter: Annotated[
        str | None,
        Field(
            title="Enumerator filter",
        ),
    ] = None

    links: Annotated[
        list[dict[str, Any]] | None,
        Field(
            title="Links to other fields",
        ),
        BeforeValidator(lambda v: v if isinstance(v, list) else []),
    ] = None


class FolderLink(SettingsModel):
    name: str
    view: int
    source_key: str
    target_key: str


class FolderSettings(SettingsModel):
    id: int = Field(...)
    name: str = Field(...)
    color: str = Field(...)
    fields: list[FolderField] = Field(default_factory=list)
    links: list[FolderLink] = Field(default_factory=list)


class ViewSettings(BaseListItemModel):
    position: int = Field(...)
    folders: list[int] | None = Field(default=None)
    states: list[int] | None = Field(default=None)
    columns: list[str] | None = Field(default=None)
    conditions: list[str] | None = Field(default=None)
    separator: bool = Field(default=False)


DayStart = tuple[int, int]


class AcceptModel(SettingsModel):
    folders: Annotated[
        list[int] | None,
        Field(
            default=None,
            title="Folders",
            description="List of folder IDs",
        ),
    ]

    content_types: Annotated[
        list[ContentType] | None,
        Field(
            default_factory=lambda: [ContentType.VIDEO],
            title="Content types",
            description=(
                "List of content types that are accepted. "
                "None means all types are accepted."
            ),
        ),
    ]

    media_types: Annotated[
        list[MediaType] | None,
        Field(
            default_factory=lambda: [MediaType.FILE],
            title="Media types",
            description=(
                "List of media types that are accepted. "
                "None means all types are accepted."
            ),
        ),
    ]


class BasePlayoutChannelSettings(BaseListItemModel):
    fps: Annotated[
        float,
        Field(
            title="Playout frame rate",
            description="Frame rate used for scheduling and playout",
        ),
    ] = 25.0

    plugins: Annotated[
        list[str],
        Field(
            title="Playout plugins",
            description=(
                "List of playout plugins used by the channel"
                "e.g. for secondary events or graphic layers"
            ),
            default_factory=list,
        ),
    ]

    solvers: Annotated[
        list[str],
        Field(
            title="Playout solvers",
            description="List of rundown solver plugins enabled for the channel. ",
            default_factory=list,
        ),
    ]

    day_start: Annotated[
        DayStart,
        Field(
            title="Day start time",
            description=(
                "Time of day when the scheduling day starts, in hours and minutes. "
            ),
            examples=[(7, 0)],
        ),
    ] = 7, 0

    rundown_columns: Annotated[
        list[str],
        Field(
            title="Rundown columns",
            description="List of columns that are displayed in the rundown table",
            default_factory=list,
        ),
    ]

    fields: list[FolderField] = Field(
        title="Fields",
        description="Metadata fields available for the channel events",
        default_factory=lambda: [
            FolderField(name="title"),
            FolderField(name="subtitle"),
            FolderField(name="description"),
            FolderField(name="color"),  # to distinguish events in the scheduler view
        ],
    )

    send_action: Annotated[
        int | None,
        Field(
            title="Send to playout action",
            description=(
                "ID of the action that is used to send media files to playout. "
            ),
            examples=[2],
        ),
    ] = None

    scheduler_accepts: Annotated[
        AcceptModel,
        Field(
            title="Scheduler accepts",
            description=(
                "Criteria for accepting assets to be added to the channel scheduler."
            ),
            default_factory=AcceptModel,
        ),
    ]

    rundown_accepts: Annotated[
        AcceptModel,
        Field(
            title="Rundown accepts",
            description=(
                "Criteria for accepting assets to be added to the channel rundown."
            ),
            default_factory=AcceptModel,
        ),
    ]

    default_template: Annotated[
        str | None,
        Field(
            title="Default template",
            description=(
                "Name of the default template used to auto-populate "
                "the channel schedule."
            ),
            default=None,
        ),
    ] = None


class PlayoutChannelSettings(BasePlayoutChannelSettings):
    engine: Annotated[
        str,
        Field(
            title="Playout engine",
            examples=["casparcg", "dummy"],
        ),
    ]

    config: Annotated[
        dict[str, Any],
        Field(
            default_factory=dict,
            title="Engine configuration",
            description="Engine specific configuration",
        ),
    ]

    playout_storage: Annotated[
        int | None,
        Field(
            title="Playout storage",
            description="ID of the storage playout media files are stored",
            examples=[2],
        ),
    ] = None

    playout_dir: Annotated[
        str | None,
        Field(
            title="Playout directory",
            description=(
                "Relative path from the playout storage root "
                "to the directory playout media are stored in"
            ),
            examples=["content/media"],
        ),
    ] = None

    playout_container: Annotated[
        str | None,
        Field(
            title="Playout media container",
            description="Format (extension) of playout media files",
            examples=["mxf"],
        ),
    ] = None

    allow_remote: Annotated[
        bool,
        Field(
            title="Allow playback from remote storage",
            description=(
                "Indicates the playout media don't need to be transferred "
                "to the playout storage before playback, but can be played "
                "directly from their original storage (e.g. via SMB or NFS). "
                "Not supported by CasparCG"
            ),
        ),
    ] = False

    controller_host: Annotated[
        str | None,
        Field(
            title="Controller host",
            description="Host name or IP address of the playout controller service",
        ),
    ] = None

    controller_port: Annotated[
        int | None,
        Field(
            title="Controller port",
            description="Port the playout service is listening on",
        ),
    ] = None


#
# Server settings
#

T = TypeVar("T", bound=BaseListItemModel)


def unique_item(values: list[T]) -> list[T]:
    """Check if all items in the list have unique IDs and names."""

    ids = set()
    names = set()

    for item in values:
        if item.id in ids:
            raise ValueError(f"Duplicate ID {item.id}")
        ids.add(item.id)

        if item.name in names:
            raise ValueError(f"Duplicate name {item.name}")
        names.add(item.name)

    return values


StorageList = Annotated[list[StorageSettings], AfterValidator(unique_item)]
FolderList = Annotated[list[FolderSettings], AfterValidator(unique_item)]
ViewList = Annotated[list[ViewSettings], AfterValidator(unique_item)]
PlayoutChannelList = Annotated[
    list[PlayoutChannelSettings], AfterValidator(unique_item)
]


class ServerSettings(SettingsModel):
    installed: Annotated[
        bool,
        Field(
            title="Is server installed",
            description="Set to false if the server is not fully set up yet",
        ),
    ] = True

    system: Annotated[
        SystemSettings,
        Field(
            title="System settings",
            default_factory=lambda: SystemSettings(),
        ),
    ]

    storages: Annotated[
        StorageList,
        Field(
            title="Storages settings",
            default_factory=list,
        ),
    ]

    folders: Annotated[
        FolderList,
        Field(
            title="Folders settings",
            default_factory=list,
        ),
    ]

    views: Annotated[
        ViewList,
        Field(
            title="Browser views settings",
            default_factory=list,
        ),
    ]

    metatypes: Annotated[
        dict[str, MetaType],
        Field(
            title="Metadata types settings",
            default_factory=dict,
        ),
    ]

    cs: Annotated[
        dict[str, CSModel],
        Field(
            title="Controlled vocabularies settings",
            default_factory=dict,
            description="Key is a URN, value is CSModel `{value: CSItemModel}` dict",
        ),
    ]

    playout_channels: Annotated[
        PlayoutChannelList,
        Field(
            title="Playout channels settings",
            default_factory=list,
        ),
    ]

    def get_folder(self, id_folder: int) -> FolderSettings | None:
        for item in self.folders:
            if item.id == id_folder:
                return item
        return None

    def get_view(self, id_view: int) -> ViewSettings | None:
        for item in self.views:
            if item.id == id_view:
                return item
        return None

    def get_storage(self, id_storage: int) -> StorageSettings | None:
        for item in self.storages:
            if item.id == id_storage:
                return item
        return None

    def get_playout_channel(self, id_channel: int) -> PlayoutChannelSettings | None:
        for item in self.playout_channels:
            if item.id == id_channel:
                return item
        return None


class SetupServerModel(ServerSettings):
    """Extended settings model used by setup.

    Normally, actions and services are not part of the settings
    model, but they are included here to validate the setup template
    """

    actions: Annotated[
        list[ActionSettings],
        Field(
            default_factory=list,
        ),
    ]

    services: Annotated[
        list[ServiceSettings],
        Field(
            default_factory=list,
        ),
    ]

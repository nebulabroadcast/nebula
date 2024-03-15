from typing import Annotated, Any, Literal, TypeVar

from pydantic import AfterValidator, Field

from nebula.config import config
from nebula.enum import ContentType, MediaType, ServiceState
from nebula.settings.common import LanguageCode, SettingsModel
from nebula.settings.metatypes import MetaType

CSItemRole = Literal["hidden", "header", "label", "option"]


class CSAlias(SettingsModel):
    title: str
    description: str | None = None


class CSItemModel(SettingsModel):
    role: CSItemRole | None = Field(default=None)
    aliases: dict[str, CSAlias] = Field(default_factory=dict)

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

    site_name: str = Field(
        default=config.site_name,
        pattern=r"^[a-zA-Z0-9_]+$",
        title="Site name",
        description="A name used as the site (instance) identification",
    )

    language: LanguageCode = Field(
        default="en",
        title="Default language",
        examples=["en", "cs"],
    )

    ui_asset_create: bool = Field(
        default=True,
        title="Create assets in UI",
        description="Allow creating assets in the UI"
        "(when set to false, assets can only be created via API and watch folders)",
    )

    ui_asset_preview: bool = Field(
        default=True,
        title="Preview assets in UI",
        description="Allow previewing low-res proxies of assets in the UI",
    )

    ui_asset_upload: bool = Field(
        default=False,
        title="Upload assets in UI",
        description="Allow uploading asset media files in the UI "
        "(when set to false, assets can only be uploaded via API and watch folders)",
    )

    subtitle_separator: str = Field(
        default=": ",
        title="Subtitle separator",
        description="String used to separate title and subtitle in displayed title",
    )


class SystemSettings(BaseSystemSettings):
    """System settings.

    Expanded version of the base system settings.
    Contains settings that are used only by the server.
    """

    proxy_storage: int = Field(default=1, title="Proxy storage", examples=[1])
    proxy_path: str = Field(default=".nx/proxy/{id1000:04d}/{id}.mp4")
    worker_plugin_storage: int = Field(default=1)
    worker_plugin_path: str = Field(default=".nx/plugins")
    upload_storage: int | None = Field(default=None)
    upload_dir: str | None = Field(default=None)
    upload_base_name: str = Field(default="{id}")

    smtp_host: str | None = Field(
        default=None,
        title="SMTP host",
        examples=["smtp.example.com"],
    )
    smtp_port: int | None = Field(
        default=None,
        title="SMTP port",
        examples=[465],
    )
    smtp_user: str | None = Field(
        default=None,
        title="SMTP user",
        examples=["smtpuser"],
    )
    smtp_pass: str | None = Field(
        default=None,
        title="SMTP password",
        examples=["smtppass.1"],
    )

    mail_from: str | None = Field(
        default="Nebula <noreply@nebulabroadcast.com>",
        title="Mail from",
        description="Email address used as the sender",
        examples=["Nebula <noreply@example.com>"],
    )


class BaseListItemModel(SettingsModel):
    id: int = Field(..., title="ID", examples=[1])
    name: str = Field(..., title="Name", examples=["Name"])


#
# Action settings
#


class BaseActionSettings(BaseListItemModel):
    type: str = Field(..., title="Action type", examples=["conv"])


class ActionSettings(BaseActionSettings):
    settings: str = Field("<action/>")


#
# Service settings
#


class BaseServiceSettings(BaseListItemModel):
    type: str = Field(..., title="Service type", examples=["conv"])
    host: str = Field(..., title="Host", examples=["node01"])
    autostart: bool = Field(True, title="Autostart", examples=[True])
    loop_delay: int = Field(
        5, title="Loop delay", description="Seconds of sleep between runs"
    )
    state: ServiceState = Field(ServiceState.STOPPED)
    last_seen: int = Field(0, title="Last seen", examples=[1949155890])


class ServiceSettings(BaseServiceSettings):
    settings: str = Field("<service/>")
    pid: int = Field(0)


#
# Storage settings.
#


class BaseStorageSettings(BaseListItemModel):
    protocol: Literal["samba", "local"] = Field(
        ...,
        title="Connection protocol",
        examples=["samba"],
    )
    path: str = Field(..., title="Path", examples=["//server/share"])


class StorageSettings(BaseStorageSettings):
    options: dict[str, Any] = Field(default_factory=dict, title="Connection options")


#
# Folder settings
#


class FolderField(SettingsModel):
    name: str = Field(..., title="Field name")
    section: str | None = Field(default=None, title="Section")
    mode: str | None = None
    format: str | None = None
    order: str | None = None
    filter: str | None = None
    links: list[Any] = Field(default_factory=list)


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
    folders: list[int] | None = Field(
        default=None,
        title="Folders",
        description="List of folder IDs",
    )
    content_types: list[ContentType] | None = Field(
        default_factory=lambda: [ContentType.VIDEO],
        title="Content types",
        description="List of content types that are accepted. "
        "None means all types are accepted.",
    )
    media_types: list[MediaType] | None = Field(
        default_factory=lambda: [MediaType.FILE],
        title="Media types",
        description="List of media types that are accepted. "
        "None means all types are accepted.",
    )


class BasePlayoutChannelSettings(BaseListItemModel):
    fps: float = Field(default=25.0)
    plugins: list[str] = Field(default_factory=list)
    solvers: list[str] = Field(default_factory=list)
    day_start: DayStart = Field(default=(7, 0))
    rundown_columns: list[str] = Field(default_factory=list)
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
    send_action: int | None = Field(default=None)
    scheduler_accepts: AcceptModel = Field(default_factory=AcceptModel)
    rundown_accepts: AcceptModel = Field(default_factory=AcceptModel)


class PlayoutChannelSettings(BasePlayoutChannelSettings):
    engine: str = Field(..., title="Playout engine")
    config: dict[str, Any] = Field(
        default_factory=dict,
        title="Engine configuration",
        description="Engine specific configuration",
    )
    playout_storage: int | None = None
    playout_dir: str | None = None
    playout_container: str | None = None
    allow_remote: bool = Field(False)
    controller_host: str | None = None
    controller_port: int | None = None


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
    installed: bool = True
    system: SystemSettings = Field(default_factory=lambda: SystemSettings())
    storages: StorageList = Field(default_factory=list)
    folders: FolderList = Field(default_factory=list)
    views: ViewList = Field(default_factory=list)
    metatypes: dict[str, MetaType] = Field(default_factory=dict)
    cs: dict[str, CSModel] = Field(
        default_factory=dict,
        description="Key is a URN, value is CSModel `{value: CSItemModel}` dict",
    )
    playout_channels: PlayoutChannelList = Field(default_factory=list)

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

    actions: list[ActionSettings] = Field(default_factory=list)
    services: list[ServiceSettings] = Field(default_factory=list)

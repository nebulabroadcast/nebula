from typing import Any

from nebula.config import config
from nebula.db import db
from nebula.log import log
from nebula.settings.metatypes import MetaType
from nebula.settings.models import (
    CSItemModel,
    CSModel,
    FolderSettings,
    PlayoutChannelSettings,
    ServerSettings,
    ViewSettings,
)

settings = ServerSettings()


#
# Load settings from database
#


async def get_server_settings() -> ServerSettings:
    result: dict[str, Any] = {}

    # System settings

    query = "SELECT key, value FROM settings"
    result["system"] = {row["key"]: row["value"] async for row in db.iterate(query)}
    result["system"]["site_name"] = config.site_name

    # Storages

    # TODO

    # Playout channels

    _playout_channels: list[PlayoutChannelSettings] = []
    query = "SELECT * FROM channels WHERE channel_type = 0 ORDER BY id ASC"
    async for row in db.iterate(query):
        _playout_channels.append(
            PlayoutChannelSettings(id=row["id"], **row["settings"])
        )
    result["playout_channels"] = _playout_channels

    # Folders

    _folders: list[FolderSettings] = []
    query = "SELECT id, settings FROM folders ORDER BY id ASC"
    async for row in db.iterate(query):
        _folders.append(FolderSettings(id=row["id"], **row["settings"]))
    result["folders"] = _folders

    # Views

    _views: list[ViewSettings] = []
    query = "SELECT id, settings FROM views ORDER BY id ASC"
    async for row in db.iterate(query):
        settings = row["settings"]
        _views.append(ViewSettings(id=row["id"], **settings))
    result["views"] = _views

    # Metatypes

    _metatypes = {}
    query = "SELECT key, settings FROM meta_types"
    async for row in db.iterate(query):
        _metatypes[row["key"]] = MetaType.from_settings(row["settings"])
    result["metatypes"] = _metatypes

    # Classification schemes

    _cs: dict[str, CSModel] = {}
    query = "SELECT cs, value, settings FROM cs ORDER BY value"
    async for row in db.iterate(query):
        scheme = row["cs"]
        item = CSItemModel.from_settings(row["value"], row["settings"])
        if scheme not in _cs:
            _cs[scheme] = {}
        _cs[scheme][row["value"]] = item
    result["cs"] = _cs

    # Return loaded settings
    return ServerSettings(**result)


async def load_settings() -> None:
    """Load settings from database.

    This function is called on application startup.
    Either in nebula.server on_init handler or by nebula.run
    """
    log.trace("Loading settings")
    new_settings = await get_server_settings()

    new_settings_dict = new_settings.model_dump()
    old_settings_dict = settings.model_dump()

    for key in new_settings_dict:
        if key in old_settings_dict:
            setattr(settings, key, getattr(new_settings, key))

from typing import Any

import nx

from nebula.config import config
from nebula.settings.metatypes import MetaType
from nebula.settings.models import (
    CSItemModel,
    CSModel,
    FolderSettings,
    PlayoutChannelSettings,
    ServerSettings,
    StorageSettings,
    SystemSettings,
    ViewSettings,
)

settings = ServerSettings(
    system=SystemSettings(site_name=config.site_name, language="en", sso_providers=[]),
    storages=[],
    playout_channels=[],
    folders=[],
    views=[],
    metatypes={},
    cs={},
)


#
# Load settings from database
#


async def get_server_settings() -> ServerSettings:
    result: dict[str, Any] = {}

    # System settings

    query = "SELECT key, value FROM settings"
    result["system"] = {row["key"]: row["value"] async for row in nx.db.iterate(query)}
    result["system"]["site_name"] = config.site_name

    # Storages

    query = "SELECT id, settings FROM storages ORDER BY id ASC"
    result["storages"] = [
        StorageSettings(id=row["id"], **row["settings"])
        async for row in nx.db.iterate(query)
    ]

    # Playout channels

    query = "SELECT * FROM channels WHERE channel_type = 0 ORDER BY id ASC"
    result["playout_channels"] = [
        PlayoutChannelSettings(id=row["id"], **row["settings"])
        async for row in nx.db.iterate(query)
    ]

    # Folders

    query = "SELECT id, settings FROM folders ORDER BY id ASC"
    result["folders"] = [
        FolderSettings(id=row["id"], **row["settings"])
        async for row in nx.db.iterate(query)
    ]

    # Views

    query = "SELECT id, settings FROM views ORDER BY id ASC"
    result["views"] = [
        ViewSettings(id=row["id"], **row["settings"])
        async for row in nx.db.iterate(query)
    ]

    # Metatypes

    query = "SELECT key, settings FROM meta_types"
    result["metatypes"] = {
        row["key"]: MetaType.from_settings(row["settings"])
        async for row in nx.db.iterate(query)
    }

    # Classification schemes

    _cs: dict[str, CSModel] = {}
    query = "SELECT cs, value, settings FROM cs ORDER BY value"
    async for row in nx.db.iterate(query):
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
    nx.log.trace("Loading settings")
    new_settings = await get_server_settings()

    new_settings_dict = new_settings.model_dump()
    old_settings_dict = settings.model_dump()

    for key in new_settings_dict:
        if key in old_settings_dict:
            setattr(settings, key, getattr(new_settings, key))

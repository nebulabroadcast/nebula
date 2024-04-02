import os
import sys
from typing import Any

import httpx
from pydantic import ValidationError

from nebula.common import import_module
from nebula.db import DatabaseConnection
from nebula.log import log
from nebula.settings.models import SetupServerModel
from setup.defaults.actions import ACTIONS
from setup.defaults.channels import CHANNELS
from setup.defaults.folders import FOLDERS
from setup.defaults.meta_types import META_TYPES
from setup.defaults.services import SERVICES
from setup.defaults.views import VIEWS
from setup.metatypes import setup_metatypes

TEMPLATE: dict[str, Any] = {
    "actions": ACTIONS,
    "channels": CHANNELS,
    "folders": FOLDERS,
    "services": SERVICES,
    "views": VIEWS,
    "meta_types": META_TYPES,
    "storages": [],
    "settings": {},
    "cs": [],
}


def load_overrides() -> None:
    if not os.path.isdir("/settings"):
        return
    for fname in os.listdir("/settings"):
        spath = os.path.join("/settings", fname)
        sname, sext = os.path.splitext(spath)
        if sext != ".py":
            continue
        mod = import_module(sname, spath)

        for key in TEMPLATE:
            if not hasattr(mod, key.upper()):
                continue
            override = getattr(mod, key.upper())
            log.info(f"Found overrides for {key}")

            if isinstance(override, dict) and isinstance(TEMPLATE[key], dict):
                assert hasattr(TEMPLATE[key], "update")
                TEMPLATE[key].update(override)
            elif isinstance(override, list) and isinstance(TEMPLATE[key], list):
                TEMPLATE[key] = override
            else:
                log.error(f"Invalid settings override: {spath}")


async def setup_settings(db: DatabaseConnection) -> None:
    """Validate and save settings to the database"""

    log.trace("Loading settings overrides")
    load_overrides()
    log.trace("Validating settings template")

    try:
        # Apply the settings to the model
        # This effectively validates the settings.

        # We especially need to be sure that IDs and names
        # are unique.

        # we are skipping meta types and cs here, as their
        # models in the template are not compatible with the
        # SetupServerModel

        settings = SetupServerModel(
            system=TEMPLATE.pop("settings", {}),
            playout_channels=TEMPLATE.pop("channels", []),
            folders=TEMPLATE.pop("folders", []),
            views=TEMPLATE.pop("views", []),
            actions=TEMPLATE.pop("actions", []),
            services=TEMPLATE.pop("services", []),
            storages=TEMPLATE.pop("storages", []),
        )
    except ValidationError as e:
        log.error(f"Invalid settings: {e}")
        sys.exit(1)

    # Keep in mind that we are running setup in a transaction,
    # so we can safely delete all existing settings and recreate
    # them from scratch (unless there are hard references to them).

    # System settings
    # Simple key-value pairs with field-level validation

    log.info("Applying system settings")

    await db.execute("DELETE FROM settings")
    for key, value in settings.system.model_dump(exclude_none=True).items():
        await db.execute(
            """
            INSERT INTO settings (key, value) VALUES ($1, $2)
            ON CONFLICT (key) DO UPDATE SET value=$2
            """,
            key,
            value,
        )
    log.trace("Saved system settings")

    # Setup views

    await db.execute("DELETE FROM views")
    for view in settings.views:
        vdata = view.model_dump(exclude_none=True)
        vid = vdata.pop("id")

        await db.execute(
            """
            INSERT INTO views (id, settings)
            VALUES ($1, $2)
            """,
            vid,
            vdata,
        )
    await db.execute(
        """
        SELECT setval(pg_get_serial_sequence('views', 'id'),
        coalesce(max(id),0) + 1, false) FROM views;
        """
    )
    log.trace(f"Saved {len(settings.views)} views")

    # Setup folders

    folder_ids: list[str] = []
    for folder in settings.folders:
        fdata = folder.model_dump(exclude_none=True)
        fid = fdata.pop("id")
        folder_ids.append(str(fid))

        await db.execute(
            """
            INSERT INTO folders (id, settings)
            VALUES ($1, $2)
            ON CONFLICT (id) DO UPDATE SET settings = $2
            """,
            fid,
            fdata,
        )
    await db.execute(
        """
        SELECT setval(pg_get_serial_sequence('folders', 'id'),
        coalesce(max(id),0) + 1, false) FROM folders;
        """
    )
    log.trace(f"Saved {len(settings.folders)} folders")
    # We cannot drop tables first since they are referenced from existing assets
    # So we just try to delete unused and fail if they are still referenced
    await db.execute(f"DELETE FROM folders WHERE id NOT IN ({','.join(folder_ids)})")

    # Setup channels

    # We can safely delete all channels, since they are not
    # hard-referenced from other tables (bins are linked using
    # id_magic, which is not a foreign key). But keep in mind
    # that deleting channel will leave orphaned bins, items and
    # as-run logs in the database.

    await db.execute("DELETE FROM channels")
    for channel in settings.playout_channels:  # + other channel types
        channel_data = channel.model_dump(exclude_none=True)
        id_channel = channel_data.pop("id", None)
        await db.execute(
            """
            INSERT INTO channels (id, channel_type, settings)
            VALUES ($1, $2, $3)
            ON CONFLICT (id) DO UPDATE SET
            channel_type=$2, settings=$3
            """,
            id_channel,
            0,
            channel_data,
        )
    await db.execute(
        """
        SELECT setval(pg_get_serial_sequence('channels', 'id'),
        coalesce(max(id),0) + 1, false) FROM channels;
        """
    )
    log.trace(f"Saved {len(settings.playout_channels)} playout channels")

    # Setup storages

    await db.execute("DELETE FROM storages")
    for storage in settings.storages:
        storage_data = storage.model_dump(exclude_none=True)
        id_storage = storage_data.pop("id", None)
        await db.execute(
            """
            INSERT INTO storages (id, settings) VALUES ($1, $2)
            ON CONFLICT (id) DO UPDATE SET settings=$2
            """,
            id_storage,
            storage_data,
        )
    await db.execute(
        """
        SELECT setval(pg_get_serial_sequence('storages', 'id'),
        coalesce(max(id),0) + 1, false) FROM storages;
        """
    )
    log.trace(f"Saved {len(settings.storages)} storages")

    # Setup services

    # Services are soft-referenced from jobs, so we can
    # delete them safely. Orphaned ID will be left in the
    # jobs table, but it's not a problem.

    await db.execute("DELETE FROM services")
    for service in settings.services:
        await db.execute(
            """
            INSERT INTO services
            (id, service_type, host, title, settings, autostart, loop_delay)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
            service_type=$2, host=$3, title=$4, settings=$5, autostart=$6, loop_delay=$7
            """,
            service.id,
            service.type,
            service.host,
            service.name,
            service.settings,
            service.autostart,
            service.loop_delay,
        )
    await db.execute(
        """
        SELECT setval(pg_get_serial_sequence('services', 'id'),
        coalesce(max(id),0) + 1, false) FROM services;
        """
    )
    log.trace(f"Saved {len(settings.services)} services")

    # Setup actions

    # we cannot delete actions, since they are referenced from
    # jobs - updating configuration would delete all jobs as
    # well, which is not desired. So we just try to upsert them

    for action in settings.actions:
        await db.execute(
            """
            INSERT INTO actions
            (id, service_type, title, settings)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO UPDATE SET
            service_type=$2, title=$3, settings=$4
            """,
            action.id,
            action.type,
            action.name,
            action.settings,
        )
    await db.execute(
        """
        SELECT setval(pg_get_serial_sequence('actions', 'id'),
        coalesce(max(id),0) + 1, false) FROM actions;
        """
    )

    log.trace(f"Saved {len(settings.actions)} actions")

    # Meta types and classifications need to be processed separately

    # Setup metatypes

    await setup_metatypes(TEMPLATE["meta_types"], db)
    log.trace(f"Saved {len(TEMPLATE['meta_types'])} meta types")

    # Setup classifications

    used_urns = set()
    for mset in TEMPLATE["meta_types"].values():
        if mset.get("cs"):
            used_urns.add(mset["cs"])

    classifications = []
    async with httpx.AsyncClient() as client:
        response = await client.get("https://cs.nbla.xyz/dump")
        classifications = response.json()

    classifications.extend(TEMPLATE["cs"])

    for scheme in classifications:
        name = scheme["cs"]
        if name not in used_urns:
            log.trace(f"Skipping unused classification scheme: {name}")
            continue
        await db.execute("DELETE FROM cs WHERE cs = $1", name)
        for value in scheme["data"]:
            cs_settings = scheme["data"][value]
            await db.execute(
                "INSERT INTO cs(cs, value, settings) VALUES ($1, $2, $3)",
                name,
                value,
                cs_settings,
            )
    log.trace(f"Saved {len(classifications)} classifications")

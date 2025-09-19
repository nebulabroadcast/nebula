import asyncio
import os

import aiocache

import nebula
from server.dependencies import CurrentUser
from server.models import ResponseModel
from server.request import APIRequest


class NebulaStorageUsage(ResponseModel):
    label: str
    color: str | None = None
    usage: int = 0
    duration: int = 0


class StorageStat(ResponseModel):
    storage_id: int
    label: str
    total: int
    used: int
    free: int
    untracked: int
    available: bool = True
    nebula_usage: list[NebulaStorageUsage]


@aiocache.cached(ttl=60)
async def get_disk_usage(path: str) -> tuple[int, int]:
    """Returns total and used space in bytes"""
    cmd = ["df", "--output=size,used", path]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"df command failed: {stderr.decode().strip()}")

    lines = stdout.decode().strip().split("\n")
    if len(lines) < 2:
        raise RuntimeError("df command returned unexpected output")
    total_kb, used_kb = map(int, lines[1].split())
    return total_kb * 1024, used_kb * 1024


@aiocache.cached(ttl=60)
async def get_nebula_folders_usage(storage_id: int) -> list[NebulaStorageUsage]:
    query = """
        SELECT
            a.id_folder,
            sum((meta->'file/size')::bigint),
            sum((meta->'duration')::bigint) AS duration,
            f.settings->'name' AS folder_name,
            f.settings->'color' AS folder_color
        FROM assets a
        JOIN folders f ON a.id_folder = f.id
        WHERE (a.meta->'id_storage')::integer = $1 AND a.status != 0
        GROUP BY a.id_folder, f.settings
    """
    rows = await nebula.db.fetch(query, storage_id)
    return [
        NebulaStorageUsage(
            usage=row["sum"],
            label=row["folder_name"] or f"Folder {row['id_folder']}",
            color=row["folder_color"],
            duration=row["duration"] or 0,
        )
        for row in rows
        if row["sum"]
    ]


@aiocache.cached(ttl=60)
async def get_nebula_playout_usage(storage_id: int) -> NebulaStorageUsage:
    channel_keys = [
        f"playout_status/{channel.id}"
        for channel in nebula.settings.playout_channels
        if channel.playout_storage == storage_id
    ]

    size = 0
    duration = 0

    for channel_key in channel_keys:
        query = """
            SELECT
                sum(coalesce((meta->$1->'size'),'0'::jsonb)::bigint) AS usage,
                sum(coalesce((meta->$1->'duration'),'0'::jsonb)::bigint) AS duration
            FROM assets
            WHERE coalesce((meta->$1->'status'), '0'::jsonb)::integer != 0
        """
        row = await nebula.db.fetchrow(query, channel_key)
        if not row:
            continue
        if row["usage"]:
            size += row["usage"]
        if row["duration"]:
            duration += row["duration"]

    return NebulaStorageUsage(
        usage=size,
        label="Playout",
        color="#FF5733",
        duration=duration,
    )


@aiocache.cached(ttl=300, key="storage_map")
async def get_storage_map() -> dict[int, dict[str, str]]:
    storages: dict[int, dict[str, str]] = {}
    res = await nebula.db.fetch("SELECT id, settings FROM storages")
    for row in res:
        storages[row["id"]] = {
            "name": row["settings"].get("name", f"Storage {row['id']}"),
            "protocol": row["settings"].get("protocol", "local"),
        }
    return storages


class NebulaStoragesUsage(ResponseModel):
    storages: list[StorageStat]


class NebulaStoragesRequest(APIRequest):
    """Get a list of objects"""

    name = "stats/storages"
    title = "Get storage usage statistics"
    response_model = NebulaStoragesUsage

    async def handle(
        self,
        user: CurrentUser,
    ) -> NebulaStoragesUsage:
        results: list[StorageStat] = []
        site_name = nebula.config.site_name
        storages = await get_storage_map()

        for mountpoint_name in sorted(os.listdir("/mnt")):
            if not os.path.isdir(os.path.join("/mnt", mountpoint_name)):
                continue

            if not mountpoint_name.startswith(site_name + "_"):
                continue

            try:
                storage_id = int(mountpoint_name.split("_")[-1])
            except ValueError:
                continue

            usage = await get_nebula_folders_usage(storage_id)
            playout_usage = await get_nebula_playout_usage(storage_id)
            if playout_usage.usage > 0:
                usage.append(playout_usage)
            used_by_nebula = sum(u.usage for u in usage)

            storage = storages.get(storage_id)
            if (
                storage
                and storage["protocol"] != "local"
                and not os.path.ismount(f"/mnt/{mountpoint_name}")
            ):
                total_size = used_size = used_by_nebula
                free_size = untracked_size = 0
                available = False
            else:
                total_size, used_size = await get_disk_usage(f"/mnt/{mountpoint_name}")
                available = True
                free_size = total_size - used_size
                untracked_size = used_size - used_by_nebula

            results.append(
                StorageStat(
                    storage_id=storage_id,
                    label=storage["name"] if storage else f"Storage {storage_id}",
                    total=total_size,
                    used=used_size,
                    free=free_size,
                    untracked=untracked_size,
                    nebula_usage=usage,
                    available=available,
                )
            )

        return NebulaStoragesUsage(storages=results)

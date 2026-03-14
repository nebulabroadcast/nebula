import asyncio
import contextlib
import os
import subprocess
import time
from typing import Any

import nebula
from nebula.settings.models import StorageSettings
from nebula.storages import Storage
from server.background import BackgroundTask


def exec_mount(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, capture_output=True, check=False)  # noqa: S603
    if proc.returncode != 0:
        raise RuntimeError(
            f"Mount failed with return code {proc.returncode}"
            f": {proc.stderr.decode().strip()}"
        )


# def handle_nfs_storage(storage: Storage):
#     cmd = f"mount.nfs {storage.path} {storage.local_path}"
#     exec_mount(cmd)


async def ensure_local_path(storage: Storage) -> bool:
    if not os.path.exists(storage.local_path):
        try:
            os.mkdir(storage.local_path)
        except FileExistsError:
            pass
        except Exception:
            nebula.log.traceback(f"Unable to create mountpoint for {storage}")
            await nebula.db.execute(
                "UPDATE storages SET enabled = FALSE WHERE id = $1",
                storage.id,
            )
            nebula.log.error(f"Disabling storage {storage}")
            return False
    return True


async def handle_samba_storage(storage: Storage) -> None:  # noqa: C901
    if time.time() - storage.last_mount_attempt < min(storage.mount_attempts * 5, 120):
        return

    if not await ensure_local_path(storage):
        return

    nebula.log.debug(f"Mounting {storage} (attempt {storage.mount_attempts + 1})...")

    smbopts = []
    for key, value in storage.options.items():
        _key = key
        if _key == "login":
            _key = "user"
        elif _key == "password":
            _key = "pass"
        elif key == "samba_version":
            _key = "vers"

        if value is None:
            smbopts.append(_key)
        else:
            smbopts.append(f"{_key}={value}")

    cmd = ["mount.cifs", storage.path, storage.local_path]
    if smbopts:
        cmd.append("-o")
        cmd.append(",".join(smbopts))

    if storage.mount_attempts < 5:
        nebula.log.trace(cmd)

    try:
        await asyncio.to_thread(exec_mount, cmd)
    except RuntimeError as e:
        if storage.mount_attempts < 3:
            nebula.log.error(str(e))
        storage.last_mount_attempt = time.time()
        storage.mount_attempts += 1
        return

    nebula.log.success(f"{storage} mounted successfully")
    storage.mount_attempts = 0


class StorageMonitor(BackgroundTask):
    def initialize(self) -> None:
        self.status: dict[int, dict[str, Any]] = {}

    async def run(self) -> None:
        while True:
            await self.main()
            await asyncio.sleep(5)

    async def main(self) -> None:
        query = "SELECT id, settings FROM storages"
        async for row in nebula.db.iterate(query):
            id_storage = row["id"]
            storage_settings = row["settings"]

            storage = Storage(
                StorageSettings(
                    id=id_storage,
                    **storage_settings,
                )
            )

            if not storage.enabled:
                continue

            stat = self.status.get(id_storage, {})
            storage.last_mount_attempt = stat.get("last_mount_attempt", 0)
            storage.mount_attempts = stat.get("mount_attempts", 0)

            if storage.is_mounted:
                continue

            if storage.protocol == "local":
                if not os.path.isdir(storage.path):
                    with contextlib.suppress(FileExistsError):
                        os.makedirs(storage.path)
                continue

            if storage.protocol == "samba":
                await handle_samba_storage(storage)

            self.status[id_storage] = {
                "last_mount_attempt": storage.last_mount_attempt,
                "mount_attempts": storage.mount_attempts,
            }


storage_monitor = StorageMonitor()

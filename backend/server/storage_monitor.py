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


def exec_mount(cmd: list[str]) -> bool:
    proc = subprocess.run(cmd, capture_output=True)  #noqa: S603
    if proc.returncode != 0:
        nebula.log.error(
            f"Mount failed with return code {proc.returncode}"
            f": {proc.stderr.decode().strip()}"
        )
        return False
    return True


# def handle_nfs_storage(storage: Storage):
#     cmd = f"mount.nfs {storage.path} {storage.local_path}"
#     exec_mount(cmd)


async def handle_samba_storage(storage: Storage) -> None:
    if time.time() - storage.last_mount_attempt < min(storage.mount_attempts * 5, 120):
        return

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
            return

    nebula.log.info(f"Mounting {storage} (attempt {storage.mount_attempts + 1})...")

    smbopts = []
    for key, value in storage.options.items():
        if key == "login":
            key = "user"
        elif key == "password":
            key = "pass"
        elif key == "samba_version":
            key = "vers"

        if value is None:
            smbopts.append(key)
        else:
            smbopts.append(f"{key}={value}")

    cmd = ["mount.cifs", storage.path, storage.local_path]
    if smbopts:
        cmd.append("-o")
        cmd.append(",".join(smbopts))

    nebula.log.trace(cmd)

    res = await asyncio.to_thread(exec_mount, cmd)
    if res:
        nebula.log.success(f"{storage} mounted successfully")
        storage.mount_attempts = 0
    else:
        if storage.mount_attempts < 5:
            nebula.log.error(f"Unable to mount {storage}")
        storage.last_mount_attempt = time.time()
        storage.mount_attempts += 1


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

            if storage.mount_attempts > 5:
                await nebula.db.execute(
                    "UPDATE storages SET enabled = FALSE WHERE id = $1",
                    id_storage,
                )
                nebula.log.error(
                    f"Disabling storage {storage} after repeated mount failures"
                )

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

import asyncio
import os
import subprocess
import time

import nebula

from nebula.settings.models import StorageSettings
from nebula.storages import Storage
from server.background import BackgroundTask


async def exec_mount(cmd: str) -> bool:
    proc = subprocess.Popen(cmd, shell=True)
    while proc.poll() is None:
        await asyncio.sleep(0.1)
    if proc.returncode:
        return False
    return True


# def handle_nfs_storage(storage: Storage):
#     cmd = f"mount.nfs {storage.path} {storage.local_path}"
#     exec_mount(cmd)


async def handle_samba_storage(storage: Storage):

    if time.time() < storage.last_mount_attempt + (storage.mount_attempts * 2):
        return

    if not os.path.exists(storage.local_path):
        try:
            os.mkdir(storage.local_path)
        except Exception:
            nebula.log.traceback(f"Unable to create mountpoint for {storage}")
            storage.last_mount_attempt = time.time()
            storage.mount_attempts = 999
            return

    nebula.log.info(f"{storage} is not mounted. Mounting...")

    smbopts = {}
    if storage.options.get("login"):
        smbopts["user"] = storage.options["login"]
    if storage.options.get("password"):
        smbopts["pass"] = storage.options["password"]
    if storage.options.get("domain"):
        smbopts["domain"] = storage.options["domain"]

    smbver = storage.options.get("samba_version", "3.0")
    if smbver:
        smbopts["vers"] = smbver

    if smbopts:
        opts = " -o '{}'".format(
            ",".join(["{}={}".format(k, smbopts[k]) for k in smbopts])
        )
    else:
        opts = ""

    cmd = f"mount.cifs {storage.path} {storage.local_path}{opts}"

    res = await exec_mount(cmd)
    if res:
        nebula.log.success(f"{storage} mounted successfully")
        storage.mount_attempts = 0
    else:
        nebula.log.trace(cmd)
        nebula.log.error(f"Unable to mount {storage}")
        storage.last_mount_attempt = time.time()
        storage.mount_attempts += 1


class StorageMonitor(BackgroundTask):
    async def run(self):
        while True:
            await self.main()
            await asyncio.sleep(5)

    async def main(self):
        async for row in nebula.db.iterate("SELECT id, settings FROM storages"):
            id_storage = row["id"]
            storage_settings = row["settings"]

            storage = Storage(StorageSettings(id=id_storage, **storage_settings))

            if storage.is_mounted:
                continue

            if storage.protocol == "local":
                if not os.path.isdir(storage.path):
                    try:
                        os.makedirs(storage.path)
                    except Exception:
                        pass
                continue

            if storage.protocol == "samba":
                await handle_samba_storage(storage)


storage_monitor = StorageMonitor()

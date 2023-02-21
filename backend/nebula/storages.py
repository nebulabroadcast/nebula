import os
import posixpath

from nebula.config import config
from nebula.log import log
from nebula.settings import settings
from nebula.settings.models import StorageSettings


class Storage:
    def __init__(self, storage_config):
        self.id = storage_config.id
        self.name = storage_config.name
        self.protocol = storage_config.protocol
        self.path = storage_config.path
        self.options = storage_config.options
        self.read_only = None
        self.last_mount_attempt = 0
        self.mount_attempts = 0

    def __str__(self):
        res = f"storage {self.id}"
        if self.name:
            res += f" ({self.name})"
        return res

    @property
    def title(self):
        return self.name.name

    @property
    def local_path(self) -> str:
        if self.protocol == "local":
            return self.path
        return f"/mnt/{config.site_name}_{self.id:02d}"

    @property
    def is_mounted(self) -> bool:
        if not os.path.isdir(self.local_path):
            return False
        if self.protocol != "local" and (not posixpath.ismount(self.local_path)):
            return False
        if not os.listdir(self.local_path):
            return False
        return self.ensure_ident()

    @property
    def is_writable(self):
        return self.is_mounted and (not self.read_only)

    def __bool__(self):
        return self.is_mounted

    def ensure_ident(self):
        storage_string = f"{config.site_name}:{self.id}"
        storage_ident_path = os.path.join(self.local_path, ".nebula_root")

        if not (
            os.path.exists(storage_ident_path)
            and storage_string
            in [line.strip() for line in open(storage_ident_path).readlines()]
        ):
            try:
                with open(storage_ident_path, "a") as f:
                    f.write(storage_string + "\n")
            except Exception:
                if self.read_only is None:
                    log.warning(f"{self} is mounted, but read only")
                    self.read_only = True
            else:
                if self.read_only is None:
                    log.info(f"{self} is mounted and root is writable")
        return True


class Storages:
    def __getitem__(self, id_storage: int) -> Storage:
        if (storage_config := settings.get_storage(id_storage)) is None:
            return Storage(
                StorageSettings(
                    id=id_storage,
                    name="Unknown",
                    protocol="local",
                    path=f"/mnt/{config.site_name}_{id_storage:02d}",
                )
            )

        return Storage(storage_config)

    def __iter__(self):
        return settings.storages.__iter__()


storages = Storages()

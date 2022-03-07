import os
import sys
import json
import hashlib
import socket

from http import HTTPStatus
from nxtools import PLATFORM, logging, log_traceback, critical_error


logging.show_time = True
logging.user = "nebula"


if PLATFORM == "windows":

    def ismount(path):
        """Check if a path is a mounted mount point."""
        return True

else:
    from posixpath import ismount


#
# Config
#


class Config(dict):
    """Nebula config"""

    def __init__(self):
        """Load initial config."""

        super(Config, self).__init__()
        self["site_name"] = "Unnamed"
        self["user"] = "nebula"
        self["host"] = socket.gethostname()
        self["storages"] = {}
        self["rights"] = {}
        self["folders"] = {}
        self["playout_channels"] = {}
        self["ingest_channels"] = {}
        self["cs"] = {}
        self["views"] = {}
        self["meta_types"] = {}
        self["actions"] = {}
        self["services"] = {}

        if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
            local_settings_path = sys.argv[1]
        else:
            local_settings_path = "settings.json"

        settings_files = ["/etc/nebula.json", local_settings_path]
        settings = {}
        if "--daemon" in sys.argv:
            logging.file = os.devnull
            settings["daemon_mode"] = True

        for settings_file in settings_files:
            if os.path.exists(settings_file):
                try:
                    settings.update(json.load(open(settings_file)))
                    break
                except Exception:
                    log_traceback(handlers=False)

        for key, value in dict(os.environ).items():
            if key.lower().startswith("nebula_"):
                key = key.lower().replace("nebula_", "", 1)
                settings[key] = value

        if not settings:
            critical_error("Unable to open site settings")
        self.update(settings)


config = Config()


#
# Utilities
#


def get_hash(string):
    """Create a hash from a given string"""
    string = string + config.get("hash_salt", "")
    return hashlib.sha256(string.encode("ascii")).hexdigest()


#
# Nebula response object
#


class NebulaResponse(object):
    def __init__(self, response=200, message=None, **kwargs):
        self.dict = {"response": response, "message": message}
        self.dict.update(kwargs)

    @property
    def json(self):
        return json.dumps(self.dict)

    @property
    def response(self):
        return self["response"]

    @property
    def message(self):
        return self["message"] or HTTPStatus(self.response).name

    @property
    def data(self):
        return self.get("data", {})

    @property
    def is_success(self):
        return self.response < 400

    @property
    def is_error(self):
        return self.response >= 400

    def get(self, key, default=False):
        return self.dict.get(key, default)

    def __getitem__(self, key):
        return self.dict[key]

    def __len__(self):
        return self.is_success


#
# Filesystem
#


class Storage(object):
    def __init__(self, id, **kwargs):
        self.id = int(id)
        self.settings = kwargs

    def __getitem__(self, key):
        return self.settings[key]

    def __repr__(self):
        r = f"storage ID:{self.id}"
        if self.get("title"):
            r += f" ({self['title']})"
        return r

    def get(self, key, default=None):
        return self.settings.get(key, default)

    @property
    def title(self):
        if "title" in self.settings:
            return self.settings["title"]
        return "Storage {}".format(self.id)

    @property
    def local_path(self):
        if str(self.id) in config.get("alt_storages", []):
            alt_storage_config = config["alt_storages"][str(self.id)]
            if config.get("id_service", -1) in alt_storage_config.get("services", []):
                return alt_storage_config["path"]

        if self["protocol"] == "local":
            return self["path"]
        elif PLATFORM == "unix":
            return os.path.join("/mnt/{}_{:02d}".format(config["site_name"], self.id))
        return ""

    def __len__(self):
        if self["protocol"] == "local" and os.path.isdir(self["path"]):
            return True
        return (
            os.path.isdir(self.local_path)
            and ismount(self.local_path)
            and len(os.listdir(self.local_path)) != 0
        )


class UnknownStorage(object):
    def __init__(self, id, **kwargs):
        self.id = int(id)
        self.title = "Unknown storage {}".format(self.id)

    def __repr__(self):
        return self.title

    def __getitem__(self, key):
        return False

    @property
    def local_path(self):
        return ""

    def __len__(self):
        return 0


class Storages(object):
    def __getitem__(self, key):
        if key not in config["storages"]:
            return UnknownStorage(key)
        return Storage(key, **config["storages"][key])

    def __iter__(self):
        return config["storages"].__iter__()

    def items(self):
        return [(id_storage, self[id_storage]) for id_storage in config["storages"]]


storages = Storages()

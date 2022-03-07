__all__ = ["get_plugin_path", "load_common_scripts"]

import os
import sys

from nxtools import log_traceback

from nx.core.common import storages, config


#
# Plugin root
#


def get_plugin_path(group=False):
    try:
        plugin_path = os.path.join(
            storages[int(config.get("plugin_storage", 1))].local_path,
            config.get("plugin_root", ".nx/scripts/v5"),
        )
    except Exception:
        log_traceback()
        return ""

    if group:
        plugin_path = os.path.join(plugin_path, group)
    if not os.path.exists(plugin_path):
        return ""
    return plugin_path


#
# Common python scripts
#


def load_common_scripts():
    if get_plugin_path():
        common_dir = get_plugin_path("common")
        if (
            os.path.isdir(common_dir)
            and os.listdir(common_dir)
            and common_dir not in sys.path
        ):
            sys.path.insert(0, common_dir)

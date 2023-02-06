import functools
import json
import os
from typing import Literal

from pydantic import Field

import nebula
from server.models import ResponseModel


class PluginItemModel(ResponseModel):
    """Plugin item model.

    This model is used to describe a plugin in the frontend.
    """

    name: str = Field(..., title="Plugin name")
    title: str = Field(..., title="Plugin title")
    icon: str | None = Field(None, title="Addon icon")
    scope: Literal["tool", "mam"] = Field("tool", title="Plugin scope")


@functools.lru_cache()
def get_frontend_plugins():
    """Return a list of frontend plugins.

    Each plugin is scoped to a specific part of the UI.
    Metadata is read from the plugin's package.json file.
    Ready-to-serve frontend plugins are expected to be in the
    `dist` folder of the plugin's package.

    Nebula does not provide any frontend plugins by default,
    nor does not build them.
    """

    plugins = []
    plugin_root = os.path.join(nebula.config.plugin_dir, "frontend")
    if os.path.exists(plugin_root):
        for plugin_name in os.listdir(plugin_root):
            manifest_path = os.path.join(plugin_root, plugin_name, "package.json")
            plugin_path = os.path.join(plugin_root, plugin_name, "dist")
            if not os.path.isdir(plugin_path):
                continue

            plugin_data = {
                "name": plugin_name,
                "title": plugin_name,
                "icon": None,
            }

            if os.path.exists(manifest_path):
                with open(manifest_path, "r") as f:
                    manifest = json.load(f)
                    for key in ["name", "title", "icon", "scope"]:
                        manifest_key = f"nebula.{key}"
                        if manifest_key in manifest:
                            plugin_data[key] = manifest[manifest_key]

            try:
                plugins.append(PluginItemModel(**plugin_data))
            except Exception:
                nebula.log.traceback("Unable to load frontend plugin")
    return plugins

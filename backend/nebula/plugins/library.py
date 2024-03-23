import os
from typing import Any

import tomllib

from nebula.common import classes_from_module, import_module
from nebula.config import config
from nebula.log import log
from nebula.plugins.cli import CLIPlugin
from nebula.plugins.solver import SolverPlugin
from server.request import APIRequest

PLUGIN_TYPES = {
    "solver": SolverPlugin,
    "cli": CLIPlugin,
    "api": APIRequest,
}


class PluginLibrary:
    def __init__(self) -> None:
        self.plugins: dict[str, Any] = {k: [] for k in PLUGIN_TYPES}

        self.init_legacy_plugins()
        self.init_packages()

    def get(self, plugin_type: str, name: str) -> Any:
        type_list = self.plugins.get(plugin_type, [])
        for plugin in type_list:
            if plugin.name == name:
                return plugin
        raise KeyError

    def init_legacy_plugins(self) -> None:
        """Old style plugins are separated by types into directories"""
        for plugin_type_name in self.plugins:
            plugin_type_dir = os.path.join(config.plugin_dir, plugin_type_name)
            if not os.path.isdir(plugin_type_dir):
                continue
            for module_fname in os.listdir(plugin_type_dir):
                module_path = os.path.join(plugin_type_dir, module_fname)

                if os.path.isdir(module_path):
                    module_path = os.path.join(module_path, "__init__.py")
                    if not os.path.isfile(module_path):
                        continue
                    module_name = module_fname
                else:
                    module_name = os.path.splitext(module_fname)[0]

                try:
                    plugin_module = import_module(module_name, module_path)
                except ImportError:
                    log.traceback(f"Error importing module {module_name}")
                    continue
                except Exception:
                    log.traceback(f"Unhandled error importing module {module_name}")
                    continue

                exp_class = PLUGIN_TYPES[plugin_type_name]
                for plugin_class in classes_from_module(exp_class, plugin_module):
                    self.plugins[plugin_type_name].append(plugin_class())

    def init_packages(self) -> None:
        """New style plugins (git compatible) contains 'package.toml' file
        in the root. package.toml contains a list of modules available
        in the package
        """
        for package_fname in os.listdir(config.plugin_dir):
            package_dir = os.path.join(config.plugin_dir, package_fname)
            manifest_path = os.path.join(package_dir, "package.toml")
            if not os.path.isfile(manifest_path):
                continue

            log.trace(f"Loading package {manifest_path}")

            try:
                with open(manifest_path, "rb") as f:
                    manifest = tomllib.load(f)
            except Exception:
                log.traceback(f"Error loading package {package_fname}")
                continue

            module_guide = manifest.get("modules", {})
            for module_fname, plugin_types in module_guide.items():
                module_path = os.path.join(package_dir, module_fname)

                if os.path.isdir(module_path):
                    module_path = os.path.join(module_path, "__init__.py")
                    if not os.path.isfile(module_path):
                        continue
                    module_name = module_fname
                else:
                    module_name = os.path.splitext(module_fname)[0]

                try:
                    plugin_module = import_module(module_name, module_path)
                except ImportError:
                    log.traceback(f"Error importing module {module_name}")
                    continue
                except Exception:
                    log.traceback(f"Unhandled error importing module {module_name}")
                    continue

                for plugin_type_name in plugin_types:
                    exp_class = PLUGIN_TYPES[plugin_type_name]
                    for plugin_class in classes_from_module(exp_class, plugin_module):
                        self.plugins[plugin_type_name].append(plugin_class())


plugin_library = PluginLibrary()

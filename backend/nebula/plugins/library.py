"""Server plugins found in the plugin directory (config.plugin_dir).

A plugin type maps a name (a directory of old-style plugins, or a type in a
package's `package.toml`) to the base class its plugins extend. `nebula`
registers the types it knows (solver, cli); the API server registers
`api` itself, so this module doesn't depend on the server. Plugins load on
first use, after the types are registered.
"""

import os
import tomllib
from types import ModuleType
from typing import Any

from nx.logging import logger as log

import nebula
from nebula.common import classes_from_module, import_module
from nebula.config import config
from nebula.plugins.cli import CLIPlugin
from nebula.plugins.solver import SolverPlugin

PLUGIN_TYPES: dict[str, type] = {
    "solver": SolverPlugin,
    "cli": CLIPlugin,
}


def register_plugin_type(name: str, base_class: type) -> None:
    """Make plugins of this type loadable (e.g. "api" by the server)."""
    PLUGIN_TYPES[name] = base_class
    # Plugins already loaded without this type load again on next use (from
    # the modules already imported)
    plugin_library.reset()


def load_manifest(manifest_path: str) -> dict[str, Any]:
    if not os.path.isfile(manifest_path):
        raise nebula.NotFoundException(f"Manifest file {manifest_path} not found")
    try:
        with open(manifest_path, "rb") as f:
            manifest = tomllib.load(f)
    except Exception as e:
        raise nebula.NebulaException(f"Error loading manifest {manifest_path}") from e
    return manifest


def import_plugin_module(base_dir: str, module_fname: str) -> ModuleType | None:
    """Import a plugin module (a .py file or a package directory).

    None when it isn't one, or when importing it fails (logged).
    """
    module_path = os.path.join(base_dir, module_fname)
    if os.path.isdir(module_path):
        module_path = os.path.join(module_path, "__init__.py")
        if not os.path.isfile(module_path):
            return None
        module_name = module_fname
    else:
        module_name = os.path.splitext(module_fname)[0]

    try:
        return import_module(module_name, module_path)
    except ImportError:
        log.traceback(f"Error importing module {module_name}")
    except Exception:
        log.traceback(f"Unhandled error importing module {module_name}")
    return None


class PluginLibrary:
    def __init__(self) -> None:
        self._plugins: dict[str, list[Any]] | None = None
        # Imported plugin modules by path, kept when plugins are reloaded, so
        # no module runs twice (None: not a plugin module, or it failed)
        self._modules: dict[str, ModuleType | None] = {}

    @property
    def plugins(self) -> dict[str, list[Any]]:
        """Loaded plugins by type. Loads them on first use."""
        if self._plugins is None:
            plugins: dict[str, list[Any]] = {k: [] for k in PLUGIN_TYPES}
            self.init_legacy_plugins(plugins)
            self.init_packages(plugins)
            self._plugins = plugins
        return self._plugins

    def reset(self) -> None:
        """Forget loaded plugins; they load again on next use."""
        self._plugins = None

    def get(self, plugin_type: str, name: str) -> Any:
        type_list = self.plugins.get(plugin_type, [])
        for plugin in type_list:
            if plugin.name == name:
                return plugin
        raise KeyError

    def module(self, base_dir: str, module_fname: str) -> ModuleType | None:
        path = os.path.join(base_dir, module_fname)
        if path not in self._modules:
            self._modules[path] = import_plugin_module(base_dir, module_fname)
        return self._modules[path]

    def init_legacy_plugins(self, plugins: dict[str, list[Any]]) -> None:
        """Old style plugins are separated by types into directories"""
        for plugin_type_name, found in plugins.items():
            plugin_type_dir = os.path.join(config.plugin_dir, plugin_type_name)
            if not os.path.isdir(plugin_type_dir):
                continue
            for module_fname in os.listdir(plugin_type_dir):
                if (
                    plugin_module := self.module(plugin_type_dir, module_fname)
                ) is None:
                    continue
                exp_class = PLUGIN_TYPES[plugin_type_name]
                for plugin_class in classes_from_module(exp_class, plugin_module):
                    found.append(plugin_class())

    def init_packages(self, plugins: dict[str, list[Any]]) -> None:
        """New style plugins (git compatible) contains 'package.toml' file
        in the root. package.toml contains a list of modules available
        in the package
        """
        for package_fname in os.listdir(config.plugin_dir):
            package_dir = os.path.join(config.plugin_dir, package_fname)
            manifest_path = os.path.join(package_dir, "package.toml")

            try:
                manifest = load_manifest(manifest_path)
            except nebula.NebulaException:
                continue

            log.trace(f"Loading package {manifest_path}")

            module_guide = manifest.get("modules", {})
            for module_fname, plugin_types in module_guide.items():
                if (plugin_module := self.module(package_dir, module_fname)) is None:
                    continue

                for plugin_type_name in plugin_types:
                    if (exp_class := PLUGIN_TYPES.get(plugin_type_name)) is None:
                        # e.g. "api" in a CLI process, where the server
                        # hasn't registered it
                        log.debug(
                            f"Skipping {module_fname} {plugin_type_name} plugins: "
                            "plugin type not registered"
                        )
                        continue
                    for plugin_class in classes_from_module(exp_class, plugin_module):
                        plugins.setdefault(plugin_type_name, []).append(plugin_class())


plugin_library = PluginLibrary()

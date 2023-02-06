import argparse
import inspect
import os
import sys

import nebula
from nebula.common import classes_from_module, import_module


def get_plugin(name: str):
    plugin_root = os.path.join(nebula.config.plugin_dir, "cli")

    for module_fname in os.listdir(plugin_root):
        module_path = os.path.join(plugin_root, module_fname)

        if os.path.isdir(module_path):
            module_path = os.path.join(module_path, "__init__.py")
            if not os.path.isfile(module_path):
                continue
            module_name = module_fname
        else:
            module_name = os.path.splitext(module_fname)[0]

        try:
            plugin_module = import_module(module_name, module_path)
        except ModuleNotFoundError:
            nebula.log.error(f"Module {name} not found")
        except ImportError:
            nebula.log.traceback(f"Error importing module {name}")

        for plugin_class in classes_from_module(
            nebula.plugins.CLIPlugin, plugin_module
        ):
            if plugin_class.name == name:
                return plugin_class()
    nebula.log.error(f"Plugin {name} not found")
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("plugin")
    parser.add_argument("args", nargs=argparse.REMAINDER)
    args = parser.parse_args()

    kwargs = {}
    for arg in args.args:
        if "=" in arg:
            k, v = arg.split("=", 1)
            k = k.lstrip("-")
            kwargs[k] = v

    plugin = get_plugin(args.plugin)

    expected_args = inspect.signature(plugin.main).parameters
    final_kwargs = {}
    for arg in expected_args:
        if arg not in kwargs:
            final_kwargs[arg] = expected_args[arg].default
        else:
            default = expected_args[arg].default
            # TODO: Handle none better
            if default is None:
                final_kwargs[arg] = kwargs[arg]
            else:
                final_kwargs[arg] = type(expected_args[arg].default)(kwargs[arg])

    if plugin:
        nebula.run(plugin.main(**kwargs))


if __name__ == "__main__":
    main()

import argparse
import inspect
import sys

import nebula
from nebula.plugins.library import plugin_library


def main() -> None:
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

    try:
        plugin = plugin_library.get("cli", args.plugin)
    except KeyError:
        nebula.log.critical(f"Plugin {args.plugin} not found")
        sys.exit(-1)

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

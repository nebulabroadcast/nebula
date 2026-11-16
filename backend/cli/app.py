"""The `python -m cli` application: built-in commands and site CLI plugins.

Both are `CLIPlugin` classes. A plugin with `async def main(...)` is one
command. A plugin without `main` is a group: each of its public
`async def` methods is a sub-command. Arguments come from the method's
signature (see cli.arguments).
"""

import importlib
import inspect
import pkgutil
from collections.abc import Iterable
from typing import Any

import typer

import nebula
from cli import commands
from cli.arguments import KeyValueCommand, command_function
from nebula.common import classes_from_module
from nebula.plugins import CLIPlugin
from nebula.plugins.library import plugin_library

ANY_ARGUMENTS = {"allow_extra_args": True, "ignore_unknown_options": True}


def help_of(obj: Any) -> str | None:
    """The docstring of a class or method itself (not an inherited one)."""
    return inspect.cleandoc(obj.__doc__) if obj.__doc__ else None


def add_method(app: typer.Typer, name: str, method: Any, help_text: str | None) -> None:
    function, takes_any = command_function(method)
    app.command(
        name=name,
        help=help_text,
        cls=KeyValueCommand,
        context_settings=ANY_ARGUMENTS if takes_any else None,
    )(function)


def sub_commands(plugin: CLIPlugin) -> dict[str, Any]:
    """Public coroutine methods the plugin's class defines, by command name."""
    found = {}
    for name, member in vars(type(plugin)).items():
        if name.startswith("_") or not inspect.iscoroutinefunction(member):
            continue
        found[name.replace("_", "-")] = getattr(plugin, name)
    return found


def add_plugin(app: typer.Typer, plugin: CLIPlugin) -> None:
    plugin_help = help_of(type(plugin))
    if (main := getattr(plugin, "main", None)) is not None:
        add_method(app, plugin.name, main, plugin_help)
        return

    methods = sub_commands(plugin)
    if not methods:
        nebula.log.warning(f"CLI plugin '{plugin.name}' has no commands")
        return
    group = typer.Typer(no_args_is_help=True)
    for name, method in methods.items():
        add_method(group, name, method, help_of(method))
    app.add_typer(group, name=plugin.name, help=plugin_help)


def builtin_plugins() -> list[CLIPlugin]:
    """Plugins of the modules in `cli/commands/`."""
    plugins: list[CLIPlugin] = []
    for module_info in pkgutil.iter_modules(commands.__path__):
        module = importlib.import_module(f"{commands.__name__}.{module_info.name}")
        plugins.extend(
            plugin_class()
            for plugin_class in classes_from_module(CLIPlugin, module)
            # not the classes the module only imports
            if plugin_class.__module__ == module.__name__
        )
    return plugins


def build_app(site_plugins: Iterable[CLIPlugin] | None = None) -> typer.Typer:
    app = typer.Typer(
        help="Nebula command line tools.",
        no_args_is_help=True,
        add_completion=False,
        pretty_exceptions_enable=False,
    )

    @app.callback()
    def root() -> None:
        # With a callback Typer keeps the command names also when there is
        # only one command; without it, that command becomes the app
        pass

    if site_plugins is None:
        site_plugins = plugin_library.plugins.get("cli", [])

    taken: set[str] = set()
    for plugin in site_plugins:
        if plugin.name in taken:
            # As before Typer: the first plugin of a name is the command
            nebula.log.warning(f"More than one CLI plugin is named '{plugin.name}'")
            continue
        add_plugin(app, plugin)
        taken.add(plugin.name)

    for plugin in builtin_plugins():
        if plugin.name in taken:
            nebula.log.warning(
                f"Built-in command '{plugin.name}' is shadowed by a site plugin"
            )
            continue
        add_plugin(app, plugin)
        taken.add(plugin.name)
    return app

"""The `python -m cli` application: built-in commands and site CLI plugins.

Both are `CLIPlugin` classes. A plugin with `async def main(...)` is one
command. A plugin without `main` is a group: each of its public
`async def` methods is a sub-command. Arguments are Typer's own, read
from the method's signature and type hints.
"""

import functools
import inspect
from collections.abc import Iterable
from typing import Any

import typer

import nebula
from cli.commands import BUILTIN_PLUGINS
from cli.run import run
from nebula.plugins import CLIPlugin
from nebula.plugins.library import plugin_library


def add_method(
    app: typer.Typer, name: str, method: Any, help_text: str | None = None
) -> None:
    # Typer calls an `async def` without awaiting it, so it gets a plain
    # function. It reads the method's signature, type hints and docstring
    # through `functools.wraps`.
    @functools.wraps(method)
    def function(**kwargs: Any) -> None:
        run(method(**kwargs))

    app.command(name=name, help=help_text)(function)


def sub_commands(plugin: CLIPlugin) -> dict[str, Any]:
    """Public coroutine methods the plugin's class defines, by command name."""
    found = {}
    for name, member in vars(type(plugin)).items():
        if name.startswith("_") or not inspect.iscoroutinefunction(member):
            continue
        found[name.replace("_", "-")] = getattr(plugin, name)
    return found


def add_plugin(app: typer.Typer, plugin: CLIPlugin) -> None:
    # The docstring of the class itself: a class doesn't inherit `__doc__`
    plugin_help = type(plugin).__doc__
    if (main := getattr(plugin, "main", None)) is not None:
        add_method(app, plugin.name, main, plugin_help)
        return

    methods = sub_commands(plugin)
    if not methods:
        nebula.log.warning(f"CLI plugin '{plugin.name}' has no commands")
        return
    group = typer.Typer(no_args_is_help=True)
    for name, method in methods.items():
        add_method(group, name, method)
    app.add_typer(group, name=plugin.name, help=plugin_help)


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

    # Site plugins first: of two commands with one name the first is used,
    # so a site plugin replaces a built-in command
    taken: set[str] = set()
    for plugin in [*site_plugins, *(cls() for cls in BUILTIN_PLUGINS)]:
        if plugin.name in taken:
            nebula.log.warning(
                f"More than one CLI command is named '{plugin.name}': "
                "the first one is used"
            )
            continue
        add_plugin(app, plugin)
        taken.add(plugin.name)
    return app

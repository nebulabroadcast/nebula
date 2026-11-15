"""The `python -m cli` application: built-in commands and site CLI plugins."""

import importlib
import inspect
import pkgutil
from collections.abc import Iterable
from typing import Any

import typer

import nebula
from cli import commands
from cli.legacy import ArgumentError, describe_parameters, parse_arguments
from cli.run import run
from nebula.plugins.library import plugin_library

LEGACY_CONTEXT = {"allow_extra_args": True, "ignore_unknown_options": True}


def plugin_help(plugin: Any) -> str | None:
    """The plugin class's own docstring (not an inherited one)."""
    return inspect.cleandoc(doc) if (doc := type(plugin).__doc__) else None


def add_site_plugin(app: typer.Typer, plugin: Any) -> None:
    if (plugin_app := getattr(plugin, "app", None)) is not None:
        app.add_typer(plugin_app, name=plugin.name, help=plugin_help(plugin))
        return

    def command(ctx: typer.Context) -> None:
        # Typer passes every word through: they are read by the old rule
        try:
            kwargs = parse_arguments(plugin.main, ctx.args)
        except ArgumentError as e:
            typer.echo(f"Error: {e}", err=True)
            raise typer.Exit(2) from e
        run(plugin.main(**kwargs))

    # Not Typer options, so the help has to name them
    arguments = describe_parameters(plugin.main)
    help_text = "\n\n".join(
        part
        for part in (plugin_help(plugin), f"Arguments (key=value): {arguments}")
        if part
    )
    app.command(name=plugin.name, help=help_text, context_settings=LEGACY_CONTEXT)(
        command
    )


def add_builtin_commands(app: typer.Typer, taken: set[str]) -> None:
    """Commands in `cli/commands/`: a module has `app` or `command`."""
    for module_info in pkgutil.iter_modules(commands.__path__):
        name = module_info.name.replace("_", "-")
        if name in taken:
            nebula.log.warning(
                f"Built-in command '{name}' is shadowed by a site plugin"
            )
            continue
        module = importlib.import_module(f"{commands.__name__}.{module_info.name}")
        if (command_app := getattr(module, "app", None)) is not None:
            app.add_typer(command_app, name=name)
        elif (command := getattr(module, "command", None)) is not None:
            app.command(name=name)(command)


def build_app(site_plugins: Iterable[Any] | None = None) -> typer.Typer:
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
        add_site_plugin(app, plugin)
        taken.add(plugin.name)
    add_builtin_commands(app, taken)
    return app

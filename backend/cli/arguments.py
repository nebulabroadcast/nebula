"""Command line arguments of a command, taken from its method's signature.

A command is an `async def` method of a `CLIPlugin`. Its parameters are
the command's arguments, by Typer's rules: a parameter without a default
is a positional argument, one with a default is an `--option`. Type hints
give the types; a parameter without one takes the type of its default.

Besides `--limit 5` and `--dry`, the older `limit=5` and `dry=true` are
accepted, as plugins were called before the CLI used Typer.
"""

import functools
import inspect
import re
import typing
from collections.abc import Callable, Coroutine
from typing import Any

import typer
from typer.core import TyperCommand

from cli.run import run

# The name of the parameter that gives a command Typer's context. Only
# commands with **kwargs have it: the words Typer didn't use go there.
CONTEXT = "typer_context"
KEY_VALUE = re.compile(r"^-{0,2}([A-Za-z_][\w-]*)=(.*)$", re.DOTALL)
TRUE_VALUES = {"true", "1", "yes"}
FALSE_VALUES = {"false", "0", "no"}

Method = Callable[..., Coroutine[Any, Any, Any]]


def key_value(word: str) -> tuple[str, str] | None:
    if (match := KEY_VALUE.match(word)) is None:
        return None
    return match.group(1).replace("-", "_"), match.group(2)


def flag(param: Any, value: str) -> str | None:
    """`--dry` or `--no-dry` for `dry=true` / `dry=false`; None otherwise."""
    if value.lower() in TRUE_VALUES:
        return str(param.opts[0])
    if value.lower() in FALSE_VALUES and param.secondary_opts:
        return str(param.secondary_opts[0])
    return None


class KeyValueCommand(TyperCommand):
    """A command that also takes its arguments as `key=value` words."""

    def parse_args(self, ctx: Any, args: list[str]) -> list[str]:
        return super().parse_args(ctx, [self.translate(word) for word in args])

    def translate(self, word: str) -> str:
        """`key=value` as the option or argument Typer knows; else the word."""
        if (pair := key_value(word)) is None:
            return word
        key, value = pair
        param = next((p for p in self.params if p.name == key), None)
        if param is None:
            return word
        option = param.opts[0]
        if not option.startswith("-"):
            return value  # a positional argument given by name
        if getattr(param, "is_flag", False):
            return flag(param, value) or word
        return f"{option}={value}"


def annotation_of(parameter: inspect.Parameter, hints: dict[str, Any]) -> Any:
    if parameter.name in hints:
        return hints[parameter.name]
    # No type hint: the type of the default, as plugins without hints expect
    if isinstance(parameter.default, bool | int | float):
        return type(parameter.default)
    return str


def command_function(method: Method) -> tuple[Callable[..., None], bool]:
    """A function Typer can register for a bound `async def` method.

    It has the method's parameters (with types filled in) and runs the
    method. The second value tells whether the method has `**kwargs`: such
    a command also takes any `key=value` word, passed on as a keyword
    argument.
    """
    signature = inspect.signature(method)
    hints = typing.get_type_hints(method, include_extras=True)

    parameters = []
    takes_any = False
    for parameter in signature.parameters.values():
        if parameter.kind is inspect.Parameter.VAR_KEYWORD:
            takes_any = True
        elif parameter.kind is not inspect.Parameter.VAR_POSITIONAL:
            parameters.append(
                parameter.replace(annotation=annotation_of(parameter, hints))
            )
    if takes_any:
        parameters.append(
            inspect.Parameter(
                CONTEXT, inspect.Parameter.KEYWORD_ONLY, annotation=typer.Context
            )
        )

    @functools.wraps(method)
    def function(**kwargs: Any) -> None:
        context = kwargs.pop(CONTEXT, None)
        if context is not None:
            for word in context.args:
                if (pair := key_value(word)) is None:
                    typer.echo(f"Error: Expected key=value, got '{word}'", err=True)
                    raise typer.Exit(2)
                kwargs[pair[0]] = pair[1]
        run(method(**kwargs))

    # Typer reads these, not the method's own
    function.__signature__ = signature.replace(  # type: ignore[attr-defined]
        parameters=parameters, return_annotation=None
    )
    function.__annotations__ = {p.name: p.annotation for p in parameters}
    return function, takes_any

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
# Types of defaults Typer can show and pass on
SIMPLE_DEFAULTS = (str, int, float, bool, type(None))


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
        words: list[str] = []
        named: dict[str, str] = {}  # positional arguments given by name
        for word in args:
            pair = key_value(word)
            param = pair and next((p for p in self.params if p.name == pair[0]), None)
            if not pair or param is None:
                words.append(word)  # not ours: Typer takes or reports it
            elif not param.opts[0].startswith("-"):
                named[pair[0]] = pair[1]
            elif getattr(param, "is_flag", False):
                words.append(flag(param, pair[1]) or word)
            else:
                words.append(f"{param.opts[0]}={pair[1]}")
        # In the order of the signature, whatever order they were given in
        words.extend(named[p.name] for p in self.params if p.name in named)
        return super().parse_args(ctx, words)


def annotation_of(parameter: inspect.Parameter, hints: dict[str, Any]) -> Any:
    if parameter.name in hints:
        return hints[parameter.name]
    # No type hint: the type of the default, as plugins without hints expect
    if isinstance(parameter.default, bool | int | float):
        return type(parameter.default)
    return str


def is_simple(parameter: inspect.Parameter, hints: dict[str, Any]) -> bool:
    """Whether Typer can take the parameter as it is."""
    return (
        parameter.name in hints
        or parameter.default is inspect.Parameter.empty
        or isinstance(parameter.default, SIMPLE_DEFAULTS)
    )


def typer_parameters(
    method: Method,
) -> tuple[list[inspect.Parameter], set[str], bool]:
    """The method's parameters as Typer takes them.

    Also the names of those that keep the method's own default, and
    whether the method has `**kwargs`.
    """
    hints = typing.get_type_hints(method, include_extras=True)
    parameters = []
    keeps_default: set[str] = set()
    takes_any = False
    for parameter in inspect.signature(method).parameters.values():
        if parameter.kind is inspect.Parameter.VAR_KEYWORD:
            takes_any = True
        elif parameter.kind is inspect.Parameter.VAR_POSITIONAL:
            continue
        elif not is_simple(parameter, hints):
            # A default Typer can't show or pass on (a list, an object):
            # the option is optional text, and when it isn't given the
            # method is called without it and uses its own default
            keeps_default.add(parameter.name)
            parameters.append(parameter.replace(annotation=str | None, default=None))
        else:
            parameters.append(
                parameter.replace(annotation=annotation_of(parameter, hints))
            )
    if takes_any:
        parameters.append(
            inspect.Parameter(
                CONTEXT, inspect.Parameter.KEYWORD_ONLY, annotation=typer.Context
            )
        )
    return parameters, keeps_default, takes_any


def command_function(method: Method) -> tuple[Callable[..., None], bool]:
    """A function Typer can register for a bound `async def` method.

    It has the method's parameters (with types filled in) and runs the
    method. The second value tells whether the method has `**kwargs`: such
    a command also takes any `key=value` word, passed on as a keyword
    argument.
    """
    parameters, keeps_default, takes_any = typer_parameters(method)

    @functools.wraps(method)
    def function(**kwargs: Any) -> None:
        context = kwargs.pop(CONTEXT, None)
        for name in keeps_default:
            if kwargs[name] is None:
                del kwargs[name]
        if context is not None:
            for word in context.args:
                if (pair := key_value(word)) is None:
                    typer.echo(f"Error: Expected key=value, got '{word}'", err=True)
                    raise typer.Exit(2)
                kwargs[pair[0]] = pair[1]
        run(method(**kwargs))

    # Typer reads these, not the method's own
    function.__signature__ = inspect.Signature(parameters)  # type: ignore[attr-defined]
    function.__annotations__ = {p.name: p.annotation for p in parameters}
    return function, takes_any

"""Running coroutines from Typer commands, which can't be `async def`."""

import functools
from collections.abc import Callable, Coroutine
from typing import Any

import typer

import nebula


def run(entrypoint: Coroutine[Any, Any, Any]) -> None:
    """Run a command's coroutine: settings loaded, errors logged, exit 1."""
    try:
        nebula.run(entrypoint)
    except typer.Exit:
        raise
    except Exception as e:
        nebula.log.traceback("Command failed")
        raise typer.Exit(1) from e


def run_async[**P](
    func: Callable[P, Coroutine[Any, Any, Any]],
) -> Callable[P, None]:
    """Make a coroutine function a Typer command.

    Used under `@app.command()`. Typer reads the wrapped function's
    signature, so options and arguments are declared as usual.
    """

    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> None:
        run(func(*args, **kwargs))

    return wrapper

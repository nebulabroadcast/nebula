"""Running a command's coroutine."""

from collections.abc import Coroutine
from typing import Any

import typer

import nebula


def run(entrypoint: Coroutine[Any, Any, Any]) -> None:
    """Run a command: settings loaded, errors logged, exit 1."""
    try:
        nebula.run(entrypoint)
    except typer.Exit:
        raise
    except Exception as e:
        nebula.log.traceback("Command failed")
        raise typer.Exit(1) from e

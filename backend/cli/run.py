"""Running a command's coroutine."""

import signal
from collections.abc import Coroutine
from typing import Any

import typer

import nebula


async def interruptible(entrypoint: Coroutine[Any, Any, Any]) -> None:
    # asyncio.run takes Ctrl+C as "cancel the task". A prompt is a blocking
    # call that doesn't notice, so it took a second Ctrl+C. With Python's
    # own handler the first one interrupts whatever is running.
    signal.signal(signal.SIGINT, signal.default_int_handler)
    await entrypoint


def run(entrypoint: Coroutine[Any, Any, Any]) -> None:
    """Run a command: settings loaded, errors logged, exit 1."""
    try:
        nebula.run(interruptible(entrypoint))
    except typer.Exit, typer.Abort:
        # Abort is Ctrl+C in a prompt: Typer prints "Aborted." and exits 1
        raise
    except Exception as e:
        nebula.log.traceback("Command failed")
        raise typer.Exit(1) from e

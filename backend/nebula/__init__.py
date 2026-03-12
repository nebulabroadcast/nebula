__all__ = [
    "DB",
    "Asset",
    # Exceptions
    "BadRequestException",
    "Bin",
    # Plugins
    "CLIPlugin",
    "ConflictException",
    "Event",
    "ForbiddenException",
    "Item",
    "LoginFailedException",
    "NebulaException",
    "NotFoundException",
    "NotImplementedException",
    "RequestSettingsReload",
    "Storage",
    "UnauthorizedException",
    "User",
    "ValidationException",
    "__version__",
    "config",
    "db",
    "log",
    "msg",
    "redis",
    "run",
    "settings",
    "storages",
]

import sys

from nebula.version import __version__

if "--version" in sys.argv:
    sys.exit(0)

import asyncio

from .config import config
from .db import DB, db
from .exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    LoginFailedException,
    NebulaException,
    NotFoundException,
    NotImplementedException,
    RequestSettingsReload,
    UnauthorizedException,
    ValidationException,
)
from .log import LogLevel, log
from .messaging import msg
from .objects.asset import Asset
from .objects.bin import Bin
from .objects.event import Event
from .objects.item import Item
from .objects.user import User
from .plugins import CLIPlugin
from .redis import Redis as redis
from .settings import load_settings, settings
from .storages import Storage, storages

log.user = "nebula"
log.level = LogLevel[config.log_level.upper()]


def run(entrypoint) -> None:  # type: ignore
    """Run a coroutine in the event loop.

    This function is used to run the main entrypoint of CLI scripts.
    It loads the settings and starts the event loop and runs a
    given entrypoint coroutine.
    """

    async def run_async() -> None:
        await load_settings()
        await entrypoint

    asyncio.run(run_async())

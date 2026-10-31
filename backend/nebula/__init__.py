__all__ = [
    "DB",
    "Asset",
    "BadGatewayException",
    "BadRequestException",
    "Bin",
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
    "context",
    "db",
    "initialize",
    "log",
    "msg",
    "redis",
    "run",
    "settings",
    "storages",
]

import asyncio
from collections.abc import Coroutine
from typing import Any

from nx.db import DB, db
from nx.logging import LogLevel
from nx.logging import logger as log
from nx.redis import redis

from . import context
from .config import config
from .exceptions import (
    BadGatewayException,
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
from .messaging import msg
from .objects.asset import Asset
from .objects.bin import Bin
from .objects.event import Event
from .objects.item import Item
from .objects.user import User
from .plugins import CLIPlugin
from .settings import load_settings, settings
from .storages import Storage, storages
from .version import __version__


def initialize() -> None:
    """Configure the shared nx singletons (log, redis) with nebula-specific values."""
    log.level = LogLevel[config.log_level.upper()]
    redis.channel = f"nebula-{config.site_name}"


initialize()


def run(entrypoint: Coroutine[Any, Any, Any]) -> None:
    """Run a coroutine in the event loop.

    This function is used to run the main entrypoint of CLI scripts.
    It loads the settings and starts the event loop and runs a
    given entrypoint coroutine.
    """

    async def run_async() -> None:
        await load_settings()
        await entrypoint

    asyncio.run(run_async())

__all__ = [
    "config",
    "settings",
    "db",
    "DB",
    "redis",
    "Asset",
    "Item",
    "Bin",
    "Event",
    "User",
    "msg",
    "log",
    "run",
    "Storage",
    "storages",
    # Exceptions
    "BadRequestException",
    "ForbiddenException",
    "NotFoundException",
    "UnauthorizedException",
    "LoginFailedException",
    "NotImplementedException",
    "ConflictException",
    "ValidationException",
    # Plugins
    "CLIPlugin",
]

import asyncio

from .config import config
from .db import DB, db
from .exceptions import (
    NebulaException,
    BadRequestException,
    ConflictException,
    ForbiddenException,
    LoginFailedException,
    NotFoundException,
    NotImplementedException,
    UnauthorizedException,
    ValidationException,
)
from .log import log
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


def run(entrypoint):
    """Run a coroutine in the event loop.

    This function is used to run the main entrypoint of CLI scripts.
    It loads the settings and starts the event loop and runs a
    given entrypoint coroutine.
    """

    async def run_async():
        await load_settings()
        await entrypoint

    asyncio.run(run_async())

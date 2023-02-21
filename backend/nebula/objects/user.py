import hashlib
from typing import Any

import asyncpg
from pydantic import BaseModel, Field

from nebula.config import config
from nebula.db import db
from nebula.exceptions import (
    LoginFailedException,
    NebulaException,
    NotFoundException,
    NotImplementedException,
)
from nebula.objects.base import BaseObject


def hash_password(password: str):
    if config.password_hashing == "legacy":
        return hashlib.sha256(password.encode("ascii")).hexdigest()
    raise NotImplementedException


class UserRights(BaseModel):
    """User rights model"""

    # TODO
    asset_view: bool | list[int] = Field(True)
    asset_edit: bool | list[int] = Field(True)
    scheduler_view: bool | list[int] = Field(True)
    scheduler_edit: bool | list[int] = Field(True)
    rundown_view: bool | list[int] = Field(True)
    rundown_edit: bool | list[int] = Field(
        True,
        description="Use list of channel IDs for channel-specific rights",
    )
    job_control: bool | list[int] = Field(
        True,
        description="Use list of action IDs to grant access to specific actions",
    )


class User(BaseObject):
    object_type: str = "user"
    db_columns: list[str] = [
        "login",
        "password",
    ]

    @property
    def language(self):
        """Return the preferred language of the user."""
        return self["language"] or "en"

    @property
    def name(self):
        return self.meta["login"]

    # setter for name
    @name.setter
    def name(self, value):
        self.meta["login"] = value

    @classmethod
    async def by_login(cls, login: str) -> "User":
        """Return the user with the given login."""
        row = await db.fetch("SELECT meta FROM users WHERE login = $1", login)
        if not row:
            raise NotFoundException
        return cls.from_row(row[0])

    @classmethod
    async def login(cls, username: str, password: str) -> "User":
        """Return a User instance based on username and password."""

        passhash = hash_password(password)
        try:
            res = await db.fetch(
                """
                SELECT meta FROM users
                WHERE login = $1 AND meta->>'password' = $2
                """,
                username,
                passhash,
            )
        except asyncpg.exceptions.UndefinedTableError:
            raise NebulaException("Nebula is not installed")
        if not res:
            raise LoginFailedException
        return cls(meta=res[0]["meta"])

    def set_password(self, password: str):
        self.meta["password"] = hash_password(password)

    def can(
        self,
        action: str,
        value: Any = None,
        anyval: bool = False,
    ) -> bool:
        """Return True if the user can perform the given action."""

        if self["is_admin"]:
            return True
        key = f"can/{action}"

        if not self[key]:
            return False

        if anyval:
            return True

        if self[key] is True:
            return True

        if self[key] == value:
            return True

        if isinstance(self[key], list):
            if value in self[key]:
                return True

        return False

    @property
    def is_admin(self):
        return self.meta.get("is_admin", False)

    @property
    def is_limited(self):
        """Is the user limited.

        Limited users can view only their own, or explicitly assigned
        objects. For assets, asset has to have 'author' set to the user.

        For channels, the user has to have 'channel' key set to the channel id
        """
        return self.meta.get("is_limited", False)

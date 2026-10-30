import asyncio
import functools
import hashlib
import hmac
import secrets
import string
from typing import Any, cast

import asyncpg
from nx.db import db

from nebula.context import require_access
from nebula.exceptions import (
    ConflictException,
    LoginFailedException,
    NebulaException,
    NotFoundException,
    ValidationException,
)
from nebula.objects.base import BaseObject
from nebula.settings import settings
from nebula.settings.common import LanguageCode

MIN_PASSWORD_LENGTH = 8

API_KEY_ALPHABET = string.ascii_letters + string.digits + "_"

# Keys that can't be changed through User.apply_changes
READ_ONLY_KEYS = {"id", "ctime", "mtime"}
SECRET_KEYS = {"password", "api_key", "api_key_preview"}

# Keys users may change on their own account. So may any editable
# metatype in the user namespace ("u"), except the admin-only keys
# (some of them, like is_admin, are "u" metatypes too).
SELF_EDITABLE_KEYS = {"email", "full_name", "language"}
ADMIN_ONLY_KEYS = {"login", "is_admin", "is_limited", "local_network_only"}


# scrypt cost: ~16 MB of memory and a few tens of ms per hash
SCRYPT_N, SCRYPT_R, SCRYPT_P = 2**14, 8, 1


def _scrypt(password: str, salt: bytes, n: int, r: int, p: int) -> bytes:
    return hashlib.scrypt(password.encode("utf-8"), salt=salt, n=n, r=r, p=p)


def hash_password(password: str) -> str:
    """Return a salted hash: scrypt$n$r$p$salt$hash."""
    salt = secrets.token_bytes(16)
    digest = _scrypt(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${salt.hex()}${digest.hex()}"


def hash_api_key(api_key: str) -> str:
    # API keys are long and random, so a fast hash is enough. It must be
    # unsalted: users are looked up by it
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def is_legacy_hash(stored: str) -> bool:
    """Unsalted SHA-256, from before scrypt. Replaced on the next login."""
    return not stored.startswith("scrypt$")


def verify_password(password: str, stored: str) -> bool:
    if not stored:
        return False
    if is_legacy_hash(stored):
        candidate = hash_api_key(password)  # the same unsalted SHA-256
        return hmac.compare_digest(candidate, stored)
    _, n, r, p, salt, digest = stored.split("$")
    computed = _scrypt(password, bytes.fromhex(salt), int(n), int(r), int(p))
    return hmac.compare_digest(computed.hex(), digest)


@functools.cache
def _dummy_hash() -> str:
    """Checked when no user matches, so a wrong login name takes as long
    as a wrong password."""
    return hash_password(secrets.token_hex(16))


def generate_api_key() -> str:
    """Return a new random API key (nb.xxxxxxxxxxxx.xxxxxxxxxxxx...)."""
    segments = [
        "".join(secrets.choice(API_KEY_ALPHABET) for _ in range(12)) for _ in range(4)
    ]
    return "nb." + ".".join(segments)


def is_self_editable(key: str) -> bool:
    if key in ADMIN_ONLY_KEYS or key.startswith("can/"):
        return False
    if key in SELF_EDITABLE_KEYS:
        return True
    meta_type = settings.metatypes.get(key)
    return meta_type is not None and meta_type.ns == "u" and meta_type.editable


class User(BaseObject):
    object_type: str = "user"
    db_columns: list[str] = [
        "login",
        "password",
    ]
    defaults: dict[str, Any] = {
        # In the database, password is not nullable,
        # but we want to be able to create users without password
        # (e.g. with OAuth or API key)
        "password": "",
    }

    @property
    def language(self) -> LanguageCode:
        """Return the preferred language of the user."""
        return self["language"] or settings.system.language

    @property
    def name(self) -> str:
        return cast("str", self.meta["login"])

    # setter for name
    @name.setter
    def name(self, value: str) -> None:
        self.meta["login"] = value

    @property
    def display_name(self) -> str:
        """Return the display name of the user."""
        return self.meta.get("full_name") or self.name

    @classmethod
    async def by_login(cls, login: str) -> User:
        """Return the user with the given login."""
        row = await db.fetch("SELECT meta FROM users WHERE login = $1", login)
        if not row:
            raise NotFoundException(f"User {login} not found")
        return cls.from_row(row[0])

    @classmethod
    async def by_api_key(cls, api_key: str) -> User:
        api_key_hash = hash_api_key(api_key)
        row = await db.fetch(
            "SELECT meta FROM users WHERE meta->>'api_key' = $1",
            api_key_hash,
        )
        if not row:
            raise NotFoundException(f"User with API key {api_key} not found")
        return cls.from_row(row[0])

    @classmethod
    async def by_email(cls, email: str) -> User:
        """Return the user with the given email."""
        row = await db.fetch(
            """
            SELECT meta FROM users WHERE lower(meta->>'email') = lower($1)
            """,
            email,
        )
        if not row:
            raise NotFoundException(f"User with email {email} not found")
        return cls.from_row(row[0])

    @classmethod
    async def login(cls, username: str, password: str) -> User:
        """Return a User instance based on username and password."""
        if not password:
            raise LoginFailedException("Password cannot be empty")
        try:
            res = await db.fetch(
                """
                SELECT meta FROM users
                WHERE lower(login) = lower($1) OR lower(meta->>'email') = lower($1)
                """,
                username,
            )
        except asyncpg.exceptions.UndefinedTableError as e:
            raise NebulaException("Nebula is not installed") from e

        # Several rows if one user's login is another one's email
        metas = [dict(row["meta"]) for row in res]
        if not metas:
            metas = [{"password": await asyncio.to_thread(_dummy_hash)}]
        for meta in metas:
            stored = meta.get("password") or ""
            if await asyncio.to_thread(verify_password, password, stored):
                user = cls(meta=meta)
                if is_legacy_hash(stored):
                    await user._upgrade_password_hash(password)
                return user
        raise LoginFailedException(
            "Invalid user name/password combination",
            log=f"Invalid logging attempted with name '{username}'",
        )

    async def _upgrade_password_hash(self, password: str) -> None:
        """Store a legacy hash as scrypt. Only the password: a login
        isn't an edit (no mtime, no change notification)."""
        await self.set_password(password)
        await db.execute(
            """
            UPDATE users
            SET password = $1, meta = jsonb_set(meta, '{password}', to_jsonb($2::text))
            WHERE id = $3
            """,
            # Twice: $1 is VARCHAR, $2 TEXT, one parameter can't be both
            self.meta["password"],
            self.meta["password"],
            self.id,
        )

    async def set_password(self, password: str) -> None:
        # scrypt takes tens of ms: off the event loop
        self.meta["password"] = await asyncio.to_thread(hash_password, password)

    def set_api_key(self, api_key: str) -> None:
        self.meta["api_key"] = hash_api_key(api_key)
        self.meta["api_key_preview"] = api_key[:4] + "*******" + api_key[-4:]

    @property
    def has_password(self) -> bool:
        return bool(self.meta.get("password"))

    @property
    def permissions(self) -> dict[str, Any]:
        """Permissions (`can/*` keys) without the prefix."""
        return {
            key.removeprefix("can/"): value
            for key, value in self.meta.items()
            if key.startswith("can/")
        }

    def set_permissions(self, permissions: dict[str, Any]) -> None:
        """Set permissions (without the `can/` prefix). None removes one."""
        for key, value in permissions.items():
            self[f"can/{key}"] = value

    async def save(self, notify: bool = True, **kwargs: Any) -> None:
        try:
            await super().save(notify=notify, **kwargs)
        except asyncpg.exceptions.UniqueViolationError as e:
            raise ConflictException(f"Login '{self.meta.get('login')}' is taken") from e

    #
    # Access controlled operations
    # (trusted code in system context always passes the checks)
    #

    def _is_acting_user(self, user: User) -> bool:
        return self.id is not None and user.id == self.id

    @classmethod
    def ensure_can_list(cls) -> None:
        require_access(lambda u: u.is_admin, "You are not allowed to list users")

    @classmethod
    def ensure_can_create(cls) -> None:
        require_access(lambda u: u.is_admin, "You are not allowed to create users")

    def ensure_can_view(self) -> None:
        require_access(
            lambda u: u.is_admin or self._is_acting_user(u),
            "You are not allowed to view this user",
        )

    def ensure_can_edit(self) -> None:
        """Admins can edit any user, users can edit themselves."""
        require_access(
            lambda u: u.is_admin or self._is_acting_user(u),
            "You are not allowed to edit this user",
        )

    def apply_changes(self, changes: dict[str, Any]) -> None:
        """Apply a partial update of the user's metadata.

        Keys are meta keys (permissions as `can/*`). None removes a key.
        Users may change some keys on their own account (see
        SELF_EDITABLE_KEYS), everything else needs an admin.
        """
        for key in changes:
            if key in READ_ONLY_KEYS:
                raise ValidationException(f"'{key}' is read-only")
            if key in SECRET_KEYS:
                raise ValidationException(f"'{key}' can't be set directly")

        if admin_only := sorted(key for key in changes if not is_self_editable(key)):
            require_access(
                lambda u: u.is_admin,
                f"Only admins can change {', '.join(admin_only)}",
            )
        else:
            self.ensure_can_edit()
        self.update(changes)

    async def change_password(self, password: str) -> None:
        self.ensure_can_edit()
        if len(password) < MIN_PASSWORD_LENGTH:
            raise ValidationException(
                f"Password must have at least {MIN_PASSWORD_LENGTH} characters"
            )
        await self.set_password(password)

    def regenerate_api_key(self) -> str:
        """Replace the API key with a new one and return it (shown only once)."""
        self.ensure_can_edit()
        api_key = generate_api_key()
        self.set_api_key(api_key)
        return api_key

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

        return bool(isinstance(self[key], list) and value in self[key])

    @property
    def is_admin(self) -> bool:
        return bool(self.meta.get("is_admin"))

    @property
    def is_limited(self) -> bool:
        """Is the user limited.

        Limited users can view only their own, or explicitly assigned
        objects. For assets, asset has to have 'author' set to the user.

        For channels, the user has to have 'channel' key set to the channel id
        """
        return bool(self.meta.get("is_limited"))

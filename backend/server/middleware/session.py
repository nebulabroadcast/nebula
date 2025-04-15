import json
import typing
from base64 import b64decode, b64encode

import itsdangerous
from itsdangerous.exc import BadSignature
from starlette.datastructures import MutableHeaders
from starlette.requests import HTTPConnection
from starlette.types import ASGIApp, Message, Receive, Scope, Send

import nebula
from nebula.common import create_hash


async def get_session_key() -> str:
    key_candidate = create_hash()

    query = """
        INSERT INTO settings (key, value)
        VALUES ('.session_key', $1)
        ON CONFLICT (key) DO UPDATE
        SET value = settings.value
        RETURNING value
    """

    res = await nebula.db.fetchrow(query, key_candidate)
    assert res, "Failed to retrieve session key. This shouldn't happen"

    if res["value"] == key_candidate:
        nebula.log.info("Created new session key")

    return res["value"]


class SessionMiddleware:
    """Custom session middleware for Nebula.

    The main difference with the default Starlette session middleware is that
    it loads the session key from the database so it can be shared between
    multiple replicas of the application.
    """

    _signer: itsdangerous.Signer | None = None

    def __init__(
        self,
        app: ASGIApp,
        session_cookie: str = "session",
        max_age: int | None = 14 * 24 * 60 * 60,  # 14 days, in seconds
        path: str = "/",
        same_site: typing.Literal["lax", "strict", "none"] = "lax",
        https_only: bool = False,
        domain: str | None = None,
    ) -> None:
        self.app = app
        self.session_cookie = session_cookie
        self.max_age = max_age
        self.path = path
        self.security_flags = "httponly; samesite=" + same_site
        if https_only:  # Secure flag can be used with HTTPS only
            self.security_flags += "; secure"
        if domain is not None:
            self.security_flags += f"; domain={domain}"

    async def get_signer(self) -> itsdangerous.Signer:
        if self._signer is None:
            key = await get_session_key()
            self._signer = itsdangerous.TimestampSigner(key)
        return self._signer

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):  # pragma: no cover
            await self.app(scope, receive, send)
            return

        signer = await self.get_signer()

        connection = HTTPConnection(scope)
        initial_session_was_empty = True

        if self.session_cookie in connection.cookies:
            data = connection.cookies[self.session_cookie].encode("utf-8")
            try:
                data = signer.unsign(data)
                scope["session"] = json.loads(b64decode(data))
                initial_session_was_empty = False
            except BadSignature:
                scope["session"] = {}
        else:
            scope["session"] = {}

        async def send_wrapper(message: Message) -> None:
            if message["type"] == "http.response.start":
                if scope["session"]:
                    # We have session data to persist.
                    data = b64encode(json.dumps(scope["session"]).encode("utf-8"))
                    data = signer.sign(data)
                    headers = MutableHeaders(scope=message)
                    header_value = "{session_cookie}={data}; path={path}; {max_age}{security_flags}".format(  # noqa: E501
                        session_cookie=self.session_cookie,
                        data=data.decode("utf-8"),
                        path=self.path,
                        max_age=f"Max-Age={self.max_age}; " if self.max_age else "",
                        security_flags=self.security_flags,
                    )
                    headers.append("Set-Cookie", header_value)
                elif not initial_session_was_empty:
                    # The session has been cleared.
                    headers = MutableHeaders(scope=message)
                    header_value = "{session_cookie}={data}; path={path}; {expires}{security_flags}".format(  # noqa: E501
                        session_cookie=self.session_cookie,
                        data="null",
                        path=self.path,
                        expires="expires=Thu, 01 Jan 1970 00:00:00 GMT; ",
                        security_flags=self.security_flags,
                    )
                    headers.append("Set-Cookie", header_value)
            await send(message)

        await self.app(scope, receive, send_wrapper)

"""Session token cookie.

Browsers authenticate with an HttpOnly cookie in addition to the explicit
methods (Authorization header, ?token=, API key). Endpoints don't touch the
response to manage it: they call `set_auth_cookie` / `clear_auth_cookie`,
and RequestContextMiddleware applies the change to whatever response is
sent, including error responses (e.g. logout's 401).
"""

from fastapi import Request
from starlette.responses import Response

import nebula

AUTH_COOKIE_NAME = "nebula_token"

# The server-side session TTL decides whether the token is valid.
# This only needs to outlive it.
AUTH_COOKIE_MAX_AGE = 30 * 24 * 3600

# QUERY is safe: HTML forms can't send it and cross-origin fetch preflights it
SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "QUERY"}


def token_from_cookie(request: Request) -> str | None:
    """Return the session token from the auth cookie, if any.

    Raises UnauthorizedException for cross-site requests with unsafe methods,
    since browsers attach the cookie to those automatically (CSRF).
    """
    token = request.cookies.get(AUTH_COOKIE_NAME)
    if not token:
        return None
    if (
        request.method not in SAFE_METHODS
        and request.headers.get("sec-fetch-site") == "cross-site"
    ):
        raise nebula.UnauthorizedException("Cross-site request rejected")
    return token


def set_auth_cookie(request: Request, token: str) -> None:
    """Set the auth cookie on the response to this request."""
    request.state.auth_cookie = token


def clear_auth_cookie(request: Request) -> None:
    """Remove the auth cookie from the client."""
    request.state.auth_cookie = ""


def _is_secure(request: Request) -> bool:
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    return scheme.split(",")[0].strip() == "https"


def apply_auth_cookie(request: Request, response: Response) -> None:
    """Write a pending set/clear of the auth cookie to the response."""
    token = getattr(request.state, "auth_cookie", None)
    if token is None:
        return

    secure = _is_secure(request)
    if token:
        response.set_cookie(
            AUTH_COOKIE_NAME,
            token,
            max_age=AUTH_COOKIE_MAX_AGE,
            path="/",
            httponly=True,
            secure=secure,
            samesite="lax",
        )
    else:
        response.delete_cookie(
            AUTH_COOKIE_NAME,
            path="/",
            httponly=True,
            secure=secure,
            samesite="lax",
        )

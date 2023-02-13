from fastapi import Depends, Header

import nebula
from server.session import Session
from server.utils import parse_access_token


async def access_token(authorization: str = Header(None)) -> str | None:
    """Parse and return an access token provided in the request headers."""
    access_token = parse_access_token(authorization)
    if not access_token:
        return None
    return access_token


async def request_initiator(x_client_id: str = Header(None)) -> str | None:
    """Return the client ID of the request initiator."""
    return x_client_id


async def current_user(
    access_token: str | None = Depends(access_token),
) -> nebula.User:
    """Return the currently logged-in user"""
    if access_token is None:
        raise nebula.UnauthorizedException("No access token provided")
    session = await Session.check(access_token, None)
    if session is None:
        raise nebula.UnauthorizedException("Invalid access token")
    return nebula.User(meta=session.user)


async def current_user_optional(
    access_token: str | None = Depends(access_token),
) -> nebula.User | None:
    """Return the currently logged-in user or none."""
    if access_token is None:
        return None
    session = await Session.check(access_token, None)
    if session is None:
        return None
    return nebula.User(meta=session.user)
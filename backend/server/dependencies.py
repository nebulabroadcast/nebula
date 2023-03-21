from typing import Annotated

from fastapi import Depends, Header, Path, Query

import nebula
from server.session import Session
from server.utils import parse_access_token


async def access_token(authorization: str = Header(None)) -> str | None:
    """Parse and return an access token provided in the request headers."""
    access_token = parse_access_token(authorization)
    if not access_token:
        return None
    return access_token


AccessToken = Annotated[str | None, Depends(access_token)]


async def request_initiator(x_client_id: str | None = Header(None)) -> str | None:
    """Return the client ID of the request initiator."""
    return x_client_id


RequestInitiator = Annotated[str, Depends(request_initiator)]


async def current_user_query(token: str = Query(None)) -> nebula.User:
    if token is None:
        raise nebula.UnauthorizedException("No access token provided")
    session = await Session.check(token, None)
    if session is None:
        raise nebula.UnauthorizedException("Invalid access token")
    return nebula.User(meta=session.user)


CurrentUserInQuery = Annotated[nebula.User, Depends(current_user_query)]


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


CurrentUser = Annotated[nebula.User, Depends(current_user)]


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


CurrentUserOptional = Annotated[nebula.User | None, Depends(current_user_optional)]


async def asset_in_path(
    id_asset: int = Path(..., ge=0),
) -> nebula.Asset:
    """Return the asset with the given ID."""
    return await nebula.Asset.load(id_asset)


AssetInPath = Annotated[nebula.Asset, Depends(asset_in_path)]

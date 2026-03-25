from typing import Annotated

from fastapi import Depends, Header, Path, Query, Request

import nebula
from server.session import Session
from server.utils import parse_access_token


async def access_token(
    authorization: Annotated[
        str | None,
        Header(
            title="Authorization header",
            include_in_schema=False,
        ),
    ] = None,
    token: Annotated[
        str | None,
        Query(
            title="Auth token in query parameters",
            include_in_schema=False,
        ),
    ] = None,
) -> str | None:
    """Parse and return an access token.

    Access token may be provided either in the Authorization header
    or in the query parameters.
    """
    access_token = token or parse_access_token(authorization or "")
    if not access_token:
        return None
    return access_token


AccessToken = Annotated[str | None, Depends(access_token)]


async def api_key(
    x_api_key: Annotated[
        str | None,
        Header(
            title="API key in request headers",
            include_in_schema=False,
        ),
    ] = None,
    api_key: Annotated[
        str | None,
        Query(
            title="API key in query parameters",
            include_in_schema=False,
        ),
    ] = None,
) -> str | None:
    """Return the API key provided in the request headers or query parameters."""
    return api_key or x_api_key


ApiKey = Annotated[str | None, Depends(api_key)]


async def request_initiator(
    x_client_id: Annotated[
        str | None,
        Header(
            include_in_schema=False,
        ),
    ],
) -> str | None:
    """Return the client ID of the request initiator."""
    return x_client_id


RequestInitiator = Annotated[str, Depends(request_initiator)]


async def current_user(
    request: Request,
    access_token: AccessToken,
    api_key: ApiKey,
) -> nebula.User:
    """Return the currently logged-in user"""
    if access_token is None:
        if api_key is None:
            raise nebula.UnauthorizedException("No access token provided")
        try:
            return await nebula.User.by_api_key(api_key)
        except nebula.NotFoundException as e:
            raise nebula.UnauthorizedException("Invalid API key") from e

    session = await Session.check(access_token, request)
    if session is None:
        raise nebula.UnauthorizedException("Invalid access token")
    return nebula.User(meta=session.user)


CurrentUser = Annotated[nebula.User, Depends(current_user)]


async def current_user_optional(
    request: Request,
    access_token: AccessToken,
    api_key: ApiKey,
) -> nebula.User | None:
    """Return the currently logged-in user or none."""
    try:
        return await current_user(request, access_token, api_key)
    except nebula.UnauthorizedException:
        return None


CurrentUserOptional = Annotated[nebula.User | None, Depends(current_user_optional)]


async def asset_in_path(
    id_asset: int = Path(..., ge=0),
) -> nebula.Asset:
    """Return the asset with the given ID."""
    return await nebula.Asset.load(id_asset)


AssetInPath = Annotated[nebula.Asset, Depends(asset_in_path)]

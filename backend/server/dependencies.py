from typing import Annotated, cast

from fastapi import Depends, Path, Request

import nebula


async def request_initiator() -> str | None:
    """Return the client ID of the request initiator.

    Resolved by RequestContextMiddleware for every request.
    """
    return nebula.context.current_initiator()


RequestInitiator = Annotated[str, Depends(request_initiator)]


async def current_user(request: Request) -> nebula.User:
    """Return the currently logged-in user.

    The user is resolved once per request by RequestContextMiddleware;
    this just surfaces it (or raises) for endpoints that require it.
    """
    user = cast("nebula.User | None", getattr(request.state, "user", None))
    if user is None:
        reason = getattr(request.state, "unauthorized_reason", None)
        raise nebula.UnauthorizedException(reason or "Unauthorized")
    return user


CurrentUser = Annotated[nebula.User, Depends(current_user)]


async def current_user_optional(request: Request) -> nebula.User | None:
    """Return the currently logged-in user, or None."""
    return cast("nebula.User | None", getattr(request.state, "user", None))


CurrentUserOptional = Annotated[nebula.User | None, Depends(current_user_optional)]


async def asset_in_path(
    id_asset: int = Path(..., ge=0),
) -> nebula.Asset:
    """Return the asset with the given ID."""
    return await nebula.Asset.load(id_asset)


AssetInPath = Annotated[nebula.Asset, Depends(asset_in_path)]

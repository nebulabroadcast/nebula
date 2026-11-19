"""Server resource: /api/v2/server (spec 013). Admin only."""

import secrets

from fastapi import APIRouter, Depends

import nebula
from nebula.context import require_access
from server.dependencies import current_user

router = APIRouter(
    prefix="/server",
    tags=["Server"],
    dependencies=[Depends(current_user)],
)


def ensure_admin() -> None:
    require_access(lambda u: u.is_admin, "Only admins can manage the server")


@router.post(
    "/restart",
    status_code=202,
    operation_id="server_restart",
    summary="Restart the server",
)
async def restart() -> None:
    """Every replica gracefully restarts its worker processes, which load
    settings, plugins and code again. Requests in progress finish, websocket
    connections drop and clients reconnect.

    Returns at once. Without gunicorn (the dev stack) nothing restarts and
    a warning is logged.
    """
    ensure_admin()
    await nebula.msg("server.restart", id=secrets.token_hex(8))


@router.post(
    "/reload-settings",
    status_code=202,
    operation_id="server_reload_settings",
    summary="Reload the settings",
)
async def reload_settings() -> None:
    """Every worker of every replica reloads the settings from the database,
    without a restart. Plugins and code changes need a restart.
    """
    ensure_admin()
    await nebula.msg("server.reload_settings")

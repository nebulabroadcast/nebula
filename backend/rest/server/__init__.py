"""Server resource: /api/v2/server (spec 013). Admin only."""

import secrets

from fastapi import APIRouter, Depends, Request

import nebula
from nebula.context import require_access
from nebula.settings import reload_settings_everywhere
from server.client_settings import ClientSettingsModel, get_user_client_settings
from server.dependencies import CurrentUser, current_user

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
    operation_id="server_reload_settings",
    summary="Reload the settings",
)
async def reload_settings(request: Request, user: CurrentUser) -> ClientSettingsModel:
    """Every worker of every replica reloads the settings from the database,
    without a restart. Plugins and code changes need a restart.

    The worker serving this request reloads before it responds, and returns
    the new client settings (what `init` returns as `settings`), so the
    client doesn't have to ask again and risk a worker that's still reloading.
    """
    ensure_admin()
    await reload_settings_everywhere()
    return await get_user_client_settings(request, user)

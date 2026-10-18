"""Who may see which assets. (Edit rights: Asset.ensure_can_edit.)

Viewing has two rules, on purpose: `can_view_asset` (one asset: detail,
aux, RPC get) lets limited users see the assets they created or are
assigned to in any folder, and assignees see their assets regardless of
`can/asset_view`; `asset_acl` (listings) also limits limited users to their
`can/asset_view` folders.
"""

from string.templatelib import Template
from typing import TYPE_CHECKING, Any

from nebula.sql import SQL

if TYPE_CHECKING:
    from nebula.objects.user import User


def can_view_asset(user: User, meta: dict[str, Any]) -> bool:
    if user.is_admin or user.id in (meta.get("assignees") or []):
        return True
    if user.is_limited:
        return bool(meta.get("created_by") == user.id)
    if id_folder := meta.get("id_folder"):
        return user.can("asset_view", id_folder)
    return False


def asset_acl(user: User | None, alias: str = "a") -> Template | None:
    """SQL condition limiting a listing to the assets the user may see.

    None when nothing is hidden. `alias` is the assets table in the query.
    """
    if user is None:
        return None
    conditions: list[Template] = []
    if user.is_limited:
        conditions.append(
            t"""({alias:ident}.meta->>'created_by' = {str(user.id)}::text
                OR {alias:ident}.meta->'assignees' @> {[user.id]}::jsonb)"""
        )
    if (can_view := user["can/asset_view"]) and isinstance(can_view, list):
        conditions.append(t"{alias:ident}.id_folder = ANY({can_view}::integer[])")
    if not conditions:
        return None
    return SQL.join(conditions, " AND ")

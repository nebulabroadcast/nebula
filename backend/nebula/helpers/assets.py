"""Asset operations shared by the RPC and REST APIs."""

from string.templatelib import Template
from typing import Any

import nebula
from nebula.context import current_user
from nebula.enum import ObjectType
from nebula.helpers.validators import Validator
from nebula.settings import load_settings
from nebula.sql import SQL


def asset_acl(user: nebula.User | None, alias: str = "a") -> Template | None:
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


def ensure_can_save(asset: nebula.Asset, changes: dict[str, Any]) -> None:
    """Edit rights in the asset's folder, and in the new one if it changes."""
    if asset.id is not None:
        asset.ensure_can_edit()
    new_folder = changes.get("id_folder")
    if new_folder is not None:
        try:
            new_folder = int(new_folder)
        except (TypeError, ValueError) as e:
            raise nebula.ValidationException(
                "'id_folder' must be an integer", key="id_folder"
            ) from e
    if asset.id is None or (
        new_folder is not None and new_folder != asset["id_folder"]
    ):
        asset.ensure_can_edit(new_folder)


async def save_asset_changes(asset: nebula.Asset, changes: dict[str, Any]) -> None:
    """Apply metadata changes from a client and save the asset.

    `changes` are meta keys, None removes a key. Checks the keys and the
    user's edit rights (in the current folder and in a new one), then runs
    the asset validator plugin, which applies the changes itself, or
    applies them directly when there is none. Raises ValidationException
    (422) for invalid changes; nothing is saved then.
    """
    asset.check_changes(changes)
    is_new = asset.id is None
    ensure_can_save(asset, changes)

    user = current_user()
    reload_settings = False
    async with nebula.db.transaction():
        if user is not None:
            if is_new:
                asset["created_by"] = user.id
            asset["updated_by"] = user.id

        if validator := Validator.for_object(ObjectType.ASSET):
            try:
                # `connection` is kept for plugin backward compatibility
                await validator(asset, changes, connection=nebula.db, user=user)
            except nebula.RequestSettingsReload:
                reload_settings = True
        else:
            asset.update(changes)

        if not asset["id_folder"]:
            raise nebula.ValidationException("'id_folder' is required", key="id_folder")
        await asset.save()

    if reload_settings:
        await load_settings()

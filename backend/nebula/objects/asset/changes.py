"""Saving asset changes from a client (REST and RPC `ops`/`set`)."""

from typing import TYPE_CHECKING, Any

from nx.db import db

from nebula.context import current_user
from nebula.enum import ObjectType
from nebula.exceptions import RequestSettingsReload, ValidationException
from nebula.helpers.validators import Validator
from nebula.settings import load_settings

if TYPE_CHECKING:
    from nebula.objects.asset import Asset


def ensure_can_save(asset: Asset, changes: dict[str, Any]) -> None:
    """Edit rights in the asset's folder, and in the new one if it changes."""
    if asset.id is not None:
        asset.ensure_can_edit()
    new_folder = changes.get("id_folder")
    if new_folder is not None:
        try:
            new_folder = int(new_folder)
        except (TypeError, ValueError) as e:
            raise ValidationException(
                "'id_folder' must be an integer", key="id_folder"
            ) from e
    if asset.id is None or (
        new_folder is not None and new_folder != asset["id_folder"]
    ):
        asset.ensure_can_edit(new_folder)


async def save_asset_changes(
    asset: Asset,
    changes: dict[str, Any],
    *,
    reload_settings: bool = True,
) -> bool:
    """Apply metadata changes from a client and save the asset.

    `changes` are meta keys, None removes a key. Checks the keys and the
    user's edit rights (in the current folder and in a new one), then runs
    the asset validator plugin, which applies the changes itself, or
    applies them directly when there is none. Raises ValidationException
    (422) for invalid changes; nothing is saved then.

    Returns True when the validator asked for a settings reload. The reload
    is done here, unless `reload_settings` is False (a batch reloads once).
    """
    asset.check_changes(changes)
    is_new = asset.id is None
    ensure_can_save(asset, changes)

    user = current_user()
    settings_changed = False
    async with db.transaction():
        if user is not None:
            if is_new:
                asset["created_by"] = user.id
            asset["updated_by"] = user.id

        if validator := Validator.for_object(ObjectType.ASSET):
            try:
                # `connection` is kept for plugin backward compatibility
                await validator(asset, changes, connection=db, user=user)
            except RequestSettingsReload:
                settings_changed = True
        else:
            asset.update(changes)

        if not asset["id_folder"]:
            raise ValidationException("'id_folder' is required", key="id_folder")
        await asset.save()

    if settings_changed and reload_settings:
        await load_settings()
    return settings_changed

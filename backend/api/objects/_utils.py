from typing import Any

import nebula
from nebula.helpers.scheduling import ensure_can_edit_rundowns
from nebula.objects.base import BaseObject


def can_access_object(meta: dict[str, Any], user: nebula.User) -> bool:
    """Read access to objects other than assets (see can_view_asset)."""
    if user.is_admin:
        return True
    if user.is_limited:
        return meta.get("created_by") == user.id

    if login := meta.get("login"):
        # Users can view their own data
        return bool(login == user.name)

    # Normal users don't need to access items, bins or events
    # using get requests.
    return False


async def can_modify_object(obj: BaseObject, user: nebula.User) -> None:
    """Check if user can modify an object.

    Raises ForbiddenException if user is not allowed to modify the object.
    """

    if user.is_admin:
        return

    # Assets are checked by save_asset_changes (Asset.ensure_can_edit)

    if isinstance(obj, nebula.Event):
        acl = user.get("can/scheduler_edit", False)
        if not acl:
            raise nebula.ForbiddenException("You are not allowed to edit schedule")
        if isinstance(acl, list) and obj["id_channel"] not in acl:
            raise nebula.ForbiddenException(
                "You are not allowed to edit schedule for this channel"
            )

    elif isinstance(obj, nebula.Item):
        await ensure_can_edit_rundowns(user, [obj["id_bin"]])

    elif isinstance(obj, nebula.Bin):
        raise nebula.ForbiddenException("It is not allowed to edit bins directly")

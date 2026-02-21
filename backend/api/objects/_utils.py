from typing import Any

import nebula
from nebula.objects.base import BaseObject


def can_access_object(meta: dict[str, Any], user: nebula.User) -> bool:
    if user.is_admin or (user.id in meta.get("assignees", [])):
        return True
    elif user.is_limited:
        return meta.get("created_by") == user.id
    if id_folder := meta.get("id_folder"):
        # Users can view assets in folders they have access to
        return user.can("asset_view", id_folder)

    if login := meta.get("login"):
        # Users can view their own data
        return login == user.name

    # Normal users don't need to access items, bins or events
    # using get requests.
    return False


async def can_modify_object(obj: BaseObject, user: nebula.User) -> None:
    """Check if user can modify an object.

    Raises ForbiddenException if user is not allowed to modify the object.
    """

    if user.is_admin:
        return

    if isinstance(obj, nebula.Asset):
        acl = user.get("can/asset_edit", False)
        if not acl:
            raise nebula.ForbiddenException("You are not allowed to edit assets")
        elif isinstance(acl, list) and obj["id_folder"] not in acl:
            raise nebula.ForbiddenException(
                "You are not allowed to edit assets in this folder"
            )

    elif isinstance(obj, nebula.Event):
        acl = user.get("can/scheduler_edit", False)
        if not acl:
            raise nebula.ForbiddenException("You are not allowed to edit schedule")
        elif isinstance(acl, list) and obj["id_channel"] not in acl:
            raise nebula.ForbiddenException(
                "You are not allowed to edit schedule for this channel"
            )

    elif isinstance(obj, nebula.Item):
        acl = user.get("can/rundown_edit", False)
        if not acl:
            raise nebula.ForbiddenException("You are not allowed to edit rundown")
        elif isinstance(acl, list):
            q = "SELECT id_channel FROM events WHERE id_magic = $1"
            res = await nebula.db.fetch(q, obj["id_bin"])
            if not res:
                raise nebula.NotFoundException("Bin not found")
            if res[0]["id_channel"] not in acl:
                raise nebula.ForbiddenException(
                    "You are not allowed to edit rundown for this channel"
                )

        # TODO: Check if user can edit rundown for this channel

    elif isinstance(obj, nebula.Bin):
        raise nebula.ForbiddenException("It is not allowed to edit bins directly")


__all__ = ["api_set"]

from nxtools import logging, log_traceback

from nx.core.common import NebulaResponse, get_hash, config
from nx.core.base_objects import BaseObject
from nx.db import DB
from nx.helpers import bin_refresh
from nx.messaging import messaging
from nx.objects import Asset, Item, Bin, Event, User, anonymous
from nx.plugins.validator import get_validator


def api_set(**kwargs):
    object_type = kwargs.get("object_type", "asset")
    objects = kwargs.get("objects", [])
    data = kwargs.get("data", {})
    user = kwargs.get("user", anonymous)
    db = kwargs.get("db", DB())
    initiator = kwargs.get("initiator", None)

    if not user:
        return NebulaResponse(401)

    if not (data and objects):
        return NebulaResponse(200, "No object created or modified")

    object_type_class = {
        "asset": Asset,
        "item": Item,
        "bin": Bin,
        "event": Event,
        "user": User,
    }.get(object_type, None)

    if object_type_class is None:
        return NebulaResponse(400, f"Unsupported object type {object_type}")

    changed_objects = []
    affected_bins = []

    if "_password" in data:
        hpass = get_hash(data["_password"])
        del data["_password"]
        data["password"] = hpass

    for id_object in objects:
        obj = object_type_class(id_object, db=db)
        changed = False

        if object_type == "asset":
            id_folder = data.get("id_folder", False) or obj["id_folder"]
            if not user.has_right("asset_edit", id_folder):
                folder_title = config["folders"][id_folder]["title"]
                return NebulaResponse(
                    403, f"{user} is not allowed to edit {folder_title} folder"
                )
        elif object_type == "user":
            if obj.id:
                if not user.has_right("user_edit"):
                    return NebulaResponse(
                        403, f"{user} is not allowed to edit users data"
                    )
            else:
                if not user.has_right("user_create"):
                    return NebulaResponse(
                        403, f"{user} is not allowed to add new users"
                    )

        changed = False
        for key in data:
            value = data[key]
            old_value = obj[key]
            obj[key] = value
            if obj[key] != old_value:
                changed = True

        validator = get_validator(object_type, db=db)

        if changed and validator:
            logging.debug("Executing validation script")
            tt = obj.__repr__()
            try:
                obj = validator.validate(obj)
            except Exception:
                return NebulaResponse(
                    500, log_traceback("Unable to validate object changes.")
                )

            if not isinstance(obj, BaseObject):
                # TODO: use 409-conflict?
                return NebulaResponse(400, f"Unable to save {tt}:\n\n{obj}")

        if changed:
            obj.save(notify=False)
            changed_objects.append(obj.id)
            if object_type == "item" and obj["id_bin"] not in affected_bins:
                affected_bins.append(obj["id_bin"])

    if changed_objects:
        messaging.send(
            "objects_changed",
            objects=changed_objects,
            object_type=object_type,
            user="{}".format(user),
            initiator=initiator,
        )

    if affected_bins:
        bin_refresh(affected_bins, db=db, initiator=initiator)

    return NebulaResponse(200, data=changed_objects)

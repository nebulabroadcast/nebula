__all__ = ["api_delete"]

import psycopg2

from nx.core.common import NebulaResponse
from nx.db import DB
from nx.helpers import bin_refresh
from nx.objects import Asset, Item, Bin, Event, anonymous


def api_delete(**kwargs):
    object_type = kwargs.get("object_type", "asset")
    # TODO: ids is deprecated. use objects instead
    objects = kwargs.get("objects") or kwargs.get("ids", [])
    db = kwargs.get("db", DB())
    user = kwargs.get("user", anonymous)
    initiator = kwargs.get("initiator", None)

    if not user:
        return NebulaResponse(401)

    if not (objects):
        return NebulaResponse(200, "No object deleted")

    object_type_class = {
        "asset": Asset,
        "item": Item,
        "bin": Bin,
        "event": Event,
    }[object_type]

    num = 0
    affected_bins = []

    for id_object in objects:
        obj = object_type_class(id_object, db=db)

        if object_type == "item":
            if not user.has_right("rundown_edit", anyval=True):
                return NebulaResponse(403)
            try:
                obj.delete()
            except psycopg2.IntegrityError:
                return NebulaResponse(423, f"Unable to delete {obj}. Already aired.")
            if obj["id_bin"] not in affected_bins:
                affected_bins.append(obj["id_bin"])
        else:
            return NebulaResponse(501, f"{object_type} deletion is not implemented")

        num += 1

    if affected_bins:
        bin_refresh(affected_bins, db=db, initiator=initiator)
    return NebulaResponse(200, f"{num} objects deleted")

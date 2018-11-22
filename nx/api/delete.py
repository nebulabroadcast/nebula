import psycopg2

from nx import *

__all__ = ["api_delete"]

def api_delete(**kwargs):
    object_type = kwargs.get("object_type", "asset")
    ids = kwargs.get("ids", kwargs.get("objects", [])) #TODO: objects is deprecated. use ids!
    db = kwargs.get("db", DB())
    user = kwargs.get("user", anonymous)

    if not user:
        return NebulaResponse(ERROR_UNAUTHORISED)

    if not (ids):
        return NebulaResponse(200, "No object deleted")

    object_type_class = {
                "asset" : Asset,
                "item"  : Item,
                "bin"   : Bin,
                "event" : Event,
            }[object_type]

    num = 0
    affected_bins = []

    for id_object in ids:
        obj = object_type_class(id_object, db=db)

        if object_type == "item":
            if not user.has_right("rundown_edit", anyval=True):
                return NebulaResponse(ERROR_ACCESS_DENIED)
            try:
                obj.delete()
            except psycopg2.IntegrityError:
                return NebulaResponse(ERROR_LOCKED, "Unable to delete {}. Already aired.".format(obj))
            if obj["id_bin"] not in affected_bins:
                affected_bins.append(obj["id_bin"])
        else:
            #TODO ?
            return NebulaResponse(ERROR_NOT_IMPLEMENTED, "{} deletion is not implemented".format(object_type))

        num += 1

    if affected_bins:
        bin_refresh(affected_bins, db=db)
    return NebulaResponse(200, " {} objects deleted".format(num))

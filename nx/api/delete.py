import psycopg2

from nx import *

__all__ = ["api_delete"]

def api_delete(**kwargs):
    if not kwargs.get("user", None):
        return {'response' : 401, 'message' : 'unauthorized'}

    object_type = kwargs.get("object_type", "asset")
    ids = kwargs.get("objects", [])
    db = kwargs.get("db", DB())
    user = User(meta=kwargs["user"])

    if not (ids):
        return {"response" : 304, "message" : "No object deleted"}

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
            #TODO: ACL
            try:
                obj.delete()
            except psycopg2.IntegrityError:
                return {
                        "response" : 423,
                        "message" : "Unable to delete {}. Already aired.".format(obj)
                    }
            if obj["id_bin"] not in affected_bins:
                affected_bins.append(obj["id_bin"])
        else:
            #TODO ?
            return {
                    "response" : 501,
                    "message" : "{} deletion is not implemented".format(object_type)
                }

        num += 1

    if affected_bins:
        bin_refresh(affected_bins, db=db)
    return {"response" : 200, "message" : "{} objects deleted".format(num)}

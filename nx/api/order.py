#
# Changes order of items in bin/rundown, creates new items from assets
#

from nx import *

__all__ = ["api_order"]

def api_order(**kwargs):
    if not kwargs.get("user", None):
        return {'response' : 401, 'message' : 'unauthorized'}

    id_channel = kwargs.get("id_channel", 0)
    id_bin = kwargs.get("id_bin", False)
    order  = kwargs.get("order", [])

    if not id_channel in config["playout_channels"]:
        return {
                "response" : 400,
                "message" : "No such channel ID {}".format(id_channel)
            }
    playout_config = config["playout_channels"][id_channel]
    append_cond = playout_config.get("rundown_accepts", "True")

    if "user" in kwargs:
        user = User(meta=kwargs.get("user"))
        if id_channel and not user.has_right("rundown_edit", id_channel):
            return {"response" : 403, "message" : "You are not allowed to edit this rundown"}
    else:
        user = User(meta={"login" : "Nebula"})

    if not (id_bin and order):
        return {"response" : 400, "message" : "Bad \"order\" request<br>id_bin: {}<br>order: {}".format(id_bin, order)}

    logging.info("{} executes bin_order method".format(user))
    affected_bins = [id_bin]
    pos = 1
    db = DB()
    rlen = float(len(order))
    for i, obj in enumerate(order):
        object_type = obj["object_type"]
        id_object = obj["id_object"]
        meta = obj["meta"]

        if object_type == "item":
            if not id_object:
                item = Item(db=db)
                item["id_asset"] = obj.get("id_asset", 0)
                item.meta.update(meta)
            else:
                item = Item(id_object, db=db)

                if not item:
                    logging.debug("Skipping {}".format(item))
                    continue

            if not item["id_bin"] in affected_bins:
                affected_bins.append(item["id_bin"])

        elif object_type == "asset":
            asset = Asset(id_object, db=db)
            try:
                can_append = eval(append_cond)
            except Exception:
                log_traceback("Unable to evaluate rundown accept condition: {}".format(append_cond))
                continue
            if not asset or not can_append:
                continue
            item = Item(db=db)
            item["id_asset"] = asset.id
            item.meta.update(meta)
        else:
            continue

        if not item or item["position"] != pos or item["id_bin"] != id_bin:
            item["position"] = pos
            item["id_bin"]   = id_bin
            item.save()
        pos += 1

    for id_bin in affected_bins:
        # Update bin duration
        bin_refresh(affected_bins, db=db)


    messaging.send("objects_changed", objects=affected_bins, object_type="bin")
    return {"response" : 200, "message" : "OK"}

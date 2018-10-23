import os
import imp

from nx import *
from nebulacore.base_objects import BaseObject

__all__ = ["api_set"]


def get_validator(object_type, **kwargs):
    plugin_path = os.path.join(
            storages[int(config.get("plugin_storage", 1))].local_path,
            config.get("plugin_root", ".nx/scripts/v5")
        )
    if not os.path.exists(plugin_path):
        return

    f = FileObject(plugin_path, "validator", object_type + ".py")
    if f.exists:
        try:
            py_mod = imp.load_source(object_type, f.path)
        except:
            log_traceback("Unable to load plugin {}".format(plugin_name))
            return
    else:
        return

    if not "Plugin" in dir(py_mod):
        logging.error("No plugin class found in {}".format(f))
        return
    return py_mod.Plugin(**kwargs)


def api_set(**kwargs):
    if not kwargs.get("user", None):
        return NebulaResponse(ERROR_UNAUTHORISED)

    object_type = kwargs.get("object_type", "asset")
    ids  = kwargs.get("objects", [])
    data = kwargs.get("data", {})
    user = User(meta=kwargs["user"])
    db   = kwargs.get("db", DB())

    if not (data and ids):
        #TODO: Use 304?
        return NebulaResponse(200, "No object created or modified")

    object_type_class = {
                "asset" : Asset,
                "item"  : Item,
                "bin"   : Bin,
                "event" : Event,
            }[object_type]

    changed_objects = []
    affected_bins = []

    for id_object in ids:
        obj = object_type_class(id_object, db=db)
        changed = False

        if object_type == "asset":
            id_folder = data.get("id_folder", False) or obj["id_folder"]
            if not user.has_right("asset_edit", id_folder):
                return NebulaResponse(ERROR_ACCESS_DENIED,
                        "{} is not allowed to edit {} folder".format(
                            user,
                            config["folders"][id_folder]["title"]
                        )
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
                return NebulaResponse(ERROR_INTERNAL, log_traceback("Unable to validate object changes."))

            if not isinstance(obj, BaseObject):
                # TODO: use 409-conflict?
                return NebulaResponse(ERROR_BAD_REQUEST, "Unable to save {}:\n\n{}".format(tt, obj))

        if changed:
            obj.save(notify=False)
            changed_objects.append(obj.id)
            if object_type == "item" and obj["id_bin"] not in affected_bins:
                affected_bins.append(obj["id_bin"])

    if changed_objects:
        messaging.send("objects_changed", objects=changed_objects, object_type=object_type, user="{}".format(user))

    if affected_bins:
        bin_refresh(affected_bins, db=db)

    return NebulaResponse(200, data=changed_objects)


import cherrypy
from nebula import *
from cherryadmin import CherryAdminView


def validate_data(context, asset, meta):
    result = {}
    changed = False
    for key in meta:
        value = meta[key]
        meta_type = meta_types[key]
        new_val = None

        if meta_type["class"] in [STRING, TEXT]:
            new_val = value

        elif meta_type["class"] == INTEGER:
            if not value:
                new_val = 0
            else:
                try:
                    new_val = int(value)
                except ValueError:
                    return "Invalid value for key {}".format(key)

        elif meta_type["class"] == NUMERIC:
            if not value:
                new_val = 0
            else:
                try:
                    new_val = float(value)
                    #todo chage float to int
                except ValueError:
                    return "Invalid value for key {}".format(key)

        elif meta_type["class"] == BOOLEAN:
            if value == "1":
                new_val = True
            else:
                new_val = False

        elif meta_type["class"] == DATETIME:
            if not value:
                new_val = 0
            elif meta_type["mode"] == "date":
                try:
                    new_val = datestr2ts(value)
                except Exception:
                    log_traceback()
                    return "Invalid value {} for key {}".format(value, key)
                #TODO time

        elif meta_type["class"] == TIMECODE:
            try:
                new_val = tc2s(value, asset.fps)
            except Exception:
                log_traceback()
                return "Invalid value for key {}".format(key)
        elif meta_type["class"] == REGIONS:
            new_val = value
        elif meta_type["class"] == FRACTION:
            new_val = value
        elif meta_type["class"] == SELECT:
            new_val = value
        elif meta_type["class"] == LIST:
            new_val = value
        elif meta_type["class"] == COLOR:
            new_val = value

        if asset[key] != new_val:
            context.message("{} {} -> {}".format(key, json.dumps(asset[key]), json.dumps(new_val)))
            changed = True
            try:
                asset[key] = new_val
            except Exception:
                log_traceback()
                return "Invalid value for key {}".format(key)

    if not changed:
        return "No change"
    return None



class ViewDetail(CherryAdminView):
    def build(self, *args, **kwargs):
        self["name"] = "detail"
        self["title"] = "Asset detail"
        self["js"] = [
                "https://static.nebulabroadcast.com/nebula/js/vendor/resumable.js",
                "/static/js/detail.js"
                ]

        try:
            id_asset = int(args[-1].split("-")[0])
        except (IndexError, ValueError):
            id_asset = 0

        db = DB()

        if not id_asset:
            if kwargs.get("new_asset", False):
                asset = Asset(db=db)
                asset["id_folder"] = min(config["folders"].keys())
                self["new_asset"] = True
            else:
                self["asset"] = False
                raise cherrypy.HTTPError(status=404, message="Asset not found")
        else:
            asset = Asset(id_asset, db=db)


        id_folder = int(kwargs.get("folder_change", asset["id_folder"]))
        if id_folder != asset["id_folder"]:
            asset["id_folder"] = id_folder

        if cherrypy.request.method == "POST":
            error_message = validate_data(self.context, asset, kwargs)
            if error_message:
                self.context.message(error_message, level="error")
            else:
                response = api_set(
                        user=self["user"],
                        objects=[asset.id],
                        data={k:asset[k] for k in kwargs},
                        db=db
                    )
                if response.is_success:
                    self.context.message("Asset saved")
                else:
                    self.context.message(response.message, level="error")
                asset = Asset(id_asset, db=db) # reload after update

        try:
            fconfig = config["folders"][id_folder]
        except:
            self.context.message("Unknown folder ID", level="error")
            fconfig = config["folders"][min(config["folders"].keys())]

        # Get available actions
        actions = api_actions(
                    user=self["user"],
                    db=db,
                    ids=[id_asset]
                )

        self["asset"] = asset
        self["title"] = asset["title"] if asset.id else "New asset"
        self["id_folder"] = id_folder
        self["main_keys"] = fconfig["meta_set"]
        self["extended_keys"] = sorted([k for k in asset.meta if k in meta_types and meta_types[k]["ns"] not in ["f","q"] and k not in [l[0] for l in fconfig["meta_set"]]], key=lambda k: meta_types[k]["ns"])
        self["technical_keys"] = sorted([k for k in asset.meta if meta_types[k]["ns"] in ["f","q"] ])
        self["actions"] = actions.data if actions.is_success else []

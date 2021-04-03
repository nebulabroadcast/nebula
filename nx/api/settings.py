#
# Returns system settins
#

from nx import *

__all__ = ["api_settings"]

def api_settings(**kwargs):
    if not kwargs.get("user", None):
        return NebulaResponse(ERROR_UNAUTHORISED)
    data = {}
    for key in [
            "actions",
            "cs",
            "folders",
            "ingest_channels",
            "meta_types",
            "playout_channels",
            "proxy_url",
            "services",
            "seismic_addr",
            "seismic_port",
            "site_name",
            "views",
            "language"
            ]:
        if key in config:
            data[key] = config[key]

    data["storages"] = {}
    for k in config["storages"]:
        data["storages"][k] = {"title" : storages[k].title}
    return NebulaResponse(200, data=data)

#
# Returns system settins
#

import copy

from nx import *

__all__ = ["api_settings"]

def api_settings(**kwargs):
    if not kwargs.get("user", None):
        return NebulaResponse(ERROR_UNAUTHORISED)

    data = copy.deepcopy(config)
    for key in ["db_host", "db_port", "db_user", "db_pass", "db_name"]:
        if key in data:
            del(data[key])
    return NebulaResponse(200, data=data)

#
# WORK IN PROGRESS
#

from nx import *

__all__ = ["api_message"]

def api_message(**kwargs):
    if not kwargs.get("user", None):
        return NebulaResponse(ERROR_UNAUTHORISED)

    return NebulaResponse(ERROR_NOT_IMPLEMENTED)


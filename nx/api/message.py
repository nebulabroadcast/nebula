#
# WORK IN PROGRESS
#

from nx import *

__all__ = ["api_message"]

def api_message(**kwargs):
    if not kwargs.get("user", None):
        return {'response' : 401, 'message' : 'unauthorized'}

    return {'response' : 501, 'message' : 'Not implemented'}


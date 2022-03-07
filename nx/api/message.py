__all__ = ["api_message"]

from nx.core.common import NebulaResponse


def api_message(**kwargs):
    if not kwargs.get("user", None):
        return NebulaResponse(401)
    return NebulaResponse(501)

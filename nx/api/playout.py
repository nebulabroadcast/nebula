__all__ = ["api_playout"]

from nx import *

import requests

try:
    import eventlet
except ImportError:
    has_eventlet = False
else:
    has_eventlet = True
    eventlet.monkey_patch()


def api_playout(**kwargs):
    """
    Relays commands to "play" service
    """

    user = kwargs.get("user", anonymous)
    if not user:
        return NebulaResponse(ERROR_UNAUTHORISED)

    action = kwargs.get("action", False)
    id_channel = int(kwargs.get("id_channel", False))

    if not id_channel in config["playout_channels"]:
        return NebulaResponse(ERROR_BAD_REQUEST, 'Unknown channel {}'.format(id_channel))

    if not user.has_right("mcr", id_channel):
        return NebulaResponse(ERROR_ACCESS_DENIED, "You are not permitted to operate this channel")

    if not action in ["cue", "take", "abort", "freeze", "retake", "plugin_list", "plugin_exec", "stat", "recover"]:
        return NebulaResponse(ERROR_BAD_REQUEST, "Unsupported action {}".format(action))

    channel_config = config["playout_channels"][id_channel]

    controller_url = "http://{}:{}".format(
            channel_config.get("controller_host", "localhost"),
            channel_config.get("controller_port", 42100)
        )

    if "user" in kwargs:
        del(kwargs["user"])

    try:
        if has_eventlet:
            with eventlet.Timeout(1):
                response = requests.post(controller_url + "/" + action, timeout=4, data=kwargs)
        else:
            response = requests.post(controller_url + "/" + action, timeout=4, data=kwargs)
    except Exception:
        log_traceback()
        return NebulaResponse(ERROR_BAD_GATEWAY," Unable to connect playout service")

    if response.status_code >= 400:
        return NebulaResponse(response.status_code, response.text)

    rdata = json.loads(response.text)
    return rdata

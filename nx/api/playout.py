import requests

from nx import *

__all__ = ["api_playout"]

def api_playout(**kwargs):
    if not kwargs.get("user", None):
        return {'response' : 401, 'message' : 'unauthorized'}

    user = User(meta=kwargs["user"])
    action = kwargs.get("action", False)
    id_channel = int(kwargs.get("id_channel", False))

    if not id_channel in config["playout_channels"]:
        return {'response' : 400, 'message' : 'Unknown channel {}'.format(id_channel)}

    if not user.has_right("mcr", id_channel):
        return {'response' : 403, 'message' : 'You are not permitted to operate this channel'}

    if not action in ["cue", "take", "abort", "freeze", "retake", "plugin_list", "plugin_exec", "stat", "recover"]:
        return {'response' : 400, 'message' : 'Unsupported action {}'.format(action)}
    channel_config = config["playout_channels"][id_channel]

    controller_url = "http://{}:{}".format(
            channel_config.get("controller_host", "localhost"),
            channel_config.get("controller_port", 42100)
        )
    try:
        response = requests.post(controller_url + "/" + action, data=kwargs)
    except Exception:
        msg = log_traceback()
        return {'response' : 502, 'message': "Unable to connect playout service"}

    if response.status_code >= 400:
        return {'response' : response.status_code, 'message' : response.text}

    rdata = json.loads(response.text)
    return rdata

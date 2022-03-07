__all__ = ["api_playout"]

import json
import requests

from nxtools import log_traceback

from nx.core.common import NebulaResponse, config
from nx.objects import anonymous


def api_playout(**kwargs):
    """
    Relays commands to "play" service
    """

    user = kwargs.get("user", anonymous)
    if not user:
        return NebulaResponse(401)

    action = kwargs.get("action", False)
    id_channel = int(kwargs.get("id_channel", False))

    if id_channel not in config["playout_channels"]:
        return NebulaResponse(400, f"Unknown channel ID {id_channel}")

    if not user.has_right("mcr", id_channel):
        return NebulaResponse(400, "You are not permitted to operate this channel")

    channel_config = config["playout_channels"][id_channel]
    engine = channel_config.get("engine", "dummy")

    if engine == "dummy":
        return NebulaResponse(200)
    else:
        if action not in [
            "cue",
            "take",
            "abort",
            "freeze",
            "retake",
            "set",
            "plugin_list",
            "plugin_exec",
            "stat",
            "recover",
            "cue_forward",
            "cue_backward",
        ]:
            return NebulaResponse(400, f"Unsupported playout action {action}")

        controller_url = "http://{}:{}".format(
            channel_config.get("controller_host", "localhost"),
            channel_config.get("controller_port", 42100),
        )

        if "user" in kwargs:
            del kwargs["user"]

        try:
            response = requests.post(
                controller_url + "/" + action, timeout=4, data=kwargs
            )
        except Exception:
            log_traceback()
            return NebulaResponse(502, "Unable to connect to the playout service")

        if response.status_code >= 400:
            return NebulaResponse(response.status_code, response.text)

        rdata = json.loads(response.text)
        return rdata

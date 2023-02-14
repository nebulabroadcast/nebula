from enum import Enum
from typing import Any

from pydantic import Field

from server.models import RequestModel, ResponseModel


class PlayoutAction(str, Enum):
    cue = "cue"
    take = "take"
    abort = "abort"
    freeze = "freeze"
    retake = "retake"
    set = "set"
    plugin_list = "plugin_list"
    plugin_exec = "plugin_exec"
    stat = "stat"
    recover = "recover"
    cue_forward = "cue_forward"
    cue_backward = "cue_backward"


class PlayoutRequestModel(RequestModel):
    id_channel: int = Field(..., title="Channel ID")
    action: PlayoutAction = Field(
        ...,
        title="Action",
        description="Action to be executed on the playout service",
    )
    payload: dict[str, Any] = Field(
        default_factory=dict,
        title="Payload",
        description="Engine specific action arguments",
    )


class PlayoutResponseModel(ResponseModel):
    plugins: list[str] | None = Field(default_factory=list)

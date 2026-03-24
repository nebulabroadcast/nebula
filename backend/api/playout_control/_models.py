from enum import Enum
from typing import Annotated, Any, Literal

from pydantic import Field

from server.models import APIModel


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


class PlayoutControlRequest(APIModel):
    id_channel: Annotated[
        int,
        Field(
            title="Channel ID",
            ge=1,
        ),
    ]

    action: Annotated[
        PlayoutAction,
        Field(
            title="Action",
            description="Action to be executed on the playout service",
            examples=["take"],
        ),
    ]

    payload: Annotated[
        dict[str, Any],
        Field(
            default_factory=dict,
            title="Payload",
            description="Engine specific action arguments",
            examples=[{}],
        ),
    ]


class PlayoutPluginSlotOption(APIModel):
    value: str
    title: str | None = None


class PlayoutPluginSlot(APIModel):
    type: Literal["action", "text", "number", "select"] = Field(...)
    name: str = Field(...)
    options: list[PlayoutPluginSlotOption] = Field(default_factory=list)
    value: Any = None

    @property
    def title(self) -> str:
        return self.name.replace("_", " ").title()


class PlayoutPluginManifest(APIModel):
    name: Annotated[
        str,
        Field(
            title="Plugin name",
            examples=["lower_third"],
        ),
    ]

    title: Annotated[
        str,
        Field(
            title="Plugin title",
            examples=["Lower third"],
        ),
    ]

    slots: Annotated[
        list[PlayoutPluginSlot] | None,
        Field(
            title="Plugin slots",
            description="List of plugin slots (inputs)",
            examples=[
                [
                    {
                        "type": "text",
                        "name": "full_name",
                        "value": "John Doe",
                    },
                    {
                        "type": "text",
                        "name": "title",
                        "value": "CEO",
                    },
                    {
                        "type": "select",
                        "name": "color",
                        "options": [
                            {"value": "red", "title": "Red"},
                            {"value": "green", "title": "Green"},
                            {"value": "blue", "title": "Blue"},
                        ],
                        "value": "red",
                    },
                    {
                        "type": "action",
                        "name": "show",
                    },
                    {
                        "type": "action",
                        "name": "hide",
                    },
                ],
            ],
        ),
    ] = None


class PlayoutControlResponse(APIModel):
    plugins: Annotated[
        list[PlayoutPluginManifest] | None,
        Field(
            default_factory=list,
        ),
    ]

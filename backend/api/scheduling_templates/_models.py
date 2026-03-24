from typing import Annotated

from pydantic import Field

from server.models import APIModel


class SchedulingTemplateItemModel(APIModel):
    name: Annotated[
        str,
        Field(
            title="Template name",
            examples=["my_template"],
        ),
    ]

    title: Annotated[
        str,
        Field(
            title="Template title",
            examples=["My Template"],
        ),
    ]


class ListSchedulingTemplatesResponse(APIModel):
    templates: Annotated[
        list[SchedulingTemplateItemModel],
        Field(
            default_factory=list,
            title="Templates",
        ),
    ]


class ApplySchedulingTemplateRequest(APIModel):
    id_channel: Annotated[
        int,
        Field(
            title="Channel ID",
            examples=[1],
        ),
    ]

    template_name: Annotated[
        str,
        Field(
            title="Template name",
            examples=["my_template"],
        ),
    ]

    date: Annotated[
        str,
        Field(
            title="Date",
            examples=["2022-12-31"],
        ),
    ]

    clear: Annotated[
        bool,
        Field(
            title="Clear events",
            description="Clear all events before applying the template",
        ),
    ] = False

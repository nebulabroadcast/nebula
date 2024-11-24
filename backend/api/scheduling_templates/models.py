from typing import Annotated

from pydantic import BaseModel, Field

from server.models import RequestModel, ResponseModel


class TemplateItemModel(BaseModel):
    name: Annotated[str, Field(..., title="Template name", examples=["my_template"])]
    title: Annotated[str, Field(..., title="Template title", examples=["My Template"])]


class ListTemplatesResponseModel(ResponseModel):
    templates: Annotated[
        list[TemplateItemModel],
        Field(
            default_factory=lambda: [],
            title="Templates",
        ),
    ]


class ApplyTemplateRequestModel(RequestModel):
    id_channel: Annotated[int, Field(..., title="Channel ID", examples=[1])]
    template_name: Annotated[
        str, Field(..., title="Template name", examples=["my_template"])
    ]
    date: Annotated[str, Field(..., title="Date", examples=["2021-12-31"])]

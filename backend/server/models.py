__all__ = ["Field", "RequestModel", "ResponseModel", "ContextPluginResponseModel"]

from typing import Any, Literal

from pydantic import BaseModel, Field


def camelize(src: str) -> str:
    """Convert snake_case to camelCase."""
    components = src.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class RequestModel(BaseModel):
    pass


class ResponseModel(BaseModel):
    pass


class ContextPluginResponseModel(ResponseModel):
    type: Literal["table", "markdown", "cards"] = Field(...)
    header: str | None = Field(None)
    footer: str | None = Field(None)
    dialog_style: dict[str, Any] | None = Field(None)
    payload: Any | None = Field(None)

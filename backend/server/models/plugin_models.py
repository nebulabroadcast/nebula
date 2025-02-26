from typing import Any, Literal

from pydantic import BaseModel, Field


class ContextPluginResponseModel(BaseModel):
    type: Literal["table", "markdown", "cards"] = Field(...)
    header: str | None = Field(None)
    footer: str | None = Field(None)
    dialog_style: dict[str, Any] | None = Field(None)
    payload: Any | None = Field(None)

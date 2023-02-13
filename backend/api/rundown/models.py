from typing import Literal

from pydantic import Field

from nebula.enum import ObjectStatus, RunMode
from server.models import RequestModel, ResponseModel

ItemMode = Literal["lead_in", "lead_out", "placeholder", "live"]


class RundownRequestModel(RequestModel):
    id_channel: int = Field(...)
    date: str | None = Field(None, regex=r"\d{4}-\d{2}-\d{2}")


class RundownRow(ResponseModel):
    id: int = Field(...)
    type: Literal["item", "event"] = Field(...)
    id_bin: int = Field(...)
    scheduled_time: float = Field(...)
    broadcast_time: float = Field(...)
    meta: dict | None = Field(None)

    title: str | None = Field(None)
    subtitle: str | None = Field(None)
    id_asset: int | None = Field(None)
    asset_mtime: float | None = Field(None)
    status: ObjectStatus | None = Field(None)
    transfer_progress: int | None = Field(None)

    duration: float = Field(0)
    mark_in: float | None = Field(None)
    mark_out: float | None = Field(None)
    run_mode: RunMode | None = Field(None)
    item_role: ItemMode | None = Field(None)


class RundownResponseModel(ResponseModel):
    rows: list[RundownRow] = Field(default_factory=list)

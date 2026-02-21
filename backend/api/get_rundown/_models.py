from typing import Annotated, Any, Literal

from pydantic import Field

from nebula.enum import ObjectStatus, RunMode
from server.models import APIModel

type ItemRole = Literal["lead_in", "lead_out", "placeholder", "live"]


class RundownRequest(APIModel):
    id_channel: Annotated[
        int,
        Field(
            title="Channel ID",
            ge=1,
        ),
    ]
    date: Annotated[
        str | None,
        Field(
            title="Date",
            description=(
                "Date for which to load the rundown in YYYY-MM-DD format. "
                "If not provided, the current date is used."
            ),
            pattern=r"\d{4}-\d{2}-\d{2}",
            examples=["2026-08-09"],
        ),
    ] = None


class RundownRow(APIModel):
    id: int
    row_number: int
    type: Literal["item", "event"]
    id_bin: int
    id_event: int
    scheduled_time: float
    broadcast_time: float
    meta: dict[str, Any] | None = None

    title: str | None = None
    subtitle: str | None = None
    note: str | None = None
    id_asset: int | None = None
    id_folder: int | None = None
    asset_mtime: float | None = None
    status: ObjectStatus | None = None
    transfer_progress: int | None = None

    duration: float = 0
    mark_in: float | None = None
    mark_out: float | None = None
    loop: bool | None = None
    run_mode: RunMode | None = None
    item_role: ItemRole | None = None
    is_empty: bool = False
    is_primary: bool = False


class RundownResponse(APIModel):
    rows: Annotated[
        list[RundownRow],
        Field(
            title="Rundown rows",
            default_factory=list,
        ),
    ]

    detail: Annotated[
        str | None,
        Field(
            title="Response detail message",
            examples=["Rundown loaded in 0.01 seconds"],
        ),
    ] = None

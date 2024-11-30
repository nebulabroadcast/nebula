from typing import Any

from pydantic import Field

from nebula.helpers.create_new_event import EventData
from server.models import RequestModel, ResponseModel


class SchedulerRequestModel(RequestModel):
    id_channel: int = Field(
        ...,
        title="Channel ID",
        examples=[1],
    )

    date: str | None = Field(
        None,
        description="Date of the week start in YYYY-MM-DD format."
        "If none. event data won't be returned.",
        pattern=r"\d{4}-\d{2}-\d{2}",
        examples=["2022-07-25"],
    )

    days: int = Field(
        7,
        title="Days",
        description="Number of days to display. One week is the default",
        examples=[7],
    )

    delete: list[int] = Field(
        default_factory=list,
        title="Delete events",
        description="List of event IDs to delete",
        examples=[[134, 135, 136]],
    )

    events: list[EventData] = Field(
        default_factory=list,
        title="Events",
        description="List of events to create or update",
    )


class SchedulerResponseModel(ResponseModel):
    affected_events: list[int] = Field(
        default_factory=list,
        title="Affected events",
        description="List of event IDs that were affected by this request",
        examples=[[134, 135, 136]],
    )

    affected_bins: list[int] = Field(
        default_factory=list,
        title="Affected bins",
        description="List of bin IDs that were affected by this request",
        examples=[[134, 135, 136]],
    )

    events: list[dict[str, Any]] = Field(
        default_factory=list,
        title="Events",
        description="List of events",
    )

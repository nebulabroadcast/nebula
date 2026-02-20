from typing import Annotated, Any

from pydantic import Field

from nebula.helpers.create_new_event import EventData
from server.models import APIModel


class SchedulerRequest(APIModel):
    id_channel: Annotated[
        int,
        Field(
            title="Channel ID",
            ge=1,
            examples=[1],
        ),
    ]

    date: Annotated[
        str | None,
        Field(
            description=(
                "Date of the week start in YYYY-MM-DD format."
                "If none. event data won't be returned."
            ),
            pattern=r"\d{4}-\d{2}-\d{2}",
            examples=["2022-07-25"],
        ),
    ] = None

    days: Annotated[
        int,
        Field(
            title="Days",
            description="Number of days to display. One week is the default",
            ge=1,
            examples=[7],
        ),
    ] = 7

    delete: Annotated[
        list[int],
        Field(
            default_factory=list,
            title="Delete events",
            description="List of event IDs to delete",
            examples=[[134, 135, 136]],
        ),
    ]

    events: Annotated[
        list[EventData],
        Field(
            default_factory=list,
            title="Events",
            description="List of events to create or update",
        ),
    ]


class SchedulerResponse(APIModel):
    affected_events: Annotated[
        list[int],
        Field(
            default_factory=list,
            title="Affected events",
            description="List of event IDs that were affected by this request",
            examples=[[134, 135, 136]],
        ),
    ]

    affected_bins: Annotated[
        list[int],
        Field(
            default_factory=list,
            title="Affected bins",
            description="List of bin IDs that were affected by this request",
            examples=[[134, 135, 136]],
        ),
    ]

    events: Annotated[
        list[dict[str, Any]],
        Field(
            default_factory=list,
            title="Events",
            description="List of events",
        ),
    ]

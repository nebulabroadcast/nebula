from pydantic import Field

from server.models import RequestModel, ResponseModel

Serializable = int | str | float | list[str] | bool | None


class EventData(RequestModel):
    id: int | None = Field(
        None,
        title="Event ID",
        description="Event ID. None for new events.",
        example=320,
    )

    start: int = Field(
        ...,
        title="Start time",
        example=1620000000,
    )

    id_asset: int | None = Field(
        None,
        title="Asset ID",
        description="ID of the asset to be used as a primary asset for this event.",
        example=123,
    )

    items: list[dict[str, Serializable]] | None = Field(default_factory=list)

    meta: dict[str, Serializable] | None = Field(
        default=None,
        title="Event metadata",
        description="Metadata for the event.",
        example={
            "title": "My event",
            "subtitle": "My event subtitle",
            "genre": "My genre",
        },
    )

    # TODO: validate meta object against the channel_config fields


class SchedulerRequestModel(RequestModel):
    id_channel: int = Field(
        ...,
        title="Channel ID",
        example=1,
    )

    date: str | None = Field(
        None,
        description="Date of the week start in YYYY-MM-DD format."
        "If none. event data won't be returned.",
        regex=r"\d{4}-\d{2}-\d{2}",
        example="2022-07-25",
    )

    days: int = Field(
        7,
        title="Days",
        description="Number of days to display. One week is the default",
        example=7,
    )

    delete: list[int] = Field(
        default_factory=list,
        title="Delete events",
        description="List of event IDs to delete",
        example=[134, 135, 136],
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
    )

    events: list[dict] = Field(
        default_factory=list,
        title="Events",
        description="List of events",
    )

from typing import Annotated

from pydantic import Field

from nebula.enum import ServiceState
from server import APIModel


class ServiceListItem(APIModel):
    id: Annotated[int, Field(title="Service ID", gt=0)]
    name: Annotated[str, Field(title="Service name")]
    type: Annotated[str, Field(title="Service type")]
    hostname: Annotated[str, Field(title="Hostname")]
    status: Annotated[
        ServiceState,
        Field(
            title="Service status",
            description="Current status of the service",
        ),
    ]

    autostart: Annotated[
        bool,
        Field(
            title="Autostart",
        ),
    ]

    last_seen: Annotated[
        float,
        Field(
            title="Last seen",
            description="Number of seconds since service was last seen",
        ),
    ]


class ManageServicesRequest(APIModel):
    stop: Annotated[
        int | None,
        Field(
            title="Stop ID",
            description="ID of service to stop",
            examples=[42],
        ),
    ] = None

    start: Annotated[
        int | None,
        Field(
            title="Start ID",
            description="ID of service to start",
            examples=[None],
        ),
    ] = None

    auto: Annotated[
        int | None,
        Field(
            title="Toggle autostart",
            description="ID of service to toggle autostart",
        ),
    ] = None


class ManageServicesResponse(APIModel):
    services: list[ServiceListItem] = Field(default_factory=list)

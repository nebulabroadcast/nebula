import time

from fastapi import Depends
from pydantic import Field

import nebula
from nebula.enum import ServiceState
from server.dependencies import current_user
from server.models import RequestModel, ResponseModel
from server.request import APIRequest


class ServiceItemModel(RequestModel):
    id: int = Field(..., title="Service ID")
    name: str = Field(..., title="Service name")
    type: str = Field(..., title="Service type")
    status: ServiceState = Field(
        ...,
        title="Service status",
        description="Current status of the service",
    )
    last_seen: float = Field(
        ...,
        title="Last seen",
        description="Number of seconds since service was last seen",
    )


class ServiceRequestModel(RequestModel):
    stop: int | None = Field(
        None,
        title="Stop ID",
        description="ID of service to stop",
        example=42
    )
    start: int | None = Field(
        None,
        title="Start ID",
        description="ID of service to start",
        example=None
    )
    auto: int | None = Field(
        False,
        title="Toggle autostart",
        description="ID of service to toggle autostart",
    )


class ServicesResponseModel(ResponseModel):
    services: list[ServiceItemModel] = Field(default_factory=list)


class Request(APIRequest):
    """Get a list of objects"""

    name: str = "services"
    title: str = "Service control"
    response_model = ServicesResponseModel

    async def handle(
        self,
        request: ServiceRequestModel,
        user: nebula.User = Depends(current_user),
    ) -> ServicesResponseModel:
        """List and control installed services."""

        if request.stop:
            await nebula.db.execute(
                "UPDATE services SET state = $1  WHERE id = $2",
                ServiceState.STOPPING,
                request.stop,
            )
        if request.start:
            await nebula.db.execute(
                "UPDATE services SET state = $1  WHERE id = $2",
                ServiceState.STARTING,
                request.start,
            )
        if request.auto:
            await nebula.db.execute(
                "UPDATE services SET autostart = NOT autostart WHERE id = $2",
                request.auto,
            )

        query = """
            SELECT
                id,
                title,
                service_type,
                state,
                last_seen
            FROM services
            ORDER BY id
        """
        data = []

        async for row in nebula.db.iterate(query):
            data.append(
                ServiceItemModel(
                    id=row["id"],
                    name=row["title"],
                    type=row["service_type"],
                    status=row["state"],
                    last_seen=time.time() - row["last_seen"],
                )
            )

        return ServicesResponseModel(services=data)

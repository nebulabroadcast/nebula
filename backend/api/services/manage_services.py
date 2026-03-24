import time

import nebula
from nebula.enum import ServiceState
from server import APIRequest
from server.dependencies import CurrentUser

from ._models import ManageServicesRequest, ManageServicesResponse, ServiceListItem


class ManageServices(APIRequest):
    """
    List and control installed services.

    This endpoint allows users to list all installed services and control their state.
    Users can start, stop, or toggle the autostart setting of a service by providing
    the respective service ID in the request.
    """

    name = "services"
    title = "Manage services"
    category = "System"

    async def handle(
        self,
        request: ManageServicesRequest,
        user: CurrentUser,
    ) -> ManageServicesResponse:
        if not user.can("service_control", anyval=True):
            msg = "You do not have permission to list or control services"
            raise nebula.ForbiddenException(msg)

        if request.stop:
            if not user.can("service_control", request.stop):
                msg = f"You do not have permission to stop service {request.stop}"
                raise nebula.ForbiddenException(msg)
            nebula.log.info(f"Stopping service {request.stop}", user=user.name)
            await nebula.db.execute(
                "UPDATE services SET state = $1  WHERE id = $2",
                ServiceState.STOPPING,
                request.stop,
            )
        if request.start:
            if not user.can("service_control", request.start):
                msg = f"You do not have permission to start service {request.start}"
                raise nebula.ForbiddenException(msg)
            nebula.log.info(f"Starting service {request.start}", user=user.name)
            await nebula.db.execute(
                "UPDATE services SET state = $1  WHERE id = $2",
                ServiceState.STARTING,
                request.start,
            )
        if request.auto:
            if not user.can("service_control", request.auto):
                msg = f"You do not have permission to toggle service {request.start}"
                raise nebula.ForbiddenException(msg)
            nebula.log.info(
                f"Toggling autostart for service {request.auto}", user=user.name
            )
            await nebula.db.execute(
                "UPDATE services SET autostart = NOT autostart WHERE id = $1",
                request.auto,
            )

        query = """
            SELECT
                id,
                title,
                service_type,
                host,
                state,
                autostart,
                last_seen
            FROM services
            ORDER BY id
        """
        data = [
            ServiceListItem(
                id=row["id"],
                name=row["title"],
                type=row["service_type"],
                hostname=row["host"],
                status=row["state"],
                autostart=row["autostart"],
                last_seen=time.time() - row["last_seen"],
            )
            async for row in nebula.db.iterate(query)
        ]

        return ManageServicesResponse(services=data)

from fastapi import Depends

import nebula
from server.dependencies import current_user, request_initiator
from server.request import APIRequest

from .models import SchedulerRequestModel, SchedulerResponseModel
from .scheduler import scheduler


class Request(APIRequest):
    """Modify a channel schedule"""

    name: str = "scheduler"
    title: str = "Scheduler"
    response_model = SchedulerResponseModel

    async def handle(
        self,
        request: SchedulerRequestModel,
        user: nebula.User = Depends(current_user),
        initiator: str = Depends(request_initiator),
    ) -> SchedulerResponseModel:

        has_rights = True  # TODO

        result = await scheduler(request, has_rights)

        if result.affected_events:
            await nebula.msg(
                "objects_changed",
                objects=result.affected_events,
                object_type="event",
                initiator=initiator,
            )
        return result

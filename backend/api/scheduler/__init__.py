import nebula
from nebula.helpers.scheduling import bin_refresh
from server.dependencies import CurrentUser, RequestInitiator
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
        user: CurrentUser,
        initiator: RequestInitiator,
    ) -> SchedulerResponseModel:
        if not user.can("scheduler_view", request.id_channel):
            raise nebula.ForbiddenException("You are not allowed to view this channel")

        editable = user.can("scheduler_edit", request.id_channel)
        result = await scheduler(request, editable, user=user)

        if result.affected_bins:
            await bin_refresh(
                result.affected_bins,
                initiator=initiator,
                user=user,
            )

        if result.affected_events:
            await nebula.msg(
                "objects_changed",
                objects=result.affected_events,
                object_type="event",
                initiator=initiator,
            )
        return result

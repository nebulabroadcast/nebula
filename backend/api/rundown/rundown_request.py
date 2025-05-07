import nebula
from nebula.coalescer import Coalescer
from server.dependencies import CurrentUser
from server.request import APIRequest

from .get_rundown import get_rundown
from .models import RundownRequestModel, RundownResponseModel


class RundownRequest(APIRequest):
    """Retrieve the rundown for a specified channel and date.

    The rundown is a list of items scheduled for broadcast on a given day.
    Items are ordered by their start time and include metadata such as
    scheduled time and actual broadcast time. During the broadcast, the
    actual time is updated to reflect the real broadcast time.

    The rundown also includes non-playable items like blocks, placeholders,
    and loop markers.

    The date should be specified in the format YYYY-MM-DD, considering the
    channel's start time as configured. If no date is specified, the current
    date is used.
    """

    name = "rundown"
    title = "Get rundown"
    response_model = RundownResponseModel

    async def handle(
        self,
        request: RundownRequestModel,
        user: CurrentUser,
    ) -> RundownResponseModel:
        if not user.can("rundown_view", request.id_channel):
            raise nebula.ForbiddenException("You are not allowed to view this rundown")

        coalesce = Coalescer()
        rundown = await coalesce(get_rundown, request.id_channel, request.date)
        return await rundown

import nebula
from server.dependencies import CurrentUser
from server.request import APIRequest

from .models import RundownRequestModel, RundownResponseModel
from .rundown import get_rundown


class Request(APIRequest):
    """Get a rundown for the given day

    Date is specified in YYYY-mm-dd format and it takes in
    account the channel broadcast start setting (usually 7:00)

    Rundown is a list of items that are scheduled to be broadcasted
    in the given day. Items are ordered by their start time and contain
    additional metadata such as scheduled time, actual broadcast time,
    etc. During the broadcast, the actual time is updated to reflect
    the real broadcast time.

    Additional non-playable items are also included in the rundown,
    such as blocks, placeholders, loop markers and so on.
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

        return await get_rundown(request)

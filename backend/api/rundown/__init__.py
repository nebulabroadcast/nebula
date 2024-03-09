import nebula
from server.dependencies import CurrentUser
from server.request import APIRequest

from .models import RundownRequestModel, RundownResponseModel
from .rundown import get_rundown


class Request(APIRequest):
    """Get a rundown"""

    name: str = "rundown"
    title: str = "Get rundown"
    response_model = RundownResponseModel

    async def handle(
        self,
        request: RundownRequestModel,
        user: CurrentUser,
    ) -> RundownResponseModel:
        if not user.can("rundown_view", request.id_channel):
            raise nebula.ForbiddenException("You are not allowed to view this rundown")

        return await get_rundown(request)

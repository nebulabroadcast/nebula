from fastapi import Depends

import nebula
from server.dependencies import current_user
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
        user: nebula.User = Depends(current_user),
    ) -> RundownResponseModel:

        if user.can("rundown_view", request.id_channel):
            raise nebula.ForbiddenException("You are not allowed to view this rundown")

        return await get_rundown(request)

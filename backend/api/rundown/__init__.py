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

        # TODO: Handle ACL here
        # if not (
        #     user.has_right("rundown_view", id_channel)
        #     or user.has_right("rundown_edit", id_channel)
        # ):

        return await get_rundown(request)

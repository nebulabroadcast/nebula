# import httpx
import requests
from fastapi import Depends

import nebula
from server.dependencies import current_user
from server.request import APIRequest

from .models import PlayoutRequestModel, PlayoutResponseModel


class Request(APIRequest):
    """Control a playout server"""

    name: str = "playout"
    title: str = "Playout"
    response_model = PlayoutResponseModel

    def handle(
        self,
        request: PlayoutRequestModel,
        user: nebula.User = Depends(current_user),
    ) -> PlayoutResponseModel:
        channel = nebula.settings.get_playout_channel(request.id_channel)
        if not channel:
            raise nebula.NotFoundException("Channel not found")

        if channel.engine == "dummy":
            return PlayoutResponseModel(plugins=[])

        controller_url = f"http://{channel.controller_host}:{channel.controller_port}"

        response = requests.post(
            f"{controller_url}/{request.action.value}",
            json=request.payload,
            timeout=4,
        )
        try:
            data = response.json()
        except Exception as e:
            nebula.log.error("Unable to parse response from playout controller")
            raise nebula.NebulaException(
                "Unable to parse response from playout controller"
            ) from e
 
        # async with httpx.AsyncClient() as client:
        #     response = await client.post(
        #         f"{controller_url}/{request.action.value}",
        #         json=request.payload,
        #         timeout=4,
        #     )
        #     data = response.json()

        if not response:
            raise nebula.NebulaException(data["message"])

        return PlayoutResponseModel(plugins=data.get("plugins"))

# import httpx
import requests

import nebula
from server.dependencies import CurrentUser
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
        user: CurrentUser,
    ) -> PlayoutResponseModel:
        channel = nebula.settings.get_playout_channel(request.id_channel)
        if not channel:
            raise nebula.NotFoundException("Channel not found")

        # TODO: Check if user has access to this channel

        # For dummy engine, return empty response
        if channel.engine == "dummy":
            return PlayoutResponseModel(plugins=[])

        #
        # Make a request to the playout controller
        #

        controller_url = f"http://{channel.controller_host}:{channel.controller_port}"

        # async with httpx.AsyncClient() as client:
        #     response = await client.post(
        #         f"{controller_url}/{request.action.value}",
        #         json=request.payload,
        #         timeout=4,
        #     )

        # HTTPx stopped working for some reason, raising asyncio.CancelledError
        # when trying to send a request. Using requests for now.

        response = requests.post(
            f"{controller_url}/{request.action.value}",
            json=request.payload,
            timeout=4,
        )

        #
        # Parse response and return
        #

        try:
            data = response.json()
        except Exception as e:
            nebula.log.error("Unable to parse response from playout controller")
            raise nebula.NebulaException(
                "Unable to parse response from playout controller"
            ) from e

        if not response:
            raise nebula.NebulaException(data.get("message", "Unknown error"))

        return PlayoutResponseModel(plugins=data.get("plugins"))

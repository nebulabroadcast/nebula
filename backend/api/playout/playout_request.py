import requests

import nebula
from server.dependencies import CurrentUser
from server.request import APIRequest

from .models import PlayoutRequestModel, PlayoutResponseModel


class PlayoutRequest(APIRequest):
    """Control a playout server"""

    name = "playout"
    title = "Playout"
    response_model = PlayoutResponseModel

    def handle(
        self,
        request: PlayoutRequestModel,
        user: CurrentUser,
    ) -> PlayoutResponseModel:
        channel = nebula.settings.get_playout_channel(request.id_channel)
        if not channel:
            raise nebula.NotFoundException("Channel not found")

        if not user.can("mcr", channel.id):
            raise nebula.ForbiddenException(
                "You are not allowed to control this channel"
            )

        # For dummy engine, return empty response
        if channel.engine == "dummy":
            return PlayoutResponseModel(plugins=[])

        #
        # Make a request to the playout controller
        #

        controller_url = f"http://{channel.controller_host}:{channel.controller_port}"

        # HTTPx stopped working for some reason, raising asyncio.CancelledError
        # when trying to send a request. Using requests for now.

        try:
            response = requests.post(
                f"{controller_url}/{request.action.value}",
                json=request.payload,
                timeout=4,
            )
        except requests.exceptions.ConnectionError as e:
            nebula.log.error("Unable to connect to playout controller")
            raise nebula.NebulaException(
                "Unable to connect to playout controller"
            ) from e

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

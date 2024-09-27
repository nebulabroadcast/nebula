import nebula
from nebula.helpers.scheduling import bin_refresh
from server.dependencies import CurrentUser, RequestInitiator
from server.request import APIRequest

from .models import OrderRequestModel, OrderResponseModel
from .order import set_rundown_order


class Request(APIRequest):
    """Set the order of items of a rundown"""

    name: str = "order"
    title: str = "Order"
    response_model = OrderResponseModel

    async def handle(
        self,
        request: OrderRequestModel,
        user: CurrentUser,
        initiator: RequestInitiator,
    ) -> OrderResponseModel:
        if not user.can("rundown_edit", request.id_channel):
            raise nebula.ForbiddenException("You are not allowed to edit this rundown")

        result = await set_rundown_order(request, user)
        nebula.log.info(f"Changed order in bins {result.affected_bins}", user=user.name)

        # Update bin duration
        await bin_refresh(result.affected_bins, initiator=initiator, user=user)
        return result

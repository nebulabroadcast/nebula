import nebula
from nebula.helpers.scheduling import bin_refresh
from server.dependencies import CurrentUser, RequestInitiator
from server.request import APIRequest

from ._models import OrderRequest, OrderResponse
from ._set_items_order import set_items_order


class OrderItems(APIRequest):
    """Set the order of items of a rundown"""

    name = "order"
    title = "Order items"
    category = "Scheduling"

    async def handle(
        self,
        request: OrderRequest,
        user: CurrentUser,
        initiator: RequestInitiator,
    ) -> OrderResponse:
        if not user.can("rundown_edit", request.id_channel):
            raise nebula.ForbiddenException("You are not allowed to edit this rundown")

        result = await set_items_order(request, user)
        nebula.log.info(f"Changed order in bins {result.affected_bins}", user=user.name)

        # Update bin duration
        await bin_refresh(result.affected_bins, initiator=initiator, user=user)
        return result

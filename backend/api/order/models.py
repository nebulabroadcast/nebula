from typing import Any, Literal

from pydantic import Field

from server.models import RequestModel, ResponseModel


class OrderItemModel(RequestModel):
    """An item in the order request"""

    id: int | None = Field(
        None,
        title="ID",
        description="The ID of the object (none for new items)",
    )
    type: Literal["item", "asset"] = Field(..., title="Object type")
    meta: dict[str, Any] = Field(default_factory=dict, title="Object metadata")


class OrderRequestModel(RequestModel):
    id_channel: int = Field(..., title="Channel ID")
    id_bin: int = Field(..., title="Bin ID")
    order: list[OrderItemModel] = Field(..., title="Order")


class OrderResponseModel(ResponseModel):
    affected_bins: list[int] = Field(..., title="Affected bins")

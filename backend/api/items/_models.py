from typing import Annotated, Any, Literal

from pydantic import Field

from server.models import APIModel


class OrderItem(APIModel):
    """An item in the order request"""

    type: Annotated[
        Literal["item", "asset"],
        Field(
            title="Object type",
            examples=["item", "asset"],
        ),
    ]

    id: Annotated[
        int | None,
        Field(
            title="ID",
            description="The ID of the object (none for new items)",
            examples=[1],
        ),
    ] = None

    meta: Annotated[
        dict[str, Any],
        Field(
            default_factory=dict,
            title="Object metadata",
            examples=[{"title": "Placeholder"}],
        ),
    ]


class OrderRequest(APIModel):
    id_channel: Annotated[
        int,
        Field(
            title="Channel ID",
            ge=1,
            examples=[1],
        ),
    ]

    id_bin: Annotated[
        int,
        Field(
            title="Bin ID",
            ge=1,
            examples=[134],
        ),
    ]

    order: Annotated[
        list[OrderItem],
        Field(
            title="Order",
        ),
    ]


class OrderResponse(APIModel):
    affected_bins: Annotated[
        list[int],
        Field(
            title="Affected bins",
            description=(
                "List of bins affected by the order change"
                "This includes the bin where the order was applied "
                "and any other bins that had items moved to/from it."
                "This allows the client to know which bins need to be "
                "refreshed after the order change."
            ),
        ),
    ]

from typing import Annotated, Literal

from pydantic import Field

from nebula.common import SerializableValue
from server import APIModel

type OrderDirection = Literal["asc", "desc"]

type ConditionOperator = Literal[
    "=",
    "LIKE",
    "ILIKE",
    "IN",
    "NOT IN",
    "IS NULL",
    "IS NOT NULL",
    ">",
    ">=",
    "<",
    "<=",
]


class ConditionModel(APIModel):
    key: Annotated[str, Field(title="Key", examples=["status"])]
    value: Annotated[SerializableValue, Field(title="Value", examples=[1])] = None
    operator: Annotated[ConditionOperator, Field(examples=["="])] = "="


class BrowseAssetsRequest(APIModel):
    view: Annotated[
        int | None,
        Field(
            title="View ID",
            examples=[1],
        ),
    ] = None

    query: Annotated[
        str | None,
        Field(
            title="Search query",
            examples=["star trek"],
        ),
    ] = None

    conditions: Annotated[
        list[ConditionModel] | None,
        Field(
            title="Conditions",
            description="List of additional conditions",
            examples=[
                [
                    {"key": "id_folder", "value": 1, "operator": "="},
                ]
            ],
        ),
    ] = None

    columns: Annotated[
        list[str] | None,
        Field(
            title="Columns",
            description="Override the view columns."
            "Note that several columns are always included.",
            examples=[["title", "subtitle", "id_folder"]],
        ),
    ] = None

    ignore_view_conditions: Annotated[
        bool,
        Field(
            title="Ignore view conditions",
        ),
    ] = False

    limit: Annotated[
        int,
        Field(
            title="Limit",
            description="Maximum number of items",
        ),
    ] = 500

    offset: Annotated[
        int,
        Field(
            title="Offset",
            description="Offset",
        ),
    ] = 0

    order_by: Annotated[
        str,
        Field(
            title="Order by",
        ),
    ] = "ctime"

    order_dir: Annotated[
        OrderDirection,
        Field(
            title="Order direction",
        ),
    ] = "desc"


class BrowseAssetsResponse(APIModel):
    columns: Annotated[
        list[str],
        Field(
            title="Columns",
            examples=[["id", "title", "duration"]],
        ),
    ]

    data: Annotated[
        list[dict[str, SerializableValue]],
        Field(
            examples=[
                [
                    {
                        "id": 1,
                        "title": "Star Trek IV",
                        "subtitle": "The Voyage Home",
                        "id_folder": 1,
                        "status": 1,
                        "duration": 6124.3,
                    }
                ]
            ],
        ),
    ]

    order_by: Annotated[
        str,
        Field(
            title="Order by",
        ),
    ]

    order_dir: Annotated[
        OrderDirection,
        Field(
            title="Order direction",
        ),
    ]

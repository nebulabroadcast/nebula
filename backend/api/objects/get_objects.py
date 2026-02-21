from typing import Annotated, Any

from pydantic import Field

import nebula
from nebula.enum import ObjectType
from server import APIModel, APIRequest
from server.dependencies import CurrentUser

from ._utils import can_access_object


class GetObjectsRequest(APIModel):
    object_type: Annotated[
        ObjectType,
        Field(
            ObjectType.ASSET,
            title="Object type",
            description="Type of objects to get",
            examples=[ObjectType.ASSET],
        ),
    ]

    ids: Annotated[
        list[int],
        Field(
            default_factory=list,
            title="Object IDs",
            description="List of object IDs to retrieve",
            examples=[[1, 2, 3]],
        ),
    ]


class GetObjectsResponse(APIModel):
    data: Annotated[
        list[dict[str, Any]],
        Field(
            default_factory=list,
            title="Object data",
            description="List of object data",
            examples=[
                [
                    {"id": 1, "title": "First movie"},
                    {"id": 2, "title": "Second movie"},
                    {"id": 3, "title": "Third movie"},
                ]
            ],
        ),
    ]


class GetObjects(APIRequest):
    """Get a list of objects"""

    name = "get"
    title = "Get objects"
    category = "Asset management"

    async def handle(
        self,
        request: GetObjectsRequest,
        user: CurrentUser,
    ) -> GetObjectsResponse:
        object_type_name = request.object_type.value
        query = f"SELECT meta FROM {object_type_name}s WHERE id = ANY($1)"

        data = []
        async for row in nebula.db.iterate(query, request.ids):
            if not can_access_object(row["meta"], user):
                raise nebula.ForbiddenException(
                    "You are not allowed to access this object"
                )
            data.append(row["meta"])

        return GetObjectsResponse(data=data)

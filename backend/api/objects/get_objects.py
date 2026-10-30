from typing import Annotated, Any

from pydantic import Field

import nebula
from nebula.enum import ObjectType
from nebula.objects.asset import can_view_asset
from nebula.objects.user import SECRET_KEYS
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
            if request.object_type == ObjectType.ASSET:
                allowed = can_view_asset(user, row["meta"])
            else:
                allowed = can_access_object(row["meta"], user)
            if not allowed:
                raise nebula.ForbiddenException(
                    "You are not allowed to access this object"
                )
            meta = row["meta"]
            if request.object_type == ObjectType.USER:
                meta = {k: v for k, v in meta.items() if k not in SECRET_KEYS}
            data.append(meta)

        return GetObjectsResponse(data=data)

from typing import Any

from pydantic import Field

import nebula
from nebula.enum import ObjectType
from server.dependencies import CurrentUser
from server.models import RequestModel, ResponseModel
from server.request import APIRequest


class GetRequestModel(RequestModel):
    object_type: ObjectType = Field(
        ObjectType.ASSET,
        title="Object type",
        description="Type of objects to get",
        examples=[ObjectType.ASSET],
    )
    ids: list[int] = Field(
        default_factory=list,
        title="Object IDs",
        description="List of object IDs to retrieve",
        examples=[[1, 2, 3]],
    )


class GetResponseModel(ResponseModel):
    data: list[dict[str, Any]] = Field(
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
    )


def can_access_object(user: nebula.User, meta: dict[str, Any]) -> bool:
    if user.is_admin or (user.id in meta.get("assignees", [])):
        return True
    elif user.is_limited:
        if meta.get("created_by") != user.id:
            return False
        return True
    if id_folder := meta.get("id_folder"):
        # Users can view assets in folders they have access to
        return user.can("asset_view", id_folder)

    if login := meta.get("login"):
        # Users can view their own data
        return login == user.name

    # Normal users don't need to access items, bins or events
    # using get requests.
    return False


class Request(APIRequest):
    """Get a list of objects"""

    name: str = "get"
    title: str = "Get objects"
    response_model = GetResponseModel

    async def handle(
        self,
        request: GetRequestModel,
        user: CurrentUser,
    ) -> GetResponseModel:
        object_type_name = request.object_type.value
        query = f"SELECT meta FROM {object_type_name}s WHERE id = ANY($1)"

        data = []
        async for row in nebula.db.iterate(query, request.ids):
            if not can_access_object(user, row["meta"]):
                raise nebula.ForbiddenException(
                    "You are not allowed to access this object"
                )
            data.append(row["meta"])

        return GetResponseModel(data=data)

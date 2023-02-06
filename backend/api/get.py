from typing import Any

from fastapi import Depends
from pydantic import Field

import nebula
from nebula.common import sql_list
from nebula.enum import ObjectType
from server.dependencies import current_user
from server.models import RequestModel, ResponseModel
from server.request import APIRequest


class GetRequestModel(RequestModel):
    object_type: ObjectType = Field(
        ObjectType.ASSET,
        title="Object type",
        description="Type of objects to get",
        example=ObjectType.ASSET,
    )
    ids: list[int] = Field(
        default_factory=list,
        title="Object IDs",
        description="List of object IDs to retrieve",
        example=[1, 2, 3],
    )


class GetResponseModel(ResponseModel):
    data: list[dict[str, Any]] = Field(
        default_factory=list,
        title="Object data",
        description="List of object data",
        example=[
            {"id": 1, "title": "First movie"},
            {"id": 2, "title": "Second movie"},
            {"id": 3, "title": "Third movie"},
        ],
    )


class Request(APIRequest):
    """Get a list of objects"""

    name: str = "get"
    title: str = "Get objects"
    response_model = GetResponseModel

    async def handle(
        self,
        request: GetRequestModel,
        user: nebula.User = Depends(current_user),
    ) -> GetResponseModel:

        query = f"""
            SELECT meta FROM {request.object_type.value}s
            WHERE id IN {sql_list(request.ids)}
        """
        data = []

        async for row in nebula.db.iterate(query):
            if user.is_limited:
                if row["meta"].get("created_by") != user.id:
                    print(row["meta"].get("created_by"), user.id)
                    raise nebula.ForbiddenException(
                        "You are not allowed to access this object"
                    )
            data.append(row["meta"])

        return GetResponseModel(data=data)

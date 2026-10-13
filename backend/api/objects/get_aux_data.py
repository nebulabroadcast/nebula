from typing import Annotated, Any

from pydantic import Field

import nebula
from nebula.enum import ObjectType, ObjectTypeId, get_object_type_id
from nebula.helpers.aux import get_aux
from server.dependencies import CurrentUser
from server.models import APIModel
from server.request import APIRequest


class GetAuxDataRequest(APIModel):
    key: Annotated[
        str | None,
        Field(description="Key of the aux data to retrieve"),
    ] = None

    object_type: Annotated[
        ObjectType, Field(description="Type of the object the aux data is attached to")
    ] = ObjectType.ASSET

    object_id: Annotated[
        int,
        Field(description="ID of the object the aux data is attached to"),
    ]

    can_fail: Annotated[
        bool,
        Field(
            description="Return null instead of a 404 error if  not found.",
        ),
    ] = False


class GetAuxData(APIRequest):
    """Retrieve aux data for a given object."""

    name: str = "get-aux"
    title: str = "Get aux data"
    category = "Asset management"

    async def handle(
        self,
        payload: GetAuxDataRequest,
        user: CurrentUser,
    ) -> Any:

        _ = user  # TODO: check permissions

        object_type_id = ObjectTypeId(get_object_type_id(payload.object_type))
        data = None
        if payload.key is not None:
            data = await get_aux(object_type_id, payload.object_id, payload.key)

        if data is None:
            if payload.can_fail:
                return None
            raise nebula.NotFoundException("Aux data not found")

        return data

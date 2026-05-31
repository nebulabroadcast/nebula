from typing import Annotated, Any

from pydantic import Field

import nebula
from nebula.enum import ObjectType, get_object_type_id
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

        query = """
            SELECT data FROM aux
            WHERE
                key = $1
            AND id_object = $2
            AND object_type = $3
        """

        object_type_id = get_object_type_id(payload.object_type)

        res = await nebula.db.fetchrow(
            query,
            payload.key,
            payload.object_id,
            object_type_id,
        )

        if not res:
            if payload.can_fail:
                return None
            raise nebula.NotFoundException("Aux data not found")

        return res["data"]

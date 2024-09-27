from fastapi import Response
from pydantic import Field

import nebula
from nebula.enum import ObjectType
from nebula.helpers.scheduling import bin_refresh
from nebula.objects.utils import get_object_class_by_name
from server.dependencies import CurrentUser, RequestInitiator
from server.models import RequestModel
from server.request import APIRequest


class DeleteRequestModel(RequestModel):
    object_type: ObjectType = Field(ObjectType.ASSET, title="Object type")
    ids: list[int] = Field(
        ...,
        title="Object IDs",
        description="A list of object IDs to delete",
        examples=[[1, 2, 3]],
    )


class Request(APIRequest):
    """Delete object(s)"""

    name: str = "delete"
    title: str = "Delete objects"
    responses: list[int] = [204, 401, 403]

    async def handle(
        self,
        request: DeleteRequestModel,
        user: CurrentUser,
        initiator: RequestInitiator,
    ) -> Response:
        """Delete given objects."""
        match request.object_type:
            case ObjectType.ITEM:
                # TODO: refactor events

                if not user.can("rundown_edit", anyval=True):
                    raise nebula.ForbiddenException(
                        "You are not allowed to edit this rundown"
                    )

                query = "DELETE FROM items WHERE id = ANY($1) RETURNING id, id_bin"
                affected_bins = set()
                nebula.log.debug(f"Deleted items: {request.ids}", user=user.name)
                async for row in nebula.db.iterate(query, request.ids):
                    affected_bins.add(row["id_bin"])
                await bin_refresh(list(affected_bins), initiator=initiator)
                return Response(status_code=204)

            case ObjectType.USER:
                if not user["is_admin"]:
                    raise nebula.ForbiddenException(
                        "You are not allowed to delete users"
                    )

            case ObjectType.ASSET | ObjectType.EVENT:
                # TODO: ACL HERE?
                # In general, normal users don't need to
                # delete assets or events directly
                if not user.is_admin:
                    raise nebula.ForbiddenException(
                        "You are not allowed to delete this object"
                    )

            case _:
                # do not delete bins directly
                raise nebula.NotImplementedException(
                    f"Deleting {request.object_type} is not implemented"
                )

        # Delete simple objects

        cls = get_object_class_by_name(request.object_type)
        for id_object in request.ids:
            obj = await cls.load(id_object)
            try:
                await obj.delete()
            except Exception:
                nebula.log.traceback(f"Unable to delete {obj}")

        return Response(status_code=204)

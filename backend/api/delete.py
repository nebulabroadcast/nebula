from fastapi import Depends, Response
from pydantic import Field

import nebula
from nebula.common import sql_list
from nebula.enum import ObjectType
from nebula.helpers.scheduling import bin_refresh
from nebula.objects.utils import get_object_class_by_name
from server.dependencies import current_user, request_initiator
from server.models import RequestModel
from server.request import APIRequest


class DeleteRequestModel(RequestModel):
    object_type: ObjectType = Field(ObjectType.ASSET, title="Object type")
    ids: list[int] = Field(
        ...,
        title="Object IDs",
        description="A list of object IDs to delete",
        example=[1, 2, 3],
    )


class Request(APIRequest):
    """Delete object(s)"""

    name: str = "delete"
    title: str = "Delete objects"
    responses: list[int] = [204, 401, 403]

    async def handle(
        self,
        request: DeleteRequestModel,
        user: nebula.User = Depends(current_user),
        initiator: str | None = Depends(request_initiator),
    ) -> Response:
        """Delete given objects."""

        match request.object_type:
            case ObjectType.ITEM:
                # TODO: refactor events

                if not user.can("rundown_edit", anyval=True):
                    raise nebula.ForbiddenException(
                        "You are not allowed to edit this rundown"
                    )

                query = f"""
                    DELETE FROM items
                    WHERE id IN {sql_list(request.ids)}
                    RETURNING id, id_bin
                """
                affected_bins = set()
                async for row in nebula.db.iterate(query):
                    affected_bins.add(row["id_bin"])
                await bin_refresh(list(affected_bins), initiator=initiator)
                return Response(status_code=204)

            case ObjectType.ASSET | ObjectType.EVENT | ObjectType.USER:
                pass
                # TODO: ACL HERE

            case _:
                # do not delete bins directly
                raise nebula.NotImplementedException(
                    f"Deleting {request.obejct_type} is not implemented"
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

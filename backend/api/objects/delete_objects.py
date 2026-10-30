from typing import Annotated

import asyncpg
from pydantic import Field

import nebula
from nebula.enum import ObjectType
from nebula.helpers.scheduling import bin_refresh, ensure_can_edit_rundowns
from nebula.objects.utils import get_object_class_by_name
from server import APIModel, APIRequest
from server.dependencies import CurrentUser
from server.session import Session


class DeleteObjectsRequest(APIModel):
    object_type: Annotated[
        ObjectType,
        Field(
            title="Object type",
        ),
    ] = ObjectType.ASSET

    ids: Annotated[
        list[int],
        Field(
            title="Object IDs",
            description="A list of object IDs to delete",
            examples=[[1, 2, 3]],
        ),
    ]


class DeleteObjects(APIRequest):
    """Delete one or multiple objects from the database"""

    name = "delete"
    title = "Delete objects"
    category = "Asset management"

    async def handle(  # noqa: C901
        self,
        request: DeleteObjectsRequest,
        user: CurrentUser,
    ) -> None:
        """Delete given objects."""
        match request.object_type:
            case ObjectType.ITEM:
                # TODO: refactor events

                q = "SELECT id_bin FROM items WHERE id = ANY($1)"
                rows = await nebula.db.fetch(q, request.ids)
                await ensure_can_edit_rundowns(user, [r["id_bin"] for r in rows])

                query = "DELETE FROM items WHERE id = ANY($1) RETURNING id, id_bin"
                affected_bins = set()
                nebula.log.debug(f"Deleted items: {request.ids}")
                try:
                    async for row in nebula.db.iterate(query, request.ids):
                        affected_bins.add(row["id_bin"])
                except asyncpg.exceptions.ForeignKeyViolationError as e:
                    raise nebula.ConflictException(
                        "Cannot delete item because it was already aired"
                    ) from e
                await bin_refresh(list(affected_bins))
                return

            case ObjectType.USER:
                if not user["is_admin"]:
                    raise nebula.ForbiddenException(
                        "You are not allowed to delete users"
                    )

            case ObjectType.ASSET | ObjectType.EVENT:
                # normal users don't need to
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
                if isinstance(obj, nebula.User):
                    await Session.revoke_user(obj.id, keep_current=False)
            except Exception:
                nebula.log.traceback(f"Unable to delete {obj}")

        return

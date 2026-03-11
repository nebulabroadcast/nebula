from typing import Annotated, Any

from pydantic import Field

import nebula
from nebula.enum import ObjectType
from nebula.helpers.scheduling import bin_refresh
from nebula.objects.base import BaseObject
from nebula.objects.utils import get_object_class_by_name
from nebula.settings import load_settings
from server import APIModel, APIRequest
from server.dependencies import CurrentUser

from ._utils import can_modify_object
from ._validator import Validator


class Operation(APIModel):
    object_type: Annotated[
        ObjectType,
        Field(
            title="Object type",
            examples=[ObjectType.ASSET],
        ),
    ] = ObjectType.ASSET

    id: Annotated[
        int | None,
        Field(
            title="Object ID",
            description="ID of the object to modify. Keep empty to create a new object",
            examples=[42069],
        ),
    ] = None

    data: Annotated[
        dict[str, Any],
        Field(
            description="Metadata to be set",
            examples=[{"title": "Star Trek", "subtitle": "The motion picture"}],
        ),
    ]


class OperationResult(APIModel):
    object_type: Annotated[
        ObjectType,
        Field(
            title="Object type",
        ),
    ] = ObjectType("asset")

    success: Annotated[
        bool,
        Field(
            title="Success",
            description="True if the operation succeeded, false otherwise",
        ),
    ]

    error: Annotated[
        str | None,
        Field(
            title="Error message",
            description="Error message if the operation failed",
        ),
    ] = None

    id: Annotated[
        int | None,
        Field(
            title="Object ID",
            examples=[42069],
        ),
    ] = None


# Multiple operation request


class OperationsRequest(APIModel):
    operations: Annotated[
        list[Operation],
        Field(
            title="Operations",
            description="List of operations to be executed",
        ),
    ]


class OperationsResponse(APIModel):
    operations: Annotated[
        list[OperationResult],
        Field(
            title="Operations",
        ),
    ]
    success: Annotated[
        bool,
        Field(
            title="Success",
            description="True if all operations succeeded",
        ),
    ]


class Operations(APIRequest):
    """Create or update multiple objects in one requests."""

    name = "ops"
    title = "Operations"
    category = "Asset management"

    async def handle(
        self,
        request: OperationsRequest,
        user: CurrentUser,
    ) -> OperationsResponse:
        pool = await nebula.db.pool()
        result = []
        reload_settings = False
        affected_bins: list[int] = []
        for operation in request.operations:
            success = True
            error = None
            op_id = operation.id
            try:
                async with pool.acquire() as conn, conn.transaction():
                    object_class = get_object_class_by_name(operation.object_type)

                    # Object ACL on which ACL check will be performed
                    # For new objects, it's just a copy of operation.data
                    # For existing objects, it's a copy of the existing object
                    acl_obj: BaseObject

                    if operation.id is None:
                        object = object_class(connection=conn, username=user.name)
                        operation.data.pop("id", None)
                        object["created_by"] = user.id
                        object["updated_by"] = user.id

                        acl_obj = object_class.from_meta(operation.data)
                    else:
                        object = await object_class.load(
                            operation.id,
                            connection=conn,
                            username=user.name,
                        )
                        object["updated_by"] = user.id
                        acl_obj = object_class.from_meta({**object.meta})

                    #
                    # Modyfiing users
                    #

                    if isinstance(object, nebula.User):
                        if not (user.is_admin or object.id == user.id):
                            raise nebula.ForbiddenException(
                                "Unable to modify other users"
                            )

                        if not user.is_admin:
                            for key in operation.data:
                                if key.startswith("can/") or key.startswith("is_"):
                                    operation.data.pop(key, None)

                        password = operation.data.pop("password", None)
                        if password:
                            object.set_password(password)

                    #
                    # ACL
                    #

                    await can_modify_object(acl_obj, user)

                    #
                    # Run validator
                    #

                    if validator := Validator.for_object(operation.object_type):
                        try:
                            await validator(
                                object,
                                operation.data,
                                connection=conn,
                                user=user,
                            )
                        except nebula.RequestSettingsReload:
                            reload_settings = True
                    else:
                        object.update(operation.data)
                    await object.save()
                    if (
                        isinstance(object, nebula.Item)
                        and object["id_bin"]
                        and object["id_bin"] not in affected_bins
                    ):
                        affected_bins.append(object["id_bin"])
                    op_id = object.id
            except Exception as e:
                error = str(e)
                success = False

            result.append(
                OperationResult(
                    id=op_id,
                    object_type=operation.object_type,
                    error=error,
                    success=success,
                )
            )

        if affected_bins:
            await bin_refresh(affected_bins)

        if reload_settings:
            await load_settings()

        overall_success = all(x.success for x in result)
        return OperationsResponse(operations=result, success=overall_success)

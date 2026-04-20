from typing import TYPE_CHECKING, Annotated, Any

from pydantic import Field

import nebula
from nebula.enum import ObjectType, get_object_type_id
from nebula.helpers.scheduling import bin_refresh
from nebula.objects.utils import get_object_class_by_name
from nebula.settings import load_settings
from server import APIModel, APIRequest
from server.dependencies import CurrentUser

from ._utils import can_modify_object
from ._validator import Validator

if TYPE_CHECKING:
    from nebula.objects.base import BaseObject


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

    async def handle(  # noqa: C901, PLR0912, PLR0915
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

            aux_data = {}
            for key in list(operation.data.keys()):
                if not key.startswith("__aux/"):
                    continue
                value = operation.data.pop(key)
                _key = key[len("__aux/") :]
                aux_data[_key] = value

            try:
                async with pool.acquire() as conn, conn.transaction():
                    object_class = get_object_class_by_name(operation.object_type)

                    # Object ACL on which ACL check will be performed
                    # For new objects, it's just a copy of operation.data
                    # For existing objects, it's a copy of the existing object
                    acl_obj: BaseObject

                    if operation.id is None:
                        obj = object_class(connection=conn, username=user.name)
                        operation.data.pop("id", None)
                        obj["created_by"] = user.id
                        obj["updated_by"] = user.id

                        acl_obj = object_class.from_meta(operation.data)
                    else:
                        obj = await object_class.load(
                            operation.id,
                            connection=conn,
                            username=user.name,
                        )
                        obj["updated_by"] = user.id
                        acl_obj = object_class.from_meta({**obj.meta})

                    #
                    # Modyfiing users
                    #

                    if isinstance(obj, nebula.User):
                        if not (user.is_admin or obj.id == user.id):
                            raise nebula.ForbiddenException(  # noqa: TRY301
                                "Unable to modify other users"
                            )

                        if not user.is_admin:
                            for key in list(operation.data.keys()):
                                if key.startswith(("can/", "is_")):
                                    operation.data.pop(key, None)

                        password = operation.data.pop("password", None)
                        if password:
                            assert isinstance(obj, nebula.User)
                            obj.set_password(password)

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
                                obj,
                                operation.data,
                                connection=conn,
                                user=user,
                            )
                        except nebula.RequestSettingsReload:
                            reload_settings = True
                    else:
                        obj.update(operation.data)
                    await obj.save()


                    for key, value in aux_data.items():
                        await nebula.db.execute(
                            """
                            INSERT INTO aux (key, object_type, id_object, data)
                            VALUES ($1, $2, $3, $4)
                            ON CONFLICT (key, object_type, id_object) DO UPDATE
                            SET data = EXCLUDED.data
                            """,
                            key,
                            get_object_type_id(operation.object_type),
                            obj.id,
                            value,
                        )

                    if (
                        isinstance(obj, nebula.Item)
                        and obj["id_bin"]
                        and obj["id_bin"] not in affected_bins
                    ):
                        affected_bins.append(obj["id_bin"])
                    op_id = obj.id
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

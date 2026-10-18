from dataclasses import replace
from typing import TYPE_CHECKING, Annotated, Any

from pydantic import Field

import nebula
from nebula.context import get_request_context, request_context
from nebula.enum import ObjectType
from nebula.helpers.scheduling import bin_refresh
from nebula.helpers.validators import Validator
from nebula.objects.asset.changes import save_asset_changes
from nebula.objects.utils import get_object_class_by_name
from nebula.settings import load_settings
from server import APIModel, APIRequest
from server.dependencies import CurrentUser

from ._utils import can_modify_object

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

    async def handle(
        self,
        request: OperationsRequest,
        user: CurrentUser,
    ) -> OperationsResponse:
        return await self.run(request, user)

    async def run(  # noqa: C901, PLR0912, PLR0915
        self,
        request: OperationsRequest,
        user: nebula.User,
        *,
        raise_errors: bool = False,
    ) -> OperationsResponse:
        """Apply the operations. A failed operation is reported in its result,
        unless raise_errors is set: then its exception propagates, so the
        caller gets its status (403, 404...)."""
        result = []
        reload_settings = False
        affected_bins: list[int] = []
        for operation in request.operations:
            success = True
            error = None
            op_id = operation.id

            try:
                if operation.object_type == ObjectType.ASSET:
                    # The same save as REST: key checks, edit rights in the
                    # current and the new folder, validator
                    # save_asset_changes reads the user from the context;
                    # run it as the user this call is for
                    context = replace(get_request_context(), user=user, system=False)
                    with request_context(context):
                        asset = (
                            nebula.Asset()
                            if operation.id is None
                            else await nebula.Asset.load(operation.id)
                        )
                        if await save_asset_changes(
                            asset, operation.data, reload_settings=False
                        ):
                            reload_settings = True
                    op_id = asset.id
                else:
                    async with nebula.db.transaction():
                        object_class = get_object_class_by_name(operation.object_type)

                        # Object ACL on which ACL check will be performed
                        # For new objects, it's just a copy of operation.data
                        # For existing objects, it's a copy of the existing object
                        acl_obj: BaseObject

                        if operation.id is None:
                            obj = object_class()
                            operation.data.pop("id", None)
                            obj["created_by"] = user.id
                            obj["updated_by"] = user.id

                            acl_obj = object_class.from_meta(operation.data)
                        else:
                            obj = await object_class.load(operation.id)
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
                                    # Kept for plugin backward compatibility.
                                    # nebula.db tracks the current transaction
                                    # internally, so this is now always the
                                    # global db singleton.
                                    connection=nebula.db,
                                    user=user,
                                )
                            except nebula.RequestSettingsReload:
                                reload_settings = True
                        else:
                            obj.update(operation.data)
                        await obj.save()

                        if (
                            isinstance(obj, nebula.Item)
                            and obj["id_bin"]
                            and obj["id_bin"] not in affected_bins
                        ):
                            affected_bins.append(obj["id_bin"])
                        op_id = obj.id
            except Exception as e:
                if raise_errors:
                    raise
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

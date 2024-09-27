import os
from typing import TYPE_CHECKING, Any

from pydantic import Field

import nebula
from nebula.common import import_module
from nebula.enum import ObjectType
from nebula.helpers.scheduling import bin_refresh
from nebula.objects.base import BaseObject
from nebula.objects.utils import get_object_class_by_name
from nebula.settings import load_settings
from server.dependencies import CurrentUser
from server.models import RequestModel, ResponseModel
from server.request import APIRequest

if TYPE_CHECKING:
    from nebula.objects.base import BaseObject


class Validator:
    validators: dict[str, Any] | None = None

    @classmethod
    def for_object(cls, object_type: ObjectType) -> Any:
        if cls.validators is None:
            cls.load_validators()
        if not cls.validators:
            return None
        return cls.validators.get(object_type.name)

    @classmethod
    def load_validators(cls) -> None:
        nebula.log.trace("Loading validators")
        cls.validators = {}

        if nebula.config.plugin_dir is None:
            return

        for object_type in ObjectType:
            validator_path = os.path.join(
                nebula.config.plugin_dir,
                "validator",
                object_type.value.lower() + ".py",
            )
            if not os.path.exists(validator_path):
                continue

            validator_name = f"{object_type.value.lower()}_validator"
            validator = import_module(validator_name, validator_path)

            if not hasattr(validator, "validate"):
                nebula.log.error(f"Validator {validator_name} has no validate method")
                continue

            nebula.log.debug(f"Loaded validator {validator_name}")
            cls.validators[object_type.name] = validator.validate


#
# Models
#

# Single operation request


class OperationModel(RequestModel):
    object_type: ObjectType = Field(ObjectType.ASSET, description="Object type")
    id: int | None = Field(
        None,
        description="Object ID. Keep empty to create a new object",
        examples=[42069],
    )
    data: dict[str, Any] = Field(
        ...,
        description="Metadata to be set",
        examples=[{"title": "Star Trek", "subtitle": "The motion picture"}],
    )


class OperationResponseModel(ResponseModel):
    object_type: ObjectType = Field(ObjectType("asset"), title="Object type")
    success: bool = Field(..., title="Success")
    error: str | None = Field(None, title="Error message")
    id: int | None = Field(
        None,
        title="Object ID",
        examples=[42069],
    )


# Multiple operation request


class OperationsRequestModel(RequestModel):
    operations: list[OperationModel] = Field(
        ...,
        title="Operations",
        description="List of operations to be executed",
    )


class OperationsResponseModel(ResponseModel):
    operations: list[OperationResponseModel] = Field(..., title="Operations")
    success: bool = Field(
        ...,
        title="Success",
        description="True if all operations succeeded",
    )


#
# The actual API
#


async def can_modify_object(obj: BaseObject, user: nebula.User) -> None:
    """Check if user can modify an object.

    Raises ForbiddenException if user is not allowed to modify the object.
    """

    if user.is_admin:
        return

    if isinstance(obj, nebula.Asset):
        acl = user.get("can/asset_edit", False)
        if not acl:
            raise nebula.ForbiddenException("You are not allowed to edit assets")
        elif isinstance(acl, list) and obj["id_folder"] not in acl:
            raise nebula.ForbiddenException(
                "You are not allowed to edit assets in this folder"
            )

    elif isinstance(obj, nebula.Event):
        acl = user.get("can/scheduler_edit", False)
        if not acl:
            raise nebula.ForbiddenException("You are not allowed to edit schedule")
        elif isinstance(acl, list) and obj["id_channel"] not in acl:
            raise nebula.ForbiddenException(
                "You are not allowed to edit schedule for this channel"
            )

    elif isinstance(obj, nebula.Item):
        acl = user.get("can/rundown_edit", False)
        if not acl:
            raise nebula.ForbiddenException("You are not allowed to edit rundown")
        # TODO: Check if user can edit rundown for this channel

    elif isinstance(obj, nebula.Bin):
        raise nebula.ForbiddenException("It is not allowed to edit bins directly")


class OperationsRequest(APIRequest):
    """Create or update multiple objects in one requests."""

    name: str = "ops"
    title: str = "Save multiple objects"
    response_model = OperationsResponseModel

    async def handle(
        self,
        request: OperationsRequestModel,
        user: CurrentUser,
    ) -> OperationsResponseModel:
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
                OperationResponseModel(
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
        return OperationsResponseModel(operations=result, success=overall_success)


class SetRequest(APIRequest):
    """Create or update an object."""

    name = "set"
    title = "Save an object"
    response_model = OperationResponseModel

    async def handle(
        self,
        request: OperationModel,
        user: CurrentUser,
    ) -> OperationResponseModel:
        operation = OperationsRequest()
        result = await operation.handle(
            OperationsRequestModel(operations=[request]),
            user=user,
        )

        if not result.success:
            raise nebula.NebulaException(
                result.operations[0].error or "Unknown error",
                user_name=user.name,
            )

        return result.operations[0]

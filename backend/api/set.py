import os
from typing import Any

from pydantic import Field

import nebula
from nebula.common import import_module
from nebula.enum import ObjectType
from nebula.objects.utils import get_object_class_by_name
from nebula.settings import load_settings
from server.dependencies import CurrentUser
from server.models import RequestModel, ResponseModel
from server.request import APIRequest


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


class SetRequestModel(RequestModel):
    object_type: ObjectType = Field(ObjectType.ASSET, description="Object type")
    id: int | None = Field(
        None,
        description="Object ID. Keep empty to create a new object",
        example=42069,
    )
    data: dict[str, Any] = Field(
        ...,
        description="Metadata to be set",
        example={"title": "Star Trek", "subtitle": "The motion picture"},
    )


class SetResponseModel(ResponseModel):
    object_type: ObjectType = Field("asset", title="Object type")
    id: int | None = Field(
        None,
        title="Object ID",
        example=42069,
    )


# Multiple operation request


class OperationModel(SetRequestModel):
    pass


class OperationResponseModel(SetResponseModel):
    success: bool = Field(..., title="Success")


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


class SetRequest(APIRequest):
    name = "set"
    title = "Create or update an object"
    response_model = SetResponseModel

    async def handle(
        self,
        request: SetRequestModel,
        user: CurrentUser,
    ) -> SetResponseModel:
        """Create or update an object."""

        reload_settings = False
        pool = await nebula.db.pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                object_class = get_object_class_by_name(request.object_type)
                if request.id is None:
                    object = object_class(connection=conn)
                    object["created_by"] = user.id
                    object["updated_by"] = user.id
                    request.data.pop("id", None)
                else:
                    object = await object_class.load(request.id, connection=conn)
                    object["updated_by"] = user.id

                if (password := request.data.pop("password", None)) is not None:
                    assert isinstance(password, str)
                    assert isinstance(object, nebula.User)
                    object.set_password(password)

                if validator := Validator.for_object(request.object_type):
                    try:
                        await validator(
                            object,
                            request.data,
                            connection=conn,
                            user=user,
                        )
                    except nebula.RequestSettingsReload:
                        reload_settings = True
                else:
                    object.update(request.data)
                await object.save()

        if reload_settings:
            await load_settings()

        return SetResponseModel(
            id=object.id,
            object_type=request.object_type,
        )


class OperationsRequest(APIRequest):
    name: str = "ops"
    title: str = "Create / update multiple objects at once"
    response_model = OperationsResponseModel

    async def handle(
        self,
        request: OperationsRequestModel,
        user: CurrentUser,
    ) -> OperationsResponseModel:
        """Create or update multiple objects in one requests."""

        pool = await nebula.db.pool()
        result = []
        reload_settings = False
        for operation in request.operations:
            success = True
            op_id = operation.id
            try:
                async with pool.acquire() as conn:
                    async with conn.transaction():
                        object_class = get_object_class_by_name(operation.object_type)
                        if operation.id is None:
                            object = object_class(connection=conn, username=user.name)
                            operation.data.pop("id", None)
                            object["created_by"] = user.id
                            object["updated_by"] = user.id
                        else:
                            object = await object_class.load(
                                operation.id,
                                connection=conn,
                                username=user.name,
                            )
                            object["updated_by"] = user.id

                        if (
                            password := operation.data.pop("password", None)
                        ) is not None:
                            assert isinstance(
                                password, str
                            ), "Password must be a string"
                            assert isinstance(
                                object, nebula.User
                            ), "Object must be a user in order to set a password"
                            object.set_password(password)

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
                        op_id = object.id
            except Exception:
                nebula.log.traceback(user=user.name)
                success = False

            result.append(
                OperationResponseModel(
                    id=op_id,
                    object_type=operation.object_type,
                    success=success,
                )
            )

        if reload_settings:
            await load_settings()

        overall_success = all([x.success for x in result])
        return OperationsResponseModel(operations=result, success=overall_success)

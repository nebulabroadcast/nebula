from typing import Annotated

from fastapi import APIRouter, Query, Response

import nebula
from rest.users.common import PREFIX, UserId, resolve_fields, serialize_user
from rest.users.models import (
    ApiKeyModel,
    PasswordModel,
    UserCreateModel,
    UserModel,
    UserPatchModel,
)
from server.errors import REST_PREFIX
from server.session import Session

router = APIRouter(prefix=PREFIX)


@router.post(
    "",
    status_code=201,
    operation_id="users_create",
    summary="Create a user",
    response_model_exclude_unset=True,
)
async def create_user(payload: UserCreateModel, response: Response) -> UserModel:
    """Create a user. Set the password and API key with their actions.

    Admins only.
    """
    nebula.User.ensure_can_create()
    user = nebula.User()
    user.apply_changes(payload.to_meta_changes())
    await user.save()

    response.headers["Location"] = f"{REST_PREFIX}/users/{user.id}"
    return serialize_user(user.meta)


@router.get(
    "/{user_id}",
    operation_id="users_get",
    summary="Get a user",
    response_model_exclude_unset=True,
)
async def get_user(
    user_id: UserId,
    fields: Annotated[
        str | None, Query(description="Comma-separated fields to return")
    ] = None,
) -> UserModel:
    """Admins can get any user, users can get themselves."""
    user = await nebula.User.load(user_id)
    user.ensure_can_view()
    field_list = fields.split(",") if fields else None
    return serialize_user(user.meta, resolve_fields(field_list))


@router.patch(
    "/{user_id}",
    operation_id="users_update",
    summary="Update a user",
    response_model_exclude_unset=True,
)
async def update_user(user_id: UserId, payload: UserPatchModel) -> UserModel:
    """Change some of the user's fields. Omitted fields stay as they are,
    null removes a value.

    Users can change their own email, full name, language and editable
    user metatypes. Everything else needs an admin.
    """
    user = await nebula.User.load(user_id)
    user.apply_changes(payload.to_meta_changes())
    await user.save()
    await Session.refresh_user(user)
    return serialize_user(user.meta)


@router.post(
    "/{user_id}/password",
    status_code=204,
    operation_id="users_set_password",
    summary="Set a user's password",
)
async def set_password(user_id: UserId, payload: PasswordModel) -> None:
    """Admins can set any user's password, users can set their own."""
    user = await nebula.User.load(user_id)
    user.change_password(payload.password)
    await user.save()
    await Session.refresh_user(user)


@router.post(
    "/{user_id}/api-key",
    operation_id="users_regenerate_api_key",
    summary="Generate a new API key",
)
async def regenerate_api_key(user_id: UserId) -> ApiKeyModel:
    """Replace the user's API key with a new one. The key is returned only
    in this response; afterwards only `api_key_preview` is available.

    Admins can do this for any user, users for themselves.
    """
    user = await nebula.User.load(user_id)
    api_key = user.regenerate_api_key()
    await user.save()
    await Session.refresh_user(user)
    return ApiKeyModel(api_key=api_key)

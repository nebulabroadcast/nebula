from typing import Annotated

from fastapi import APIRouter, Query, Request, Response

import nebula
from nebula.helpers.email import send_invitation_email
from rest.users.common import PREFIX, UserId
from rest.users.fields import response_keys, user_response
from rest.users.models import (
    ApiKey,
    NewPassword,
    User,
    UserCreate,
    UserPatch,
)
from server.errors import REST_PREFIX
from server.query.params import split_list
from server.session import Session
from server.utils import server_url_from_request

router = APIRouter(prefix=PREFIX)


@router.post(
    "",
    status_code=201,
    operation_id="users_create",
    summary="Create a user",
    response_model_exclude_unset=True,
)
async def create_user(payload: UserCreate, response: Response) -> User:
    """Create a user. Set the password and API key with their actions.

    Admins only.
    """
    nebula.User.ensure_can_create()
    user = nebula.User()
    user.apply_changes(payload.to_meta_changes())
    await user.save()

    response.headers["Location"] = f"{REST_PREFIX}/users/{user.id}"
    return user_response(user)


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
) -> User:
    """Admins can get any user, users can get themselves."""
    user = await nebula.User.load(user_id)
    user.ensure_can_view()
    return user_response(user, response_keys(split_list(fields)))


@router.patch(
    "/{user_id}",
    operation_id="users_update",
    summary="Update a user",
    response_model_exclude_unset=True,
)
async def update_user(user_id: UserId, payload: UserPatch) -> User:
    """Change some of the user's fields. Omitted fields stay as they are,
    null removes a value.

    Users can change their own email, full name, language and editable
    user metatypes. Everything else needs an admin.
    """
    user = await nebula.User.load(user_id)
    user.apply_changes(payload.to_meta_changes())
    await user.save()
    await Session.refresh_user(user)
    return user_response(user)


@router.post(
    "/{user_id}/password",
    status_code=204,
    operation_id="users_set_password",
    summary="Set a user's password",
)
async def set_password(user_id: UserId, payload: NewPassword) -> None:
    """Admins can set any user's password, users can set their own."""
    user = await nebula.User.load(user_id)
    await user.change_password(payload.password)
    await user.save()
    await Session.revoke_user(user.id)


@router.post(
    "/{user_id}/api-key",
    operation_id="users_regenerate_api_key",
    summary="Generate a new API key",
)
async def regenerate_api_key(user_id: UserId) -> ApiKey:
    """Replace the user's API key with a new one. The key is returned only
    in this response; afterwards only `api_key_preview` is available.

    Admins can do this for any user, users for themselves.
    """
    user = await nebula.User.load(user_id)
    api_key = user.regenerate_api_key()
    await user.save()
    await Session.refresh_user(user)
    return ApiKey(api_key=api_key, api_key_preview=user["api_key_preview"])


@router.post(
    "/{user_id}/send-invitation",
    status_code=204,
    operation_id="users_send_invitation",
    summary="Send an invitation email",
)
async def send_invitation(user_id: UserId, request: Request) -> None:
    """Email the user a link to this server. The user needs an email address.

    Admins only. 502 when the email can't be sent.
    """
    await send_invitation_email(user_id, server_url_from_request(request))

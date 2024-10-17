from fastapi import Response

import nebula
from server.dependencies import CurrentUser
from server.request import APIRequest

from .user_model import UserModel


class SaveUserRequest(APIRequest):
    """Save user data"""

    name = "save_user"
    title = "Save user data"
    responses = [204, 201]

    async def handle(self, user: CurrentUser, payload: UserModel) -> Response:
        new_user = payload.id is None

        if not user.is_admin:
            raise nebula.ForbiddenException("You are not allowed to edit users")

        meta = payload.dict()
        meta.pop("id", None)

        password = meta.pop("password", None)
        api_key = meta.pop("api_key", None)

        for key, value in list(meta.items()):
            if key.startswith("can_"):
                meta[key.replace("can_", "can/")] = value
                del meta[key]

        if new_user:
            user = nebula.User.from_meta(meta)
        else:
            assert payload.id is not None, "This shoudn't happen"
            user = await nebula.User.load(payload.id)
            user.update(meta)

        if password:
            user.set_password(password)

        if api_key:
            user.set_api_key(api_key)

        await user.save()

        if new_user:
            return Response(status_code=201)
        else:
            return Response(status_code=204)

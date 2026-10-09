import nebula
from server import APIRequest, UserModel
from server.dependencies import CurrentUser
from server.session import Session


class SaveUser(APIRequest):
    """Save user data

    Deprecated: use `POST /api/v2/users` and `PATCH /api/v2/users/{user_id}`.
    """

    name = "save-user"
    deprecated = True
    title = "Save user"
    category = "User management"

    async def handle(self, current_user: CurrentUser, payload: UserModel) -> None:
        new_user = payload.id is None

        if not current_user.is_admin:
            raise nebula.ForbiddenException("You are not allowed to edit users")

        meta = payload.model_dump()
        meta.pop("id", None)

        password = meta.pop("password", None)
        api_key = meta.pop("api_key", None)
        permissions = meta.pop("permissions", {})

        if new_user:
            user = nebula.User.from_meta(meta)
        else:
            assert payload.id is not None, "This shoudn't happen"
            user = await nebula.User.load(payload.id)
            user.update(meta)
        user.set_permissions(permissions)

        if password:
            user.set_password(password)

        if api_key:
            user.set_api_key(api_key)

        await user.save()

        await Session.refresh_user(user)

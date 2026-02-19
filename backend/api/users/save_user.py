import nebula
from server import APIRequest, UserModel
from server.dependencies import CurrentUser
from server.session import Session


class SaveUser(APIRequest):
    """Save user data"""

    name = "save-user"
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

        for key, value in permissions.items():
            meta[f"can/{key}"] = value

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

        async for session in Session.list(user_name=user.name):
            await Session.update(session.token, user)

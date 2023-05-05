import nebula

from fastapi import Query
from server.session import SessionModel, Session
from server.dependencies import CurrentUser
from server.request import APIRequest


class Sessions(APIRequest):
    name = "sessions"
    title = "List sessions"
    response_model = list[SessionModel]

    async def handle(
        self,
        user: CurrentUser,
        id_user: int | None = Query(None)
    ) -> list[SessionModel]:
        """Create or update an object."""

        if id_user != user.id and (not user.is_admin):
            raise nebula.ForbiddenException()

        result = []
        async for session in Session.list():

            if (id_user is not None) and (id_user != session.user["id"]):
                continue

            if (not user.is_admin) and (id_user != session.user["id"]):
                continue

            result.append(session)

        return result

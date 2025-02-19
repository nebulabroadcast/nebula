from fastapi import Query

import nebula
from server.dependencies import CurrentUser
from server.models import RequestModel
from server.request import APIRequest
from server.session import Session, SessionModel


class ListSessionsRequestModel(RequestModel):
    id_user: int = Query(..., examples=[1])


class ListSessionsRequest(APIRequest):
    """List user sessions."""

    name = "list-sessions"
    title = "List sessions"

    async def handle(
        self,
        request: ListSessionsRequestModel,
        user: CurrentUser,
    ) -> list[SessionModel]:
        id_user = request.id_user

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

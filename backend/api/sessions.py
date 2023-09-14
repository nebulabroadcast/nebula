from fastapi import Query, Response

import nebula
from server.dependencies import CurrentUser
from server.models import RequestModel
from server.request import APIRequest
from server.session import Session, SessionModel


class SessionsRequest(RequestModel):
    id_user: int = Query(..., example=1)


class Sessions(APIRequest):
    name = "sessions"
    title = "List sessions"
    response_model = list[SessionModel]

    async def handle(
        self,
        request: SessionsRequest,
        user: CurrentUser,
    ) -> list[SessionModel]:
        """Create or update an object."""

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


class InvalidateSessionRequest(RequestModel):
    token: str = Query(...)


class InvalidateSession(APIRequest):
    name = "invalidate_session"
    title = "Invalidate session"
    responses = [204, 201]

    async def handle(
        self,
        payload: InvalidateSessionRequest,
        user: CurrentUser,
    ) -> None:
        """Create or update an object."""

        session = await Session.check(payload.token)
        if session is None:
            raise nebula.NotFoundException("Session not found")

        if (not user.is_admin) and (session.user["login"] != user["login"]):
            raise nebula.ForbiddenException(
                "You are not allowed to invalidate this session"
            )

        await Session.delete(payload.token)

        return Response(status_code=204)

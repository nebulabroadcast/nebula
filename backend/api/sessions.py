from fastapi import Query, Response

import nebula
from server.dependencies import CurrentUser
from server.models import RequestModel
from server.request import APIRequest
from server.session import Session, SessionModel


class SessionsRequest(RequestModel):
    id_user: int = Query(..., examples=[1])


class Sessions(APIRequest):
    """List user sessions."""

    name = "sessions"
    title = "List sessions"

    async def handle(
        self,
        request: SessionsRequest,
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


class InvalidateSessionRequest(RequestModel):
    token: str = Query(...)


class InvalidateSession(APIRequest):
    """Invalidate a user session.

    This endpoint is used to invalidate an user session. It can be used
    to remotely log out a user. If the user is an admin, it can also be
    used to log out other users.
    """

    name = "invalidate_session"
    title = "Invalidate session"
    responses = [204]

    async def handle(
        self,
        payload: InvalidateSessionRequest,
        user: CurrentUser,
    ) -> Response:
        session = await Session.check(payload.token)
        if session is None:
            raise nebula.NotFoundException("Session not found")

        if (not user.is_admin) and (session.user["login"] != user["login"]):
            raise nebula.ForbiddenException(
                "You are not allowed to invalidate this session"
            )

        await Session.delete(payload.token)

        return Response(status_code=204)

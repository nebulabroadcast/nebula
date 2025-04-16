from fastapi import Query, Response

import nebula
from server.dependencies import CurrentUser
from server.models import RequestModel
from server.request import APIRequest
from server.session import Session


class InvalidateSessionRequestModel(RequestModel):
    token: str = Query(...)


class InvalidateSessionRequest(APIRequest):
    """Invalidate a user session.

    This endpoint is used to invalidate an user session. It can be used
    to remotely log out a user. If the user is an admin, it can also be
    used to log out other users.
    """

    name = "invalidate-session"
    title = "Invalidate session"
    responses = [204]

    async def handle(
        self,
        payload: InvalidateSessionRequestModel,
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

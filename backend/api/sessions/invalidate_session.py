from pydantic import Field

import nebula
from server import APIModel, APIRequest
from server.dependencies import CurrentUser
from server.session import Session


class InvalidateSessionRequest(APIModel):
    token: str = Field(
        ..., description="Session token, or the session ID from list-sessions"
    )


class InvalidateSession(APIRequest):
    """Invalidate a user session.

    This endpoint is used to invalidate an user session. It can be used
    to remotely log out a user. If the user is an admin, it can also be
    used to log out other users.
    """

    name = "invalidate-session"
    title = "Invalidate session"
    category = "Authentication"

    async def handle(
        self,
        payload: InvalidateSessionRequest,
        user: CurrentUser,
    ) -> None:
        async for session in Session.list():
            if payload.token in (session.token, Session.id_of(session.token)):
                break
        else:
            raise nebula.NotFoundException("Session not found")

        if (not user.is_admin) and (session.user["login"] != user["login"]):
            raise nebula.ForbiddenException(
                "You are not allowed to invalidate this session"
            )

        await Session.delete(session.token)

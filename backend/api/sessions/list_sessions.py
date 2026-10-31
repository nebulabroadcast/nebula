from fastapi import Request
from pydantic import Field

import nebula
from server import APIModel, APIRequest
from server.dependencies import CurrentUser
from server.session import Session, SessionInfo


class ListSessionsRequest(APIModel):
    id_user: int


class SessionListItem(SessionInfo):
    id: str = Field(..., description="Session ID (SHA-256 of its token)")
    current: bool = Field(
        False, description="The session the request was authenticated with"
    )


class ListSessions(APIRequest):
    """List user sessions."""

    name = "list-sessions"
    title = "List sessions"
    category = "Authentication"

    async def handle(
        self,
        request: ListSessionsRequest,
        user: CurrentUser,
        http_request: Request,
    ) -> list[SessionListItem]:
        id_user = request.id_user
        current_token = getattr(http_request.state, "session_token", None)

        if id_user != user.id and (not user.is_admin):
            raise nebula.ForbiddenException

        result = []
        async for session in Session.list():
            if (id_user is not None) and (id_user != session.user["id"]):
                continue

            if (not user.is_admin) and (id_user != session.user["id"]):
                continue

            result.append(
                SessionListItem(
                    **session.model_dump(exclude={"token"}),
                    id=Session.id_of(session.token),
                    current=session.token == current_token,
                )
            )

        return result

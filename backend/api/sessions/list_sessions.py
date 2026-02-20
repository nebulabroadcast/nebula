import nebula
from server import APIModel, APIRequest
from server.dependencies import CurrentUser
from server.session import Session, SessionModel


class ListSessionsRequest(APIModel):
    id_user: int


class ListSessions(APIRequest):
    """List user sessions."""

    name = "list-sessions"
    title = "List sessions"
    category = "Authentication"

    async def handle(
        self,
        request: ListSessionsRequest,
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

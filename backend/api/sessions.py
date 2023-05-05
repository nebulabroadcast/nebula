from server.session import SessionModel, Session
from server.dependencies import CurrentUser
from server.request import APIRequest


class Sessions(APIRequest):
    name = "sessions"
    title = "List sessions"
    response_model = list[SessionModel]

    async def handle(
        self,
        user: CurrentUser
    ) -> list[SessionModel]:
        """Create or update an object."""

        result = []
        async for session in Session.list():
            if session.user["id"] != CurrentUser.id:
                continue

            result.append(session)

        return result

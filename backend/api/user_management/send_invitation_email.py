from typing import Annotated

from fastapi import Request
from pydantic import Field

from nebula.helpers.email import send_invitation_email
from server import APIModel, APIRequest
from server.utils import server_url_from_request


class SendInvitationEmailRequest(APIModel):
    """Request model for sending an invitation email to a user."""

    id: Annotated[int, Field(title="User ID", gt=0)]


class SendInvitationEmail(APIRequest):
    """Handle sending an invitation email to the specified user.

    Deprecated: use `POST /api/v2/users/{user_id}/send-invitation`.
    """

    name = "send-invitation-email"
    title = "Send Invitation Email"
    category = "User management"
    deprecated = True

    async def handle(
        self,
        request: Request,
        payload: SendInvitationEmailRequest,
    ) -> None:
        await send_invitation_email(payload.id, server_url_from_request(request))

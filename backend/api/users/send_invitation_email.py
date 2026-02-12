from typing import Annotated
from fastapi import Request
from pydantic import Field

import nebula
from nebula.helpers.email import render_email_template, send_mail
from nebula.objects.user import User
from server.dependencies import CurrentUser
from server.models import RequestModel
from server.request import APIRequest
from server.utils import server_url_from_request


class SendInvitationEmailRequestModel(RequestModel):
    """Response model for listing users"""

    id: Annotated[int, Field(title="User ID", gt=0)]


class SendInvitationRequest(APIRequest):
    """Get a list of users"""

    name = "send-invitation-email"
    title = "Send Invitation Email"

    async def handle(
        self, 
        user: CurrentUser, 
        request: Request, 
        payload: SendInvitationEmailRequestModel
    ) -> None:
        if not user.is_admin:
            raise nebula.ForbiddenException("Only admins can send invitation emails")

        user = await User.load(payload.id)
        if not user.get("email"):
            raise nebula.BadRequestException("User does not have an email address")

        server_url = server_url_from_request(request)

        site_name = nebula.config.site_name
        email_subject = f"Invitation to {nebula.config.site_name.upper()}"
        email_body = await render_email_template(
            "user-invite",
            email=user["email"],
            login_name=user.name,
            full_name=user.display_name,
            site_name=site_name,
            url=server_url,

        )

        await send_mail(user["email"], email_subject, email_body)


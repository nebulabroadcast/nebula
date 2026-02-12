import asyncio
from typing import Annotated

from fastapi import Request
from pydantic import Field

import nebula
from nebula.helpers.email import render_email_template, send_mail
from nebula.helpers.tokens import TokenManager
from server.models import RequestModel
from server.request import APIRequest
from server.utils import get_real_ip, server_url_from_request


class PasswordResetRequestModel(RequestModel):
    email: Annotated[
        str,
        Field(
            title="Email",
            description=(
                "The email address associated with "
                "the account to reset the password for"
            ),
            pattern=r"^[\w\.-]+@[\w\.-]+\.\w{2,}$",
        ),
    ]


class PasswordResetCallbackModel(RequestModel):
    token: Annotated[
        str,
        Field(
            title="Password reset token",
            description=(
                "The token from the password reset email. "
                "This token is used to verify the password "
            ),
        ),
    ]

    password: Annotated[
        str,
        Field(
            title="New password",
            description="The new password to set for the account.",
            min_length=8,
        ),
    ]


class PasswordResetRequest(APIRequest):
    """Request a password reset for the given email"""

    name = "password-reset"
    title = "Password reset request"

    async def handle(
        self,
        payload: PasswordResetRequestModel,
        request: Request,
    ) -> None:
        # Don't await this, we don't want to make the user wait for the email to be sent
        # and we don't care about the result of this operation
        # This also prevents timing attacks that could reveal
        # whether the email exists or not,
        asyncio.create_task(self.request_password_reset(payload.email, request))

    async def request_password_reset(self, email: str, request: Request) -> None:
        nebula.log.info(f"Password reset requested for email: {email}")
        try:
            query = """
                SELECT meta FROM users
                WHERE meta->>'email' ILIKE $1
                OR login ILIKE $1
            """
            res = await nebula.db.fetchrow(query, email)
            if res is None:
                # Don't reveal whether the email exists or not
                nebula.log.warning(
                    f"Password reset requested for non-existent email: {email}"
                )
                return
            user = nebula.User.from_row(res)

            ip_address = get_real_ip(request)
            server_url = server_url_from_request(request)

            token = await TokenManager.create(
                "password-reset",
                data={
                    "user_id": user.id,
                    "ip": ip_address,
                },
                ttl=1800,
                blocking_id=ip_address,
            )

            reset_link = f"{server_url}?rp={token.token}"

            email_body = await render_email_template(
                "password-reset",
                email=email,
                full_name=user.display_name,
                reset_link=reset_link,
            )
        except Exception as e:
            nebula.log.error(f"Error requesting password reset for {email}: {e}")
            return

        nebula.log.trace(f"Sending password reset email to {email}")
        await send_mail(email, "Nebula Password Reset Request", email_body)


class PasswordResetCallbackRequest(APIRequest):
    """Reset the password using the token from the password reset email"""

    name = "password-reset-callback"
    title = "Password reset callback"

    async def handle(
        self,
        payload: PasswordResetCallbackModel,
        request: Request,
    ) -> None:
        try:
            token_data = await TokenManager.verify(payload.token)
        except KeyError as e:
            nebula.log.warning(f"Invalid password reset token used: {e}")
            raise nebula.BadRequestException(
                "Invalid or expired password reset token"
            ) from e

        ip_address = get_real_ip(request)

        if token_data.data.get("ip") != ip_address:
            nebula.log.warning("Password reset attempt from invalid IP address")
            raise nebula.BadRequestException("Invalid password reset token")

        user_id = token_data.data.get("user_id")
        if user_id is None:
            nebula.log.error("Password reset token is missing user_id")
            raise nebula.BadRequestException("Invalid password reset token")

        user = await nebula.User.load(user_id)
        if user is None:
            nebula.log.error(
                f"User with ID {user_id} from password reset token not found"
            )
            raise nebula.BadRequestException("Invalid password reset token")

        user.set_password(payload.password)
        await user.save()

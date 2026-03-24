from typing import Annotated

from pydantic import Field

from server.models import APIModel


class LoginRequest(APIModel):
    username: Annotated[
        str,
        Field(
            title="Username",
            examples=["admin"],
            pattern=r"^[a-zA-Z0-9_\-\.]{2,}$",
        ),
    ]
    password: Annotated[
        str,
        Field(
            title="Password",
            description="Password in plain text",
            examples=["Password.123"],
        ),
    ]


class LoginResponse(APIModel):
    access_token: Annotated[
        str,
        Field(
            title="Access token",
            description="Access token to be used in Authorization header"
            "for the subsequent requests",
        ),
    ]


class TokenExchangeRequest(APIModel):
    access_token: Annotated[
        str,
        Field(
            title="Access token",
            description="Access token to be exchanged for a new one",
        ),
    ]

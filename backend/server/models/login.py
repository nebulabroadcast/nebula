from pydantic import Field

from server.models import RequestModel, ResponseModel


class LoginRequestModel(RequestModel):
    username: str = Field(
        ...,
        title="Username",
        examples=["admin"],
        pattern=r"^[a-zA-Z0-9_\-\.]{2,}$",
    )
    password: str = Field(
        ...,
        title="Password",
        description="Password in plain text",
        examples=["Password.123"],
    )


class LoginResponseModel(ResponseModel):
    access_token: str = Field(
        ...,
        title="Access token",
        description="Access token to be used in Authorization header"
        "for the subsequent requests",
    )


class TokenExchangeRequestModel(RequestModel):
    access_token: str = Field(
        ...,
        title="Access token",
        description="Access token to be exchanged for a new one",
    )

import time

from fastapi import Request
from pydantic import Field

import nebula
from server.clientinfo import get_real_ip
from server.models import RequestModel, ResponseModel
from server.request import APIRequest
from server.session import Session


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


async def check_failed_login(ip_address: str) -> None:
    banned_until = await nebula.redis.get("banned-ip-until", ip_address)
    if banned_until is None:
        return

    if float(banned_until) > time.time():
        nebula.log.warn(
            f"Attempt to login from banned IP {ip_address}. "
            f"Retry in {float(banned_until) - time.time():.2f} seconds."
        )
        await nebula.redis.delete("login-failed-ip", ip_address)
        raise nebula.LoginFailedException("Too many failed login attempts")


async def set_failed_login(ip_address: str) -> None:
    ns = "login-failed-ip"
    failed_attempts_str = await nebula.redis.incr(ns, ip_address)
    failed_attempts = int(failed_attempts_str) if failed_attempts_str else 0

    await nebula.redis.expire(
        ns, ip_address, 600
    )  # this is just for the clean-up, it cannot be used to reset the counter

    if failed_attempts > nebula.config.max_failed_login_attempts:
        ban_time = nebula.config.failed_login_ban_time or 0
        await nebula.redis.set(
            "banned-ip-until",
            ip_address,
            str(time.time() + ban_time),
        )


async def clear_failed_login(ip_address: str) -> None:
    await nebula.redis.delete("login-failed-ip", ip_address)


class LoginRequest(APIRequest):
    """Login using a username and password

    This request will return an access token that can be used in the
    Authorization header for the subsequent requests.
    If the login fails, request will return 401 Unauthorized.

    If the login fails too many (configurable) times,
    the IP address will be banned for a certain amount of time (configurable).
    """

    name: str = "login"
    response_model = LoginResponseModel

    async def handle(
        self,
        request: Request,
        payload: LoginRequestModel,
    ) -> LoginResponseModel:
        if request is not None:
            await check_failed_login(get_real_ip(request))

        try:
            user = await nebula.User.login(payload.username, payload.password)
        except nebula.LoginFailedException as e:
            if request is not None:
                await set_failed_login(get_real_ip(request))
            # re-raise the exception
            raise e

        if request is not None:
            await clear_failed_login(get_real_ip(request))

        session = await Session.create(user, request)
        return LoginResponseModel(access_token=session.token)

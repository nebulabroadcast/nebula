"""Failed attempts to prove a password, counted per IP address.

A login with a wrong password counts, and so does a wrong current password
when users change their own. Too many ban the address for a while
(config `max_failed_login_attempts`, `failed_login_ban_time`).
"""

import time

import nebula


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

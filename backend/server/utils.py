import contextlib
import ipaddress
from urllib.parse import urlparse

from fastapi import Request


def parse_access_token(authorization: str) -> str | None:
    """Parse an authorization header value.

    Get a TOKEN from "Bearer TOKEN" and return a token
    string or None if the input value does not match
    the expected format (64 bytes string)
    """
    if (not authorization) or not isinstance(authorization, str):
        return None
    try:
        ttype, token = authorization.split()
    except ValueError:
        return None
    if ttype.lower() != "bearer":
        return None
    if len(token) != 64:
        return None
    return token


def is_internal_ip(ip: str) -> bool:
    """Return true if the given IP address is private"""
    with contextlib.suppress(ValueError):
        if ipaddress.IPv4Address(ip).is_private:
            return True

    with contextlib.suppress(ValueError):
        if ipaddress.IPv6Address(ip).is_private:
            return True
    return False


def get_real_ip(request: Request) -> str:
    if request.client is None:
        return "127.0.0.1"
    xff = request.headers.get("x-forwarded-for", request.client.host)
    return xff.split(",")[0].strip()


def server_url_from_request(request: Request) -> str:
    """Constructs the server URL from the request object."""
    if referer := request.headers.get("referer"):
        parsed_url = urlparse(referer)
        return f"{parsed_url.scheme}://{parsed_url.netloc}"

    if request.client:
        scheme = request.headers.get("X-Forwarded-Proto", request.url.scheme)
        host = request.headers.get("X-Forwarded-Host", request.client.host)
        # Prefer an explicitly forwarded port, otherwise fall back to the request URL port.
        forwarded_port = request.headers.get("X-Forwarded-Port")
        url_port = request.url.port
        port = forwarded_port or (str(url_port) if url_port is not None else None)

        # For standard ports (80, 443) or when port is not specified, omit the port.
        if port is None or port in ("80", "443"):
            return f"{scheme}://{host}"

        # For non-standard ports, include the port in the URL.
        return f"{scheme}://{host}:{port}"

    return "http://localhost:5000"

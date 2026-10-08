__all__ = [
    "RequestContext",
    "current_initiator",
    "current_user",
    "get_request_context",
    "is_system",
    "request_context",
    "set_default_system",
    "system_context",
]

import contextlib
import dataclasses
from collections.abc import Iterator
from contextvars import ContextVar
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from nebula.objects.user import User


@dataclass
class RequestContext:
    """Who/what is behind the code currently executing.

    Set by the server for the duration of a request (see
    server.middleware.context.RequestContextMiddleware) or manually by
    CLI tools and background jobs, which have no request to attach to.

    `system` marks trusted code (CLI tools, services, server background
    jobs) that skips access control. A context created for a request must
    leave it False.
    """

    user: "User | None" = None
    initiator: str | None = None
    system: bool = False


_request_context: ContextVar["RequestContext | None"] = ContextVar(
    "_request_context", default=None
)

# Whether code running with no context set is trusted. True for CLI tools
# and services; the server process turns it off at startup, so anything
# reaching the server without a context (e.g. a websocket) is untrusted.
_default_system = True


def set_default_system(value: bool) -> None:
    """Set whether code running without a context is trusted (process-wide)."""
    global _default_system  # noqa: PLW0603
    _default_system = value


def get_request_context() -> RequestContext:
    """Return the current RequestContext, or an empty one if none is set."""
    return _request_context.get() or RequestContext(system=_default_system)


def is_system() -> bool:
    """Return True if the code currently executing is trusted (skips ACL)."""
    return get_request_context().system


def current_user() -> "User | None":
    """Return the user behind the code currently executing, if any."""
    return get_request_context().user


def current_initiator() -> str | None:
    """Return the client ID of whoever/whatever triggered the current code."""
    return get_request_context().initiator


@contextlib.contextmanager
def request_context(context: RequestContext) -> Iterator[None]:
    """Set the RequestContext for the duration of the `with` block."""
    token = _request_context.set(context)
    try:
        yield
    finally:
        _request_context.reset(token)


@contextlib.contextmanager
def system_context() -> Iterator[None]:
    """Run the `with` block as trusted code, keeping user and initiator."""
    context = dataclasses.replace(get_request_context(), system=True)
    with request_context(context):
        yield

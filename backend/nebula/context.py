__all__ = [
    "RequestContext",
    "current_initiator",
    "current_user",
    "get_request_context",
    "request_context",
]

import contextlib
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
    """

    user: "User | None" = None
    initiator: str | None = None


_request_context: ContextVar["RequestContext | None"] = ContextVar(
    "_request_context", default=None
)


def get_request_context() -> RequestContext:
    """Return the current RequestContext, or an empty one if none is set."""
    return _request_context.get() or RequestContext()


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

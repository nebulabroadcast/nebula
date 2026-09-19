from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

import nebula
from nebula.context import RequestContext, request_context
from server.session import Session
from server.utils import parse_access_token


def _access_token_from_request(request: Request) -> str | None:
    if token := request.query_params.get("token"):
        return token
    if authorization := request.headers.get("Authorization"):
        return parse_access_token(authorization)
    return None


def _api_key_from_request(request: Request) -> str | None:
    return request.headers.get("x-api-key") or request.query_params.get("api_key")


async def _resolve_user(request: Request) -> nebula.User:
    """Resolve the user for the given request, or raise UnauthorizedException."""
    access_token = _access_token_from_request(request)
    api_key = _api_key_from_request(request)

    if access_token is None:
        if api_key is None:
            raise nebula.UnauthorizedException("No access token provided")
        try:
            return await nebula.User.by_api_key(api_key)
        except nebula.NotFoundException as e:
            raise nebula.UnauthorizedException("Invalid API key") from e

    session = await Session.check(access_token, request)
    if session is None:
        raise nebula.UnauthorizedException("Invalid access token")
    return nebula.User(meta=session.user)


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Resolve the current user and initiator once per request.

    Makes them available both as `request.state.user` (checked by the
    `CurrentUser`/`CurrentUserOptional` dependencies) and ambiently via
    `nebula.context` (for code with no access to the request object, such
    as object methods, helpers and background jobs), and tags every log
    line emitted during the request with the current user.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        try:
            user = await _resolve_user(request)
            request.state.user = user
            request.state.unauthorized_reason = None
        except nebula.UnauthorizedException as e:
            user = None
            request.state.user = None
            request.state.unauthorized_reason = str(e)

        initiator = request.headers.get("x-client-id")
        context = RequestContext(user=user, initiator=initiator)

        with (
            request_context(context),
            nebula.log.contextualize(user=user.name if user else None),
        ):
            return await call_next(request)

import time

from shortuuid import ShortUUID
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

import nebula
from server.session import Session
from server.utils import parse_access_token

# SESSION_TTL = 3600
# SESSION_REFRESH_THRESHOLD = 300


async def authenticate_token(request: Request) -> nebula.User:
    token1 = request.query_params.get("token", None)
    token2 = request.headers.get("Authorization", None)
    session_id = token1 or parse_access_token(token2 or "")
    if not session_id:
        raise nebula.UnauthorizedException("No access token provided")
    session = await Session.check(session_id, request)
    if session is None:
        raise nebula.UnauthorizedException("Invalid access token")
    return nebula.User(meta=session.user)


async def authenticate_api_key(request: Request) -> nebula.User:
    key1 = request.headers.get("x-api-key")
    key2  = request.query_params.get("api_key")
    if (api_key := key1 or key2) is None:
        raise nebula.UnauthorizedException("No API key provided")
    try:
        return await nebula.User.by_api_key(api_key)
    except nebula.NotFoundException as e:
        raise nebula.UnauthorizedException("Invalid API key") from e


async def authenticate_session(request: Request) -> nebula.User:
    if session_id := request.cookies.get("session_id"):
        session = await Session.check(session_id, request)
        if session is not None:
            return nebula.User(meta=session.user)
    raise nebula.UnauthorizedException("No session ID provided")

    # if session_id:
    #     key = f"session:{session_id}"
    #     session_raw = await redis.get(key)
    #     if session_raw:
    #         try:
    #             session = json.loads(session_raw)
    #             user_id = session.get("user_id")
    #             persistent = session.get("persistent", False)
    #             ttl = await redis.ttl(key)
    #
    #             # Optional: verify IP / UA here if you want
    #
    #             # Refresh if TTL low
    #             if ttl is not None and ttl < SESSION_REFRESH_THRESHOLD:
    #                 new_ttl = 30*24*3600 if persistent else SESSION_TTL
    #                 await redis.expire(key, new_ttl)
    #                 request.state.refresh_cookie = (session_id, new_ttl)
    #         except Exception as e:
    #             # log error if needed
    #             pass
    #
    # request.state.user_id = user_id


async def authenticate(request: Request) -> nebula.User:
    for auth_method in [authenticate_token, authenticate_session, authenticate_api_key]:
        try:
            user = await auth_method(request)
        except nebula.UnauthorizedException:
            continue
        return user
    raise nebula.UnauthorizedException("No authentication method provided")


def req_id() -> str:
    return ShortUUID().random(length=16)


class GatekeeperMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = req_id()
        context = {"request_id": request_id}
        path = request.url.path

        with nebula.log.contextualize(**context):
            try:
                user = await authenticate(request)
                context["user"] = user.name
                request.state.user = user
                request.state.unauthorized_reason = None
            except nebula.UnauthorizedException as e:
                request.state.user = None
                request.state.unauthorized_reason = str(e)

        with nebula.log.contextualize(**context):
            start_time = time.perf_counter()
            response = await call_next(request)
            process_time = round(time.perf_counter() - start_time, 3)
            status_code = response.status_code

            if getattr(request.state, "refresh_cookie", None):
                nebula.log.trace("Refreshing session cookie")
                sid, max_age = request.state.refresh_cookie
                response.set_cookie(
                    key="session_id",
                    value=sid,
                    max_age=max_age,
                    httponly=True,
                    secure=True,
                    samesite="lax",
                )

            f_result = f"| {status_code} in {process_time}s"
            nebula.log.trace(f"[{request.method}] {path} {f_result}")

        return response


import traceback

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR

import nebula
from nebula.exceptions import NebulaException


class Bubblewrap(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)

        except NebulaException as exc:
            nebula.log.warning(f"[Bubblewrap] NebulaException: {exc.status} - {exc.detail}")
            return JSONResponse(
                {"status": exc.status, "detail": exc.detail}, status_code=exc.status
            )

        except ExceptionGroup as eg:
            messages = []
            for e in eg.exceptions:
                if isinstance(e, BaseException):
                    tb = "".join(
                        traceback.format_exception(type(e), e, e.__traceback__)
                    )
                    nebula.log.error(
                        f"[Bubblewrap] ExceptionGroup member: {e.__class__.__name__} - {e}\n{tb}"
                    )
                    messages.append(f"{e.__class__.__name__}: {str(e)}")
                else:
                    messages.append(f"Non-standard exception: {repr(e)}")

            return JSONResponse(
                {
                    "status": HTTP_500_INTERNAL_SERVER_ERROR,
                    "detail": f"ExceptionGroup: {len(eg.exceptions)} exceptions",
                    "traceback": messages,
                },
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            )

        except Exception as e:
            tb = "".join(traceback.format_exception(type(e), e, e.__traceback__))
            nebula.log.error(
                f"[Bubblewrap] Uncaught Exception: {e.__class__.__name__} - {e}\n{tb}"
            )
            return JSONResponse(
                {
                    "status": HTTP_500_INTERNAL_SERVER_ERROR,
                    "detail": str(e),
                    "traceback": tb,
                },
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            )

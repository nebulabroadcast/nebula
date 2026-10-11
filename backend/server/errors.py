"""Error responses.

REST responses (under REST_PREFIX) are RFC 9457 problem details. The RPC
API keeps its own error body for now. `error_response` picks the format.
"""

from collections.abc import Mapping
from http import HTTPStatus
from typing import Any

import anyio
from fastapi import FastAPI, Request
from fastapi.exception_handlers import (
    http_exception_handler,
    request_validation_exception_handler,
)
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import Response

import nebula
from nebula.exceptions import NebulaException

REST_PREFIX = "/api/v2"


def is_rest_request(request: Request) -> bool:
    path = request.url.path
    return path == REST_PREFIX or path.startswith(f"{REST_PREFIX}/")


def error_response(
    request: Request,
    status: int,
    detail: str,
    extra: Mapping[str, Any] | None = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    """problem+json for the REST API, the RPC error body for everything else."""
    if not is_rest_request(request):
        content = {
            "code": status,
            "detail": detail,
            "path": request.url.path,
            "method": request.method,
            **(extra or {}),
        }
        return JSONResponse(status_code=status, content=content, headers=headers)

    try:
        title = HTTPStatus(status).phrase
    except ValueError:
        title = "Error"
    content = {
        **(extra or {}),
        "type": "about:blank",
        "title": title,
        "status": status,
        "detail": detail,
        "instance": request.url.path,
    }
    return JSONResponse(
        status_code=status,
        content=content,
        media_type="application/problem+json",
        headers=headers,
    )


async def not_found_handler(request: Request, exc: Exception) -> Response:
    if is_rest_request(request):
        detail = getattr(exc, "detail", None)
        if not isinstance(detail, str) or detail == "Not Found":
            detail = "Resource not found"
        return error_response(request, 404, detail)
    if request.url.path.startswith("/api"):
        return error_response(request, 404, "Resource not found")

    # Anything else is a frontend route
    index_path = anyio.Path(nebula.config.frontend_dir, "index.html")
    if await index_path.exists():
        return FileResponse(index_path, status_code=200, media_type="text/html")
    return JSONResponse(status_code=404, content={"detail": "Resource not found"})


async def nebula_exception_handler(
    request: Request, exc: NebulaException
) -> JSONResponse:
    # Logging is up to the exception class
    return error_response(request, exc.status, exc.detail, exc.kwargs)


# The RPC API has always returned the error message; REST doesn't leak it


async def assertion_error_handler(
    request: Request, exc: AssertionError
) -> JSONResponse:
    nebula.log.error(f"AssertionError: {exc}")
    detail = "Internal server error" if is_rest_request(request) else str(exc)
    return error_response(request, 500, detail)


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    endpoint = request.url.path.split("/")[-1]
    message = f"[Unhandled exception] {endpoint}: {exc}"
    nebula.log.error(message)
    detail = "Internal server error" if is_rest_request(request) else message
    return error_response(request, 500, detail)


async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> Response:
    if not is_rest_request(request):
        return await request_validation_exception_handler(request, exc)
    errors = [{"loc": list(e["loc"]), "msg": e["msg"]} for e in exc.errors()]
    if len(errors) == 1:
        detail = errors[0]["msg"]
    else:
        detail = f"Request validation failed ({len(errors)} errors)"
    return error_response(request, 422, detail, {"errors": errors})


async def http_error_handler(request: Request, exc: StarletteHTTPException) -> Response:
    if not is_rest_request(request):
        return await http_exception_handler(request, exc)
    return error_response(
        request, exc.status_code, str(exc.detail), headers=exc.headers
    )


def install_error_handlers(app: FastAPI) -> None:
    """Register exception handlers for both the RPC and the REST API."""
    app.add_exception_handler(404, not_found_handler)
    app.add_exception_handler(NebulaException, nebula_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(AssertionError, assertion_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, http_error_handler)  # type: ignore[arg-type]

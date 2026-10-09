"""RFC 9457 problem details for the REST API.

REST responses (under REST_PREFIX) use problem+json. The RPC API keeps its
own error body for now; the handlers registered by `install_error_handlers`
pick the format with `is_rest_request`.
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


def problem_response(
    request: Request,
    status: int,
    detail: str,
    *,
    extensions: dict[str, Any] | None = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    try:
        title = HTTPStatus(status).phrase
    except ValueError:
        title = "Error"

    content: dict[str, Any] = {
        **(extensions or {}),
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


def validation_problem(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = [
        {"loc": list(error["loc"]), "msg": error["msg"]} for error in exc.errors()
    ]
    if len(errors) == 1:
        detail = errors[0]["msg"]
    else:
        detail = f"Request validation failed ({len(errors)} errors)"
    return problem_response(request, 422, detail, extensions={"errors": errors})


async def custom_404_handler(
    request: Request, exc: Exception
) -> FileResponse | JSONResponse:
    if is_rest_request(request):
        detail = getattr(exc, "detail", None)
        if not isinstance(detail, str) or detail == "Not Found":
            detail = "Resource not found"
        return problem_response(request, 404, detail)

    if request.url.path.startswith("/api"):
        return JSONResponse(
            status_code=404,
            content={
                "code": 404,
                "detail": "Resource not found",
                "path": request.url.path,
                "method": request.method,
            },
        )

    index_path = anyio.Path(nebula.config.frontend_dir, "index.html")
    if await index_path.exists():
        return FileResponse(
            index_path,
            status_code=200,
            media_type="text/html",
        )

    return JSONResponse(status_code=404, content={"detail": "Resource not found"})


async def nebula_exception_handler(
    request: Request,
    exc: NebulaException,
) -> JSONResponse:
    # endpoint = request.url.path.split("/")[-1]
    # We do not need to log this (It is up to NebulaException class)
    # nebula.log.error(f"{endpoint}: {exc}")  # TODO: user?
    if is_rest_request(request):
        return problem_response(request, exc.status, exc.detail, extensions=exc.kwargs)
    return JSONResponse(
        status_code=exc.status,
        content={
            "code": exc.status,
            "detail": exc.detail,
            "path": request.url.path,
            "method": request.method,
            **exc.kwargs,
        },
    )


async def assertion_error_handler(
    request: Request, exc: AssertionError
) -> JSONResponse:
    nebula.log.error(f"AssertionError: {exc}")
    if is_rest_request(request):
        return problem_response(request, 500, "Internal server error")
    return JSONResponse(
        status_code=500,
        content={
            "code": 500,
            "detail": str(exc),
            "path": request.url.path,
            "method": request.method,
        },
    )


async def catchall_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    endpoint = request.url.path.split("/")[-1]
    message = f"[Unhandled exception] {endpoint}: {exc}"
    nebula.log.error(message)
    if is_rest_request(request):
        return problem_response(request, 500, "Internal server error")
    return JSONResponse(
        status_code=500,
        content={
            "code": 500,
            "detail": message,
            "path": request.url.path,
            "method": request.method,
        },
    )


async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    if is_rest_request(request):
        return validation_problem(request, exc)
    return await request_validation_exception_handler(request, exc)


async def http_error_handler(request: Request, exc: StarletteHTTPException) -> Response:
    if is_rest_request(request):
        return problem_response(
            request, exc.status_code, str(exc.detail), headers=exc.headers
        )
    return await http_exception_handler(request, exc)


def install_error_handlers(app: FastAPI) -> None:
    """Register exception handlers for both the RPC and the REST API."""
    app.add_exception_handler(404, custom_404_handler)
    app.add_exception_handler(NebulaException, nebula_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(AssertionError, assertion_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, catchall_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, http_error_handler)  # type: ignore[arg-type]

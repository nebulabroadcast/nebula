import asyncio
import contextlib
import os
from contextlib import asynccontextmanager

import aiofiles
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.websockets import WebSocket, WebSocketDisconnect

import nebula
from nebula.exceptions import NebulaException
from nebula.plugins.frontend import get_frontend_plugins
from nebula.settings import load_settings
from server.endpoints import install_endpoints
from server.storage_monitor import storage_monitor
from server.websocket import messaging


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore
    _ = app
    async with aiofiles.open("/var/run/nebula.pid", "w") as f:
        await f.write(str(os.getpid()))
    await load_settings()
    messaging.start()
    storage_monitor.start()
    nebula.log.success("Server started")

    yield

    nebula.log.info("Stopping server...")
    await messaging.shutdown()
    nebula.log.info("Server stopped")


app = FastAPI(
    lifespan=lifespan,
    docs_url=None,
    redoc_url="/docs",
    title="Nebula API",
    description="OpenSource media asset management and broadcast automation system",
    version=nebula.__version__,
    contact={
        "name": "Nebula Broadcast",
        "email": "info@nebulabroadcast.com",
        "url": "https://nebulabroadcast.com",
    },
    license_info={
        "name": "GNU GPL 3.0",
        "url": "https://www.gnu.org/licenses/gpl-3.0.en.html",
    },
)

#
# Error handlers
#


@app.exception_handler(404)
async def custom_404_handler(
    request: Request, _: Exception
) -> FileResponse | JSONResponse:
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

    index_path = os.path.join(nebula.config.frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(
            index_path,
            status_code=200,
            media_type="text/html",
        )

    return JSONResponse(status_code=404, content={"detail": "Resource not found"})


@app.exception_handler(NebulaException)
async def openpype_exception_handler(
    request: Request,
    exc: NebulaException,
) -> JSONResponse:
    # endpoint = request.url.path.split("/")[-1]
    # We do not need to log this (It is up to NebulaException class)
    # nebula.log.error(f"{endpoint}: {exc}")  # TODO: user?
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


@app.exception_handler(AssertionError)
async def assertion_error_handler(
    request: Request, exc: AssertionError
) -> JSONResponse:
    nebula.log.error(f"AssertionError: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "code": 500,
            "detail": str(exc),
            "path": request.url.path,
            "method": request.method,
        },
    )


@app.exception_handler(Exception)
async def catchall_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    endpoint = request.url.path.split("/")[-1]
    message = f"[Unhandled exception] {endpoint}: {exc}"
    nebula.log.error(message)
    return JSONResponse(
        status_code=500,
        content={
            "code": 500,
            "detail": message,
            "path": request.url.path,
            "method": request.method,
        },
    )


#
# Messaging
#


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket) -> None:
    client = await messaging.join(websocket)
    if client is None:
        return
    try:
        while True:
            message = await client.receive()
            if message is None:
                continue

            if message["topic"] == "auth":
                token = message.get("token")
                subscribe = message.get("subscribe", [])
                if token:
                    await client.authorize(token, subscribe)
            await asyncio.sleep(0.01)
    except WebSocketDisconnect:
        with contextlib.suppress(KeyError):
            del messaging.clients[client.id]


#
# API endpoints and the frontend
#


def install_frontend_plugins(app: FastAPI) -> None:
    for plugin in get_frontend_plugins():
        nebula.log.trace(f"Mounting frontend plugin {plugin.name}: {plugin.path}")
        app.mount(
            f"/plugins/{plugin.name}",
            StaticFiles(directory=plugin.path, html=True),
        )


# TODO: this is a development hack.
HLS_DIR = "/mnt/nebula_01/hls/"
if os.path.exists(HLS_DIR):
    app.mount("/hls", StaticFiles(directory=HLS_DIR))


def install_frontend(app: FastAPI) -> None:
    if nebula.config.frontend_dir and os.path.isdir(nebula.config.frontend_dir):
        app.mount("/", StaticFiles(directory=nebula.config.frontend_dir, html=True))


install_endpoints(app)
install_frontend_plugins(app)
install_frontend(app)

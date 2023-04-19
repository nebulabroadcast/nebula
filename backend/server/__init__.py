import os

from fastapi import Depends, FastAPI, Header, Request
from fastapi.responses import JSONResponse, Response, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.websockets import WebSocket, WebSocketDisconnect

import nebula
from nebula.exceptions import NebulaException
from nebula.settings import load_settings
from server.dependencies import current_user_query
from server.endpoints import install_endpoints
from server.storage_monitor import storage_monitor
from server.video import range_requests_response
from server.websocket import messaging

app = FastAPI(
    docs_url=None,
    redoc_url="/docs",
    title="Nebula API",
    description="OpenSource media asset management and broadcast automation system",
    version="6.0.0",
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
async def custom_404_handler(request: Request, _):
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
async def assertion_error_handler(request: Request, exc: AssertionError):
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
# Proxies
#


class ProxyResponse(Response):
    content_type = "video/mp4"


@app.get("/proxy/{id_asset}", response_class=ProxyResponse)
async def proxy(
    request: Request,
    id_asset: int,
    user: nebula.User = Depends(current_user_query),
    range: str = Header(None),
):
    """Serve a low-res (proxy) media for a given asset.

    This endpoint supports range requests, so it is possible to use
    the file in media players that support HTTPS pseudo-streaming.
    """

    sys_settings = nebula.settings.system
    proxy_storage_path = nebula.storages[sys_settings.proxy_storage].local_path
    proxy_path_template = os.path.join(proxy_storage_path, sys_settings.proxy_path)

    vars = {
        "id": id_asset,
        "id1000": id_asset // 1000,
    }

    video_path = proxy_path_template.format(**vars)

    if not os.path.exists(video_path):
        # maybe return content too? with a placeholder image?
        return Response(status_code=404, content="Not found")
    return range_requests_response(request, video_path, "video/mp4")


#
# Messaging
#


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket) -> None:
    client = await messaging.join(websocket)
    try:
        while True:
            message = await client.receive()
            if message is None:
                continue

            if message["topic"] == "auth":
                await client.authorize(
                    message.get("token"),
                    topics=message.get("subscribe", []),
                )
                if client.user_name:
                    nebula.log.trace(f"{client.user_name} connected")
    except WebSocketDisconnect:
        if client.user_name:
            nebula.log.trace(f"{client.user_name} disconnected")
        try:
            del messaging.clients[client.id]
        except KeyError:
            pass


#
# API endpoints and the frontend
#


def install_frontend_plugins(app: FastAPI):
    plugin_root = os.path.join(nebula.config.plugin_dir, "frontend")
    if not os.path.exists(plugin_root):
        return

    for plugin_name in os.listdir(plugin_root):
        plugin_path = os.path.join(plugin_root, plugin_name, "dist")
        if not os.path.isdir(plugin_path):
            continue

        nebula.log.debug(f"Mounting frontend plugin {plugin_name}: {plugin_path}")
        app.mount(
            f"/plugins/{plugin_name}",
            StaticFiles(directory=plugin_path, html=True),
        )


# TODO: this is a development hack.
HLS_DIR = "/storage/nebula_01/hls/"
if os.path.exists(HLS_DIR):
    app.mount("/hls", StaticFiles(directory=HLS_DIR))


def install_frontend(app: FastAPI):
    if nebula.config.frontend_dir and os.path.isdir(nebula.config.frontend_dir):
        app.mount("/", StaticFiles(directory=nebula.config.frontend_dir, html=True))


install_endpoints(app)
install_frontend_plugins(app)
install_frontend(app)


#
# Startup event
#


@app.on_event("startup")
async def startup_event():

    with open("/var/run/nebula.pid", "w") as f:
        f.write(str(os.getpid()))

    await load_settings()

    messaging.start()
    storage_monitor.start()
    nebula.log.success("Server started")


@app.on_event("shutdown")
async def shutdown_event():
    nebula.log.info("Stopping server...")
    await messaging.shutdown()

    nebula.log.info("Server stopped", handlers=None)

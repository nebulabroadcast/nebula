import os
import time

import aiofiles
from fastapi import Depends, FastAPI, Header, Request
from fastapi.responses import JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.websockets import WebSocket, WebSocketDisconnect

import nebula
from nebula.enum import MediaType, ObjectStatus
from nebula.exceptions import NebulaException
from nebula.filetypes import FileTypes
from nebula.settings import load_settings
from server.dependencies import asset_in_path, current_user, current_user_query
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
    return RedirectResponse("/")


@app.exception_handler(NebulaException)
async def openpype_exception_handler(
    request: Request,
    exc: NebulaException,
) -> JSONResponse:
    endpoint = request.url.path.split("/")[-1]
    nebula.log.error(f"{endpoint}: {exc}")  # TODO: user?
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


@app.post("/upload/{id_asset}", response_class=Response)
async def upload_media_file(
    request: Request,
    asset: nebula.Asset = Depends(asset_in_path),
    user: nebula.User = Depends(current_user),
):
    """Upload a media file for a given asset.

    This endpoint is used by the web frontend to upload media files.
    """

    assert asset["media_type"] == MediaType.FILE, "Only file assets can be uploaded"
    extension = request.headers.get("X-nebula-extension")
    assert extension, "Missing X-nebula-extension header"

    assert (
        FileTypes.data.get(extension) == asset["content_type"]
    ), "Invalid content type"

    if nebula.settings.system.upload_storage and nebula.settings.system.upload_dir:
        direct = False
        storage = nebula.storages[nebula.settings.system.upload_storage]
        upload_dir = nebula.settings.system.upload_dir
        base_name = nebula.settings.system.upload_base_name.format(**asset.meta)
        target_path = os.path.join(
            storage.local_path, upload_dir, f"{base_name}.{extension}"
        )
    else:
        direct = True
        storage = nebula.storages[asset["id_storage"]]
        target_path = os.path.splitext(asset.local_path)[0] + "." + extension

    nebula.log.debug(f"Uploading media file for {asset}", user=user.name)

    temp_dir = os.path.join(storage.local_path, ".nx", "creating")
    if not os.path.isdir(temp_dir):
        os.makedirs(temp_dir)

    temp_path = os.path.join(temp_dir, f"upload-{asset.id}-{time.time()}")

    i = 0
    async with aiofiles.open(temp_path, "wb") as f:
        async for chunk in request.stream():
            i += len(chunk)
            await f.write(chunk)
    nebula.log.debug(f"Uploaded {i} bytes", user=user.name)

    os.rename(temp_path, target_path)
    if direct:
        if extension != os.path.splitext(asset["path"])[1][1:]:
            nebula.log.warning(
                f"Uploaded media file extension {extension} does not match "
                f"asset extension {os.path.splitext(asset['path'])[1][1:]}"
            )
            asset["path"] = os.path.splitext(asset["path"])[0] + "." + extension
            # TODO: remove old file?
        asset["status"] = ObjectStatus.CREATING
        await asset.save()
    nebula.log.info(f"Uploaded media file for {asset}", user=user.name)


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
    except WebSocketDisconnect:
        if client.user_name:
            nebula.log.trace(f"{client.user_name} disconnected")
        else:
            nebula.log.trace("Anonymous client disconnected")
        del messaging.clients[client.id]


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

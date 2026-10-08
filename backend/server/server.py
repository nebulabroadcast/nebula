import asyncio
import contextlib
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import aiofiles
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.websockets import WebSocket, WebSocketDisconnect

import nebula
from nebula.exceptions import NotFoundException
from nebula.plugins.frontend import get_frontend_plugins
from nebula.settings import load_settings
from server.endpoints import install_endpoints, install_rest_routers
from server.errors import install_error_handlers
from server.middleware.context import RequestContextMiddleware
from server.middleware.session import SessionMiddleware
from server.storage_monitor import storage_monitor
from server.websocket import messaging

# Code reaching the server without a request context (websockets, plugin
# hooks...) is untrusted. Background jobs opt in with system_context().
nebula.context.set_default_system(False)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    _ = app
    with nebula.context.system_context():
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

app.add_middleware(SessionMiddleware)
app.add_middleware(RequestContextMiddleware)


install_error_handlers(app)


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


@app.get("/api/login-background.jpg", tags=["System"])
def login_background() -> FileResponse:
    """Serve the login background image."""
    img_path = f"/mnt/{nebula.config.site_name}_01/.nx/login-background.jpg"
    if os.path.exists(img_path):
        return FileResponse(img_path, media_type="image/jpeg")
    raise NotFoundException("Login background image not found")


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
install_rest_routers(app)
install_frontend_plugins(app)
install_frontend(app)

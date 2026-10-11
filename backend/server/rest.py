"""Discovery of REST resources (packages in rest/)."""

import importlib
import os

import fastapi

import nebula
from server.errors import REST_PREFIX


def find_rest_routers() -> list[tuple[str, fastapi.APIRouter]]:
    """Find the routers of all REST resources (packages in rest/)."""
    result = []
    for name in sorted(os.listdir("rest")):
        if not os.path.isfile(os.path.join("rest", name, "__init__.py")):
            continue

        try:
            module = importlib.import_module(f"rest.{name}")
        except ImportError:
            nebula.log.traceback(f"Failed to load REST resource {name}")
            continue

        router = getattr(module, "router", None)
        if not isinstance(router, fastapi.APIRouter):
            nebula.log.error(f"REST resource {name} doesn't export a router")
            continue
        result.append((name, router))
    return result


def install_rest_routers(app: fastapi.FastAPI) -> None:
    """Mount all REST resources under REST_PREFIX."""
    for name, router in find_rest_routers():
        nebula.log.trace("Adding REST resource", name)
        app.include_router(router, prefix=REST_PREFIX)

import functools
import inspect
import os
from collections.abc import Callable
from typing import Any

import fastapi

import nebula
from nebula.common import classes_from_module, import_module
from nebula.plugins.library import plugin_library
from nebula.utils import slugify
from server.context import ScopedEndpoint, server_context
from server.request import APIRequest


def find_api_endpoints() -> list[APIRequest]:
    """Find all built-in API endpoints."""
    result = []
    for module_fname in os.listdir("api"):
        module_path = os.path.join("api", module_fname)

        # Search for python files with API endpoints
        # in case of a directory, search for __init__.py

        if os.path.isdir(module_path):
            module_path = os.path.join(module_path, "__init__.py")
            if not os.path.isfile(module_path):
                continue
            module_name = module_fname
        else:
            module_name = os.path.splitext(module_fname)[0]

        # Import module

        try:
            module = import_module(module_name, module_path)
        except ImportError:
            nebula.log.traceback(f"Failed to load endpoint {module_name}")
            continue

        # Find API endpoints

        for endpoint in classes_from_module(APIRequest, module):
            for key in ["name", "handle"]:
                if not hasattr(endpoint, key):
                    nebula.log.error(
                        f"Endpoint {endpoint.__name__} doesn't have a {key}"
                    )
                    break
            else:
                result.append(endpoint())
    return result


def log_deprecated_calls(name: str, handle: Callable[..., Any]) -> Callable[..., Any]:
    """Wrap a handler to log a warning on every call.

    functools.wraps keeps the signature, which FastAPI reads for parameters.
    """

    @functools.wraps(handle)
    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        nebula.log.warning(f"Deprecated endpoint '{name}' called")
        return await handle(*args, **kwargs)

    return wrapper


def install_endpoints(app: fastapi.FastAPI) -> None:
    """Register all API endpoints in the router."""
    endpoint_names = set()
    for endpoint in find_api_endpoints() + plugin_library.plugins["api"]:
        if endpoint.name in endpoint_names:
            nebula.log.warn(f"Duplicate endpoint name {endpoint.name}")
            continue

        if not hasattr(endpoint, "handle"):
            nebula.log.warn(f"Endpoint {endpoint.name} doesn't have a handle method")
            continue

        if not callable(endpoint.handle):
            nebula.log.warn(f"Endpoint {endpoint.name} handle is not callable")
            continue

        # use inspect to get the return type of the handle method
        # this is used to determine the response model

        sig = inspect.signature(endpoint.handle)
        if sig.return_annotation is not inspect.Signature.empty:
            response_model = sig.return_annotation
        else:
            response_model = None

        #
        # Set the endpoint path and name
        #

        endpoint_names.add(endpoint.name)
        route = endpoint.path or f"/api/{endpoint.name}"
        nebula.log.trace("Adding endpoint", route)

        additional_params = {}

        if response_model is not None:
            additional_params["response_model_exclude_none"] = endpoint.exclude_none
            additional_params["response_model_exclude_unset"] = endpoint.exclude_unset

        if isinstance(endpoint.__doc__, str):
            docstring = inspect.cleandoc(endpoint.__doc__)
        else:
            docstring = ""

        if endpoint.scopes:
            server_context.scoped_endpoints.append(
                ScopedEndpoint(
                    endpoint=endpoint.name,
                    title=endpoint.title or endpoint.name,
                    scopes=endpoint.scopes,
                )
            )

        handle = endpoint.handle
        if endpoint.deprecated:
            handle = log_deprecated_calls(endpoint.name, handle)

        app.router.add_api_route(
            route,
            handle,
            name=endpoint.title or endpoint.name,
            operation_id=slugify(endpoint.name, separator="_"),
            methods=endpoint.methods,
            description=docstring,
            tags=[endpoint.category] if endpoint.category else ["Plugins"],
            deprecated=endpoint.deprecated or None,
            **additional_params,
        )

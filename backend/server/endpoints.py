import os
from typing import Generator

import fastapi
from nxtools import slugify

import nebula
from nebula.common import classes_from_module, import_module
from server.context import ScopedEndpoint, server_context
from server.request import APIRequest


def find_api_endpoints() -> Generator[APIRequest, None, None]:
    """Find all API endpoints.

    If there is `api` directory in the plugin directory, it will be searched for
    endpoints too. Default endpoints are in `api` module of the backend.
    """

    API_PATHS = ["api"]
    if nebula.config.plugin_dir:
        api_plugin_dir = os.path.join(nebula.config.plugin_dir, "api")
        if os.path.isdir(api_plugin_dir):
            API_PATHS.append(api_plugin_dir)

    for root_dir in API_PATHS:
        if not os.path.isdir(root_dir):
            continue

        for module_fname in os.listdir(root_dir):
            module_path = os.path.join(root_dir, module_fname)

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
            except ModuleNotFoundError:
                nebula.log.error(f"Module {module_name} not found in {module_path}")
            except ImportError:
                nebula.log.traceback(f"Failed to import module {module_name}")

            # Find API endpoints in module and yield them

            for endpoint in classes_from_module(APIRequest, module):
                for key in ["name", "handle"]:
                    if not hasattr(endpoint, key):
                        nebula.log.error(
                            f"Endpoint {endpoint.__name__} doesn't have a {key}"
                        )
                        break
                else:
                    yield endpoint()


def install_endpoints(app: fastapi.FastAPI):
    """Register all API endpoints in the router."""

    endpoint_names = set()
    for endpoint in find_api_endpoints():
        if endpoint.name in endpoint_names:
            nebula.log.warn(f"Duplicate endpoint name {endpoint.name}")
            continue

        endpoint_names.add(endpoint.name)
        route = f"/api/{endpoint.name}"
        nebula.log.debug("Adding endpoint", route)

        additional_params = {}

        if endpoint.response_model is None:
            additional_params["response_class"] = fastapi.Response
        else:
            additional_params["response_model"] = endpoint.response_model
            additional_params["response_model_exclude_none"] = endpoint.exclude_none

        if type(endpoint.__doc__) is str:
            docstring = "\n".join([r.strip() for r in endpoint.__doc__.split("\n")])
        else:
            docstring = ""

        if endpoint.scopes:
            server_context.scoped_endpoints.append(
                ScopedEndpoint(
                    endpoint=endpoint.name,
                    title=endpoint.title,
                    scopes=endpoint.scopes,
                )
            )

        app.router.add_api_route(
            route,
            endpoint.handle,  # type: ignore
            name=endpoint.name,
            operation_id=slugify(endpoint.name, separator="_"),
            methods=endpoint.methods,
            description=docstring,
            **additional_params,
        )

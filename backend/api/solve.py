import os

from fastapi import Depends, Response
from pydantic import Field

import nebula
from nebula.common import classes_from_module, import_module
from server.dependencies import current_user
from server.models import RequestModel
from server.request import APIRequest


def get_solver(name: str) -> nebula.plugins.SolverPlugin:
    plugin_root = os.path.join(nebula.config.plugin_dir, "solver")

    if not os.path.exists(plugin_root):
        raise nebula.BadRequestException(f"Plugin root {plugin_root} does not exist")

    for module_fname in os.listdir(plugin_root):
        module_path = os.path.join(plugin_root, module_fname)

        if os.path.isdir(module_path):
            module_path = os.path.join(module_path, "__init__.py")
            if not os.path.isfile(module_path):
                continue
            module_name = module_fname
        else:
            module_name = os.path.splitext(module_fname)[0]

        try:
            plugin_module = import_module(module_name, module_path)
        except ModuleNotFoundError:
            nebula.log.error(f"Module {name} not found")
        except ImportError:
            nebula.log.traceback(f"Error importing module {name}")

        for plugin_class in classes_from_module(
            nebula.plugins.SolverPlugin, plugin_module
        ):
            if plugin_class.name == name:
                return plugin_class()

    raise nebula.BadRequestException(f"solver {name} not found")


class SolveRequestModel(RequestModel):
    solver: str = Field(..., example="dramatica")
    items: list[int] = Field(
        ...,
        example=[1, 2, 3],
        description="List of placeholder item IDs to solve",
    )


class Request(APIRequest):
    """Browse the assets database."""

    name: str = "solve"
    responses: list[int] = [200]

    async def handle(
        self,
        request: SolveRequestModel,
        user: nebula.User = Depends(current_user),
    ) -> Response:

        solver = get_solver(request.solver)

        print(request)

        for item in request.items:
            await solver(item)

        return Response(status_code=200)

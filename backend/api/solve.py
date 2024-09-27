from fastapi import Response
from pydantic import Field

from nebula.exceptions import BadRequestException
from nebula.plugins.library import plugin_library
from server.dependencies import CurrentUser
from server.models import RequestModel
from server.request import APIRequest


class SolveRequestModel(RequestModel):
    solver: str = Field(..., examples=["dramatica"])
    items: list[int] = Field(
        ...,
        examples=[[1, 2, 3]],
        description="List of placeholder item IDs to solve",
    )


class Request(APIRequest):
    """Solve a rundown placeholder"""

    name: str = "solve"
    responses: list[int] = [200]

    async def handle(
        self,
        request: SolveRequestModel,
        user: CurrentUser,
    ) -> Response:
        # TODO: check permissions
        assert user is not None

        try:
            solver = plugin_library.get("solver", request.solver)
        except KeyError as e:
            raise BadRequestException(f"Solver {request.solver} not found") from e

        for item in request.items:
            await solver(item)

        return Response(status_code=200)

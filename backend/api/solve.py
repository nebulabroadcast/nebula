from fastapi import Response
from pydantic import Field

import nebula
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

    name = "solve"
    title = "Solve"
    responses: list[int] = [200]

    async def handle(
        self,
        request: SolveRequestModel,
        user: CurrentUser,
    ) -> Response:
        # Get the list of channels of the requested items

        query = """
            SELECT DISTINCT id_channel
            FROM events e
            INNER JOIN items i
            ON e.id_magic = i.id_bin
            WHERE i.id = ANY($1)
        """

        err_msg = "You are not allowed to edit this rundown"
        async for row in nebula.db.iterate(query, request.items):
            if not user.can("rundown_edit", row["id_channel"]):
                raise nebula.ForbiddenException(err_msg)

        try:
            solver = plugin_library.get("solver", request.solver)
        except KeyError as e:
            raise BadRequestException(f"Solver {request.solver} not found") from e

        for item in request.items:
            await solver(item)

        return Response(status_code=200)

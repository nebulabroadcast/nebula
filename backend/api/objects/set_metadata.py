from server import APIRequest
from server.dependencies import CurrentUser

from .operations import Operation, OperationResult, Operations, OperationsRequest


class SetMetadata(APIRequest):
    """Create or update an object."""

    name = "set"
    title = "Set metadata"
    category = "Asset management"

    async def handle(
        self,
        request: Operation,
        user: CurrentUser,
    ) -> OperationResult:
        result = await Operations().run(
            OperationsRequest(operations=[request]), user, raise_errors=True
        )
        return result.operations[0]

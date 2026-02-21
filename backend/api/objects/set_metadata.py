import nebula
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
        operation = Operations()
        result = await operation.handle(
            OperationsRequest(operations=[request]),
            user=user,
        )

        if not result.success:
            raise nebula.NebulaException(
                result.operations[0].error or "Unknown error",
                user_name=user.name,
            )

        return result.operations[0]

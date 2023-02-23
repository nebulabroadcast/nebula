from nebula.log import log as logger


class NebulaException(Exception):
    """Base class for all Nebula exceptions."""

    detail: str = "Error"
    status: int = 500

    def __init__(
        self,
        detail: str | None = None,
        log: bool | str = False,
        **kwargs,
    ) -> None:

        self.kwargs = kwargs

        if detail is not None:
            self.detail = detail

        if log is True:
            logger.error(f"EXCEPTION: {self.status} {self.detail}")
        elif type(log) is str:
            logger.error(f"EXCEPTION: {self.status} {log}")

        super().__init__(self.detail)


class BadRequestException(NebulaException):
    detail = "Bad request"
    status = 400


class NotFoundException(NebulaException):
    detail = "Not found"
    status = 404


class UnauthorizedException(NebulaException):
    detail = "Unauthorized"
    status = 401


class ForbiddenException(NebulaException):
    detail = "Forbidden"
    status = 403


class LoginFailedException(NebulaException):
    detail = "Login failed"
    status = 401


class NotImplementedException(NebulaException):
    detail = "Not implemented"
    status = 501


class ConflictException(NebulaException):
    detail = "Conflict"
    status = 409


class ValidationException(NebulaException):
    detail = "Validation failed"
    status = 422

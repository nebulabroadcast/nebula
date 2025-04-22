from typing import Any

from nebula.log import log as logger


class RequestSettingsReload(Exception):
    pass


class NebulaException(Exception):
    """Base class for all Nebula exceptions."""

    detail: str = "Error"
    status: int = 500
    log: bool = True

    def __init__(self, detail: str | None = None, **kwargs: Any) -> None:
        self.kwargs = kwargs
        if detail is not None:
            self.detail = detail
        super().__init__(self.detail)


class BadRequestException(NebulaException):
    detail = "Bad request"
    status = 400
    log = True


class NotFoundException(NebulaException):
    detail = "Not found"
    status = 404
    log = False


class UnauthorizedException(NebulaException):
    detail = "Unauthorized"
    status = 401
    log = False


class ForbiddenException(NebulaException):
    detail = "Forbidden"
    status = 403
    log = False


class LoginFailedException(NebulaException):
    detail = "Login failed"
    status = 401
    log = True


class NotImplementedException(NebulaException):
    detail = "Not implemented"
    status = 501
    log = True


class ConflictException(NebulaException):
    detail = "Conflict"
    status = 409
    log = True


class ValidationException(NebulaException):
    detail = "Validation failed"
    status = 422
    log = True

from typing import Any, Type

from server.models import ResponseModel


class APIRequest:
    name: str
    path: str | None = None
    title: str | None = None
    methods: list[str] = ["POST"]
    response_class: Any = None
    response_model: Type[ResponseModel] | None = None
    responses: list[int] = [200]
    exclude_none: bool = True
    exclude_unset: bool = False
    scopes: list[str] | None = None

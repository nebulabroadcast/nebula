from typing import Any, Type

from server.models import ResponseModel


class APIRequest:
    name: str
    title: str | None = None
    methods: list[str] = ["POST"]
    response_class: Any = None
    response_model: Type[ResponseModel] | None = None
    responses: list[int] = [200]
    exclude_none: bool = True
    scopes: list[str] | None = None

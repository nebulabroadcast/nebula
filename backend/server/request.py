from typing import Any

from server.models import APIModel


class APIRequest:
    name: str
    path: str | None = None
    title: str | None = None
    methods: list[str] = ["POST"]
    response_class: Any = None
    response_model: type[APIModel] | None = None
    responses: list[int] = [200]
    exclude_none: bool = True
    exclude_unset: bool = False
    scopes: list[str] | None = None
    category: str | None = None
    # Superseded by a REST endpoint (see rest/README.md §11). Shown in
    # OpenAPI, and every call is logged so remaining callers can be found.
    deprecated: bool = False

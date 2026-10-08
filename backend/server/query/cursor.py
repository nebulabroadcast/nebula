"""Opaque keyset cursors.

A cursor holds the sort-key values of the last row of a page and a hash of
the query that produced it, so it can't be reused with a different query.
"""

import base64
import hashlib
from typing import Any

import nebula
from nebula.common import json_dumps, json_loads
from server.query.models import QueryRequest


class InvalidCursorError(nebula.BadRequestException):
    log = False


def query_hash(request: QueryRequest, sort: list[str]) -> str:
    """Hash of everything that decides which rows a page contains, and their order."""
    data = {
        "filter": request.filter.model_dump(by_alias=True) if request.filter else None,
        "q": request.q,
        "sort": sort,
    }
    return hashlib.sha256(json_dumps(data).encode()).hexdigest()[:16]


def encode_cursor(values: list[Any], qhash: str) -> str:
    data = json_dumps({"v": values, "h": qhash}).encode()
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def decode_cursor(cursor: str, qhash: str, size: int) -> list[Any]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        data = json_loads(base64.urlsafe_b64decode(padded).decode())
        values = data["v"]
        cursor_hash = data["h"]
    except Exception as e:
        raise InvalidCursorError("Invalid cursor") from e

    if cursor_hash != qhash:
        raise InvalidCursorError("Cursor doesn't belong to this query")
    if not isinstance(values, list) or len(values) != size:
        raise InvalidCursorError("Invalid cursor")
    return values

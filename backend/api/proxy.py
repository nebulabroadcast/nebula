import asyncio
import os

import aiofiles
from fastapi import Header, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse

import nebula
from server.dependencies import CurrentUserInQuery
from server.request import APIRequest


async def send_bytes_range_requests(file_name: str, start: int, end: int):
    """Send a file in chunks using Range Requests specification RFC7233

    `start` and `end` parameters are inclusive due to specification
    """
    CHUNK_SIZE = 1024 * 8

    async with aiofiles.open(file_name, mode="rb") as f:
        await f.seek(start)
        chs = await f.tell()
        while (pos := chs) <= end:
            read_size = min(CHUNK_SIZE, end + 1 - pos)
            data = await f.read(read_size)
            yield data


def _get_range_header(range_header: str, file_size: int) -> tuple[int, int]:
    def _invalid_range():
        return HTTPException(
            status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
            detail=f"Invalid request range (Range:{range_header!r})",
        )

    try:
        h = range_header.replace("bytes=", "").split("-")
        start = int(h[0]) if h[0] != "" else 0
        end = int(h[1]) if h[1] != "" else file_size - 1
    except ValueError as e:
        raise _invalid_range() from e

    if start > end or start < 0 or end > file_size - 1:
        raise _invalid_range()
    return start, end


async def range_requests_response(request: Request, file_path: str, content_type: str):
    """Returns StreamingResponse using Range Requests of a given file"""

    file_size = os.stat(file_path).st_size
    range_header = request.headers.get("range")

    headers = {
        "content-type": content_type,
        "accept-ranges": "bytes",
        "content-encoding": "identity",
        "content-length": str(file_size),
        "access-control-expose-headers": (
            "content-type, accept-ranges, content-length, "
            "content-range, content-encoding"
        ),
    }
    start = 0
    end = file_size - 1
    status_code = status.HTTP_200_OK

    if range_header is not None:
        start, end = _get_range_header(range_header, file_size)
        size = end - start + 1
        headers["content-length"] = str(size)
        headers["content-range"] = f"bytes {start}-{end}/{file_size}"
        status_code = status.HTTP_206_PARTIAL_CONTENT

    return StreamingResponse(
        send_bytes_range_requests(file_path, start, end),
        headers=headers,
        status_code=status_code,
    )


class ProxyResponse(Response):
    content_type = "video/mp4"


class ServeProxy(APIRequest):
    name: str = "proxy"
    path: str = "/proxy/{id_asset}"
    title: str = "Serve proxy"
    response_class = ProxyResponse
    methods = ["GET"]

    async def handle(
        self,
        request: Request,
        id_asset: int,
        user: CurrentUserInQuery,
        range: str = Header(None),
    ):
        """Serve a low-res (proxy) media for a given asset.

        This endpoint supports range requests, so it is possible to use
        the file in media players that support HTTPS pseudo-streaming.
        """

        sys_settings = nebula.settings.system
        proxy_storage_path = nebula.storages[sys_settings.proxy_storage].local_path
        proxy_path_template = os.path.join(proxy_storage_path, sys_settings.proxy_path)

        vars = {
            "id": id_asset,
            "id1000": id_asset // 1000,
        }

        video_path = proxy_path_template.format(**vars)

        if not os.path.exists(video_path):
            # maybe return content too? with a placeholder image?
            return Response(status_code=404, content="Not found")

        try:
            return await range_requests_response(request, video_path, "video/mp4")
        except asyncio.CancelledError:
            return None
        except Exception:
            nebula.log.traceback("Error serving proxy")
            return Response(status_code=500, content="Internal server error")

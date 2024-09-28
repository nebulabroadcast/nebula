import os

import aiofiles
from fastapi import HTTPException, Request, Response, status

import nebula
from server.dependencies import CurrentUser
from server.request import APIRequest

MAX_200_SIZE = 1024 * 1024 * 12


class ProxyResponse(Response):
    content_type = "video/mp4"


def get_file_size(file_name: str) -> int:
    """Get the size of a file"""
    if not os.path.exists(file_name):
        raise nebula.NotFoundException("File not found")
    return os.stat(file_name).st_size


async def get_bytes_range(file_name: str, start: int, end: int) -> bytes:
    """Get a range of bytes from a file"""
    async with aiofiles.open(file_name, mode="rb") as f:
        await f.seek(start)
        pos = start
        read_size = end - pos + 1
        return await f.read(read_size)


def _get_range_header(range_header: str, file_size: int) -> tuple[int, int]:
    """
    Parse the Range header to determine the start and end byte positions.

    Args:
        range_header (str): The value of the Range header from the HTTP request.
        file_size (int): The total size of the file in bytes.

    Returns:
        tuple[int, int]: A tuple containing the start and end byte positions.

    Raises:
        HTTPException: If the range is invalid or cannot be parsed.
    """

    def _invalid_range() -> HTTPException:
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


async def range_requests_response(
    request: Request, file_path: str, content_type: str
) -> ProxyResponse:
    """Returns StreamingResponse using Range Requests of a given file"""

    file_size = get_file_size(file_path)

    max_chunk_size = 1024 * 1024 * 4
    range_header = request.headers.get("range")
    max_200_size = MAX_200_SIZE

    # screw firefox
    if ua := request.headers.get("user-agent"):
        if "firefox" in ua.lower():
            max_chunk_size = file_size
        elif "safari" in ua.lower():
            max_200_size = 0

    headers = {
        "content-type": content_type,
        "content-length": str(file_size),
        "accept-ranges": "bytes",
        "access-control-expose-headers": (
            "content-type, accept-ranges, content-length, "
            "content-range, content-encoding"
        ),
    }
    start = 0
    end = file_size - 1
    status_code = status.HTTP_200_OK

    if file_size <= max_200_size:
        # if the file has a sane size, we return the whole thing
        # in one go. That allows the browser to cache the video
        # and prevent unnecessary requests.

        headers["content-range"] = f"bytes 0-{end}/{file_size}"

    elif range_header is not None:
        start, end = _get_range_header(range_header, file_size)
        end = min(end, start + max_chunk_size - 1, file_size - 1)

        size = end - start + 1
        headers["content-length"] = str(size)
        headers["content-range"] = f"bytes {start}-{end}/{file_size}"

        if size == file_size:
            status_code = status.HTTP_200_OK
        else:
            status_code = status.HTTP_206_PARTIAL_CONTENT

    payload = await get_bytes_range(file_path, start, end)

    if status_code == status.HTTP_200_OK:
        headers["cache-control"] = "private, max-age=600"

    return ProxyResponse(
        content=payload,
        headers=headers,
        status_code=status_code,
    )


class ServeProxy(APIRequest):
    """Serve a low-res (proxy) media for a given asset.

    This endpoint supports range requests, so it is possible to use
    the file in media players that support HTTPS pseudo-streaming.
    """

    name = "proxy"
    path = "/proxy/{id_asset}"
    title = "Serve proxy"
    methods = ["GET"]

    async def handle(
        self,
        request: Request,
        id_asset: int,
        user: CurrentUser,
    ) -> ProxyResponse:
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
            raise nebula.NotFoundException("Proxy not found")

        try:
            return await range_requests_response(request, video_path, "video/mp4")
        except Exception as e:
            nebula.log.traceback("Error serving proxy")
            raise nebula.NebulaException("Error serving proxy") from e

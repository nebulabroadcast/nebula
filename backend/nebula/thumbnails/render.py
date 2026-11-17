"""Making a thumbnail with ffmpeg."""

import asyncio

WIDTH = 320
QUALITY = 75
TIMEOUT_SECONDS = 20


class RenderError(Exception):
    pass


async def render(path: str, position: float, input_format: str | None = None) -> bytes:
    """A WIDTH px wide WebP of the frame at `position` seconds of the file.

    `input_format` is ffmpeg's `-f` for the input (tests use `lavfi`).
    """
    process = await asyncio.create_subprocess_exec(
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        str(position),
        *(["-f", input_format] if input_format else []),
        "-i",
        path,
        "-frames:v",
        "1",
        # square pixels first, so anamorphic sources keep their aspect
        "-vf",
        f"scale=iw*sar:ih,setsar=1,scale={WIDTH}:-2",
        "-c:v",
        "libwebp",
        "-quality",
        str(QUALITY),
        "-f",
        "webp",
        "pipe:1",
        stdin=asyncio.subprocess.DEVNULL,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(process.communicate(), TIMEOUT_SECONDS)
    except TimeoutError as e:
        process.kill()
        await process.wait()
        raise RenderError(f"ffmpeg took more than {TIMEOUT_SECONDS} s") from e
    if process.returncode != 0 or not stdout:
        message = stderr.decode(errors="replace").strip()
        raise RenderError(message or "ffmpeg made no picture")
    return stdout


def webp_size(data: bytes) -> tuple[int, int] | None:
    """Width and height from a WebP file's header (RFC 9649)."""
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    match data[12:16]:
        case b"VP8X":  # extended: 24-bit canvas size minus one
            width = int.from_bytes(data[24:27], "little") + 1
            height = int.from_bytes(data[27:30], "little") + 1
        case b"VP8 ":  # lossy: 14 bits each after the frame tag
            width = int.from_bytes(data[26:28], "little") & 0x3FFF
            height = int.from_bytes(data[28:30], "little") & 0x3FFF
        case b"VP8L":  # lossless: 14 bits each, minus one, after the signature
            bits = int.from_bytes(data[21:25], "little")
            width = (bits & 0x3FFF) + 1
            height = ((bits >> 14) & 0x3FFF) + 1
        case _:
            return None
    return width, height

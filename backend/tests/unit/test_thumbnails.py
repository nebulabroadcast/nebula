"""Thumbnail queue and WebP header reading (spec 011)."""

import asyncio
import shutil

import pytest

from nebula.thumbnails.queue import ThumbnailBusyError, ThumbnailQueue
from nebula.thumbnails.render import render, webp_size


class Maker:
    """Makes ids in the order the queue asks, each when released."""

    def __init__(self) -> None:
        self.made: list[int] = []
        self.started = asyncio.Event()
        self.release = asyncio.Event()

    async def __call__(self, id_: int) -> str:
        self.started.set()
        await self.release.wait()
        self.made.append(id_)
        if id_ < 0:
            raise ValueError(id_)
        return f"thumb {id_}"


@pytest.mark.asyncio
async def test_newest_request_is_made_first() -> None:
    maker = Maker()
    queue = ThumbnailQueue(maker)
    first = asyncio.create_task(queue.get(1))
    await maker.started.wait()  # 1 is being made; 2, 3, 4 wait
    rest = [asyncio.create_task(queue.get(i)) for i in (2, 3, 4)]
    await asyncio.sleep(0)
    maker.release.set()
    assert await asyncio.gather(first, *rest) == [f"thumb {i}" for i in (1, 2, 3, 4)]
    assert maker.made == [1, 4, 3, 2]


@pytest.mark.asyncio
async def test_requests_for_one_id_share_a_job() -> None:
    maker = Maker()
    queue = ThumbnailQueue(maker)
    running = [asyncio.create_task(queue.get(1)) for _ in range(2)]
    await maker.started.wait()
    waiting = [asyncio.create_task(queue.get(2)) for _ in range(2)]
    running.append(asyncio.create_task(queue.get(1)))  # while 1 is being made
    await asyncio.sleep(0)
    maker.release.set()
    await asyncio.gather(*running, *waiting)
    assert maker.made == [1, 2]


@pytest.mark.asyncio
async def test_full_queue_drops_the_oldest() -> None:
    maker = Maker()
    queue = ThumbnailQueue(maker, size=2)
    running = asyncio.create_task(queue.get(1))
    await maker.started.wait()
    oldest = asyncio.create_task(queue.get(2))
    await asyncio.sleep(0)
    others = [asyncio.create_task(queue.get(i)) for i in (3, 4)]
    await asyncio.sleep(0)
    with pytest.raises(ThumbnailBusyError):
        await oldest
    maker.release.set()
    await asyncio.gather(running, *others)
    assert maker.made == [1, 4, 3]


@pytest.mark.asyncio
async def test_asking_again_makes_an_id_the_newest() -> None:
    maker = Maker()
    queue = ThumbnailQueue(maker, size=2)
    running = asyncio.create_task(queue.get(1))
    await maker.started.wait()
    tasks = [asyncio.create_task(queue.get(i)) for i in (2, 3)]
    await asyncio.sleep(0)
    tasks.append(asyncio.create_task(queue.get(2)))  # 2 is the newest now
    await asyncio.sleep(0)
    tasks.append(asyncio.create_task(queue.get(4)))  # drops 3, the oldest
    await asyncio.sleep(0)
    maker.release.set()
    results = await asyncio.gather(running, *tasks, return_exceptions=True)
    assert isinstance(results[2], ThumbnailBusyError)  # 3
    assert maker.made == [1, 4, 2]


@pytest.mark.asyncio
async def test_timeout_keeps_the_job() -> None:
    maker = Maker()
    queue = ThumbnailQueue(maker, wait=0.01)
    with pytest.raises(ThumbnailBusyError):
        await queue.get(1)
    maker.release.set()
    queue._wait = 1  # noqa: SLF001
    assert await queue.get(1) == "thumb 1"  # the same job, now done
    assert maker.made == [1]


@pytest.mark.asyncio
async def test_errors_reach_the_requests_and_the_queue_goes_on() -> None:
    maker = Maker()
    maker.release.set()
    queue = ThumbnailQueue(maker)
    with pytest.raises(ValueError, match="-1"):
        await queue.get(-1)
    assert await queue.get(2) == "thumb 2"


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="needs ffmpeg")
@pytest.mark.parametrize(
    ("source", "expected"),
    [
        ("color=c=red:s=1280x720:d=1", (320, 180)),
        ("color=c=red:s=720x576:d=1,setsar=16/15", (320, 240)),  # anamorphic 4:3
        ("color=c=red:s=1080x1920:d=1", (320, 568)),
    ],
)
@pytest.mark.asyncio
async def test_render_and_webp_size(source: str, expected: tuple[int, int]) -> None:
    data = await render(source, 0, input_format="lavfi")
    assert webp_size(data) == expected


def test_webp_size_of_something_else() -> None:
    assert webp_size(b"") is None
    assert webp_size(b"RIFF\0\0\0\0WEBPXXXX" + bytes(20)) is None
    assert webp_size(b"\x89PNG\r\n\x1a\n" + bytes(30)) is None

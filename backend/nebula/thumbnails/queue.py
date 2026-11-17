"""One thumbnail made at a time, newest request first, a bounded backlog."""

import asyncio
from collections.abc import Awaitable, Callable
from typing import Any

QUEUE_SIZE = 64
WAIT_SECONDS = 30


class ThumbnailBusyError(Exception):
    """Not made in time, or dropped from a full queue: ask again later."""


def _retrieve(future: asyncio.Future[Any]) -> None:
    # A job whose requests all gave up: its exception is nobody's business
    if not future.cancelled():
        future.exception()


class ThumbnailQueue[T]:
    """Runs `make(id)` for one id at a time.

    Ids wait in a stack: the newest request is made first, since that is
    what a user scrolling a list is looking at. A full stack drops its
    oldest id. Requests for an id that is waiting or being made share its
    job. A request waits `wait` seconds at most; the job stays.
    """

    def __init__(
        self,
        make: Callable[[int], Awaitable[T]],
        size: int = QUEUE_SIZE,
        wait: float = WAIT_SECONDS,
    ) -> None:
        self._make = make
        self._size = size
        self._wait = wait
        self._pending: dict[int, asyncio.Future[T]] = {}  # oldest first
        self._running: tuple[int, asyncio.Future[T]] | None = None
        self._worker: asyncio.Task[None] | None = None

    async def get(self, id_: int) -> T:
        future: asyncio.Future[T]
        if self._running is not None and self._running[0] == id_:
            future = self._running[1]
        elif id_ in self._pending:
            future = self._pending.pop(id_)
            self._pending[id_] = future  # the newest again
        else:
            if len(self._pending) >= self._size:
                oldest = next(iter(self._pending))
                self._pending.pop(oldest).set_exception(ThumbnailBusyError())
            future = asyncio.get_running_loop().create_future()
            future.add_done_callback(_retrieve)
            self._pending[id_] = future
        if self._worker is None or self._worker.done():
            self._worker = asyncio.create_task(self._run())
        try:
            return await asyncio.wait_for(asyncio.shield(future), self._wait)
        except TimeoutError as e:
            raise ThumbnailBusyError from e

    async def _run(self) -> None:
        while self._pending:
            id_, future = self._pending.popitem()  # the newest
            self._running = (id_, future)
            try:
                future.set_result(await self._make(id_))
            except Exception as e:
                future.set_exception(e)
            finally:
                self._running = None

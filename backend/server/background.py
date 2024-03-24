import asyncio

import nebula


class BackgroundTask:
    def __init__(self) -> None:
        self.task: asyncio.Task | None = None  # type: ignore
        self.shutting_down = False
        self.initialize()

    def initialize(self) -> None:
        pass

    def start(self) -> None:
        self.task = asyncio.create_task(self._run())

    async def shutdown(self) -> None:
        if self.task:
            self.task.cancel()

        self.shutting_down = True
        while self.is_running:
            nebula.log.debug(
                f"Waiting for {self.__class__.__name__} to stop",
            )
            await asyncio.sleep(0.1)
        nebula.log.debug(
            f"{self.__class__.__name__} stopped",
        )

    @property
    def is_running(self) -> bool:
        return bool(self.task and not self.task.done())

    async def _run(self) -> None:
        try:
            await self.run()
        except asyncio.CancelledError:
            self.shutting_down = True
        except Exception:
            import traceback

            traceback.print_exc()
        finally:
            await self.finalize()
            self.task = None

        if not self.shutting_down:
            nebula.log.info(
                "Restarting",
                self.__class__.__name__,
            )
            self.start()

    async def run(self) -> None:
        pass

    async def finalize(self) -> None:
        pass

import asyncio

import nebula


class BackgroundTask:
    def __init__(self):
        self.task: asyncio.Task | None = None
        self.shutting_down = False
        self.initialize()

    def initialize(self):
        pass

    def start(self):
        self.task = asyncio.create_task(self._run())

    async def shutdown(self):
        if self.task:
            self.task.cancel()

        self.shutting_down = True
        while self.is_running:
            nebula.log.debug(
                f"Waiting for {self.__class__.__name__} to stop",
                handlers=None,
            )
            await asyncio.sleep(0.1)
        nebula.log.debug(
            f"{self.__class__.__name__} stopped",
            handlers=None,
        )

    @property
    def is_running(self):
        return self.task and not self.task.done()

    async def _run(self):
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
                handlers=None,
            )
            self.start()

    async def run(self):
        pass

    async def finalize(self):
        pass

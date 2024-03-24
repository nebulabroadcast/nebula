from nxtools import format_time

import nebula
from nebula.helpers.scheduling import bin_refresh

from .common import modules_root

assert modules_root


class SolverPlugin:
    name: str = "solver"

    affected_bins: list[int] = []
    new_events: list[nebula.Event] = []
    new_items: list[nebula.Item] = []

    placeholder: nebula.Item
    event: nebula.Event
    bin: nebula.Bin

    _solve_next: nebula.Item | None = None
    _next_event: nebula.Event | None = None
    _needed_duration: float | None = None

    def __repr__(self) -> str:
        return f"<Nebula solver plugin: {self.name}>"

    async def __call__(self, id_item: int) -> None:
        """Solver entrypoint."""
        res = await nebula.db.fetch(
            """
            SELECT
                e.meta as emeta,
                b.meta as bmeta,
                i.meta as imeta
            FROM events e, bins b, items i, assets a
            WHERE e.id_magic = b.id AND i.id_bin = b.id AND i.id = $1
            """,
            id_item,
        )

        assert res, "Placeholder has no event or bin"

        self.placeholder = nebula.Item.from_meta(res[0]["imeta"])
        self.event = nebula.Event.from_meta(res[0]["emeta"])
        self.bin = nebula.Bin.from_meta(res[0]["bmeta"])

        await self.bin.get_items()

        assert self.bin.id  # shoudn't happen, keep mypy happy
        self.affected_bins = [self.bin.id]
        self.new_items = []
        self.new_events = []

        self._next_event = await self.get_next_event(force=True)
        self._needed_duration = await self.get_needed_duration(force=True)
        self._solve_next = None

        return await self.main()

    #
    # Property loaders
    #

    async def get_next_event(self, force: bool = False) -> nebula.Event | None:
        """Load event following the current one."""
        if (self._next_event is None) or force:
            res = await nebula.db.fetch(
                """
                SELECT meta FROM events
                WHERE id_channel = $1 AND start > $2
                ORDER BY start ASC LIMIT 1
                """,
                self.event["id_channel"],
                self.event["start"],
            )
            if res:
                self._next_event = nebula.Event.from_meta(res[0]["meta"])
            else:
                self._next_event = nebula.Event.from_meta(
                    {
                        "id_channel": self.event["id_channel"],
                        "start": self.event["start"] + 3600,
                    }
                )
        return self._next_event

    async def get_needed_duration(self, force: bool = False) -> float:
        """Load the duration needed to fill the current event."""
        if (self._needed_duration is None) or force:
            dur = self.next_event["start"] - self.event["start"]
            items = await self.bin.get_items()
            for item in items:
                await item.get_asset()
                if item.id == self.placeholder.id:
                    continue
                dur -= item.duration
            self._needed_duration = dur
        assert self._needed_duration is not None, "Needed duration not loaded"
        return self._needed_duration

    #
    # Properties for quick access
    #

    @property
    def next_event(self) -> nebula.Event:
        assert self._next_event, "Next event not loaded"
        return self._next_event

    @property
    def current_duration(self) -> float:
        """Return the current duration of items replacing the placeholder."""
        dur: float = 0.0
        for item in self.new_items:
            dur += item.duration
        return dur

    @property
    def needed_duration(self) -> float:
        """Return the duration needed to fill the current event."""
        assert self._needed_duration is not None
        return self._needed_duration

    #
    # Scheduling methods
    #

    async def block_split(self, tc: float) -> None:
        """Split the current event at the given time.

        This basically just creates a new event and insert
        a new placeholder to it. The placeholder is then
        stored in self._solve_next and will be solved
        after the current event is solved.
        """
        if tc <= self.event["start"] or tc >= self.next_event["start"]:
            nebula.log.error(
                "Timecode of block split must be between "
                "the current and next event start times",
                user=self.name,
            )
            return

        nebula.log.trace(
            f"Splitting {self.event} at {format_time(tc)}",
            user=self.name,
        )
        nebula.log.trace(
            f"Next event is {self.next_event} at {self.next_event.show('start')}",
            self.name,
        )
        new_bin = nebula.Bin()
        await new_bin.save(notify=False)

        new_placeholder = nebula.Item()
        new_placeholder["id_bin"] = new_bin.id
        new_placeholder["position"] = 0

        for key in self.placeholder.meta:
            if key not in ["id_bin", "position", "id_asset", "id"]:
                new_placeholder[key] = self.placeholder[key]

        await new_placeholder.save(notify=False)
        await new_bin.save(notify=False)

        new_event = nebula.Event()
        new_event["id_channel"] = self.event["id_channel"]
        new_event["title"] = "Split block"
        new_event["start"] = tc
        new_event["id_magic"] = new_bin.id

        await new_event.save(notify=False)

        self._next_event = new_event
        self._needed_duration = await self.get_needed_duration(force=True)
        self._needed_duration -= self.current_duration
        self._solve_next = new_placeholder

        if new_bin.id and (new_bin.id not in self.affected_bins):
            self.affected_bins.append(new_bin.id)

    async def main(self) -> None:
        nebula.log.info(f"Solving {self.placeholder}", user=self.name)
        try:
            async for new_item in self.solve():
                await new_item.get_asset()
                self.new_items.append(new_item)
        except Exception as e:
            message = nebula.log.traceback(
                "Error occured during solving",
                user=self.name,
            )
            raise nebula.NebulaException(message) from e

        if not self.new_items:
            return

        i = 0
        items = await self.bin.get_items()
        for item in items:
            i += 1
            if item.id == self.placeholder.id:
                await item.delete()
                for new_item in self.new_items:
                    i += 1
                    new_item["id_bin"] = self.bin.id
                    new_item["position"] = i
                    await new_item.save(notify=False)
            if item["position"] != i:
                item["position"] = i
                await item.save(notify=False)

        if self.bin.id and self.bin.id not in self.affected_bins:
            self.affected_bins.append(self.bin.id)

        # save event in case solver updated its metadata
        await self.event.save()

        # another paceholder was created, so we need to solve it
        if self._solve_next and self._solve_next.id:
            await self(self._solve_next.id)
            return

        # recalculate bin durations and notify clients about changes
        await bin_refresh(self.affected_bins)

    #
    # Solver implementation
    #

    async def solve(self):  # type: ignore
        """This method must return a list or yield items
        (no need to specify order or bin values) which
        replaces the original placeholder.
        """
        return []

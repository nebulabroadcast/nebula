import datetime
from typing import Any, Literal

from nebula.helpers.create_new_event import EventData

from .utils import get_week_start

DayKey = Literal[
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
    "default",
]

DAY_NAMES: list[DayKey] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
]


class TemplateImporter:
    day_start_hour: int
    day_start_minute: int
    events: dict[int, EventData]
    template: dict[DayKey, list[dict[str, Any]]]

    def __init__(
        self,
        template: dict[DayKey, list[dict[str, Any]]],
        day_start_hour: int = 7,
        day_start_minute: int = 30,
    ):
        self.day_start_hour = day_start_hour
        self.day_start_minute = day_start_minute
        self.template = template
        self.events = {}

    @property
    def day_start_offset(self) -> int:
        return self.day_start_hour * 3600 + self.day_start_minute * 60

    def build_for_week(self, date: str) -> dict[int, Any]:
        week_start = get_week_start(date, self.day_start_hour, self.day_start_minute)

        for i in range(7):
            day_start = week_start + datetime.timedelta(days=i)
            day_name: DayKey = DAY_NAMES[day_start.weekday()]

            day_start_ts = int(day_start.timestamp())
            self._apply_day_template("default", day_start_ts)

            if day_name in self.template:
                self._apply_day_template(day_name, day_start_ts)
        return self.events

    def _apply_day_template(self, key: DayKey, day_start_ts: int) -> None:
        day_tpl = self.template.get(key, [])

        for tpl in day_tpl:
            hour, minute = (int(k) for k in tpl["time"].split(":"))
            # seconds from midnight
            toffset = hour * 3600 + minute * 60
            # if the event is before the day start, it is for the next day
            if toffset < self.day_start_offset:
                toffset += 24 * 3600
            # somehow craft the final event timestamp
            evt_start = int(day_start_ts + toffset - self.day_start_offset)

            meta = {}
            for mkey in ["title", "description", "id_asset", "color"]:
                if tpl.get(mkey):
                    meta[mkey] = tpl[mkey]

            event_data = EventData(
                id=None,
                start=evt_start,
                items=tpl.get("items", None),
                meta=meta,
                id_asset=tpl.get("id_asset", None),
            )

            self.events[evt_start] = event_data

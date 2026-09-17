import datetime
from typing import Any, Literal

from nebula.helpers.create_new_event import EventData

from ._utils import get_week_start

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


<<<<<<< Updated upstream
=======
def run_mode_validator(value: Any) -> RunMode:
    if not isinstance(value, str):
        raise TypeError(f"Run mode must be a string, got {type(value).__name__}")
    return RunMode.from_str(value)


def title_validator(value: Any) -> str:
    if not isinstance(value, str):
        raise TypeError(f"Title must be a string, got {type(value).__name__}")
    if "\n" in value or "\r" in value:
        raise ValueError("Title cannot contain newline characters")
    return value


def description_validator(value: Any) -> str:
    if not isinstance(value, str):
        raise TypeError(f"Description must be a string, got {type(value).__name__}")
    return value


def id_validator(value: Any) -> int:
    if not isinstance(value, int) or isinstance(value, bool):
        raise TypeError(f"Asset id must be an integer, got {type(value).__name__}")
    if value <= 0:
        raise ValueError("Asset id must be a positive integer")
    return value


def color_validator(value: Any) -> int:
    if (
        isinstance(value, int)
        and not isinstance(value, bool)
        and 0 <= value <= 0xFFFFFF
    ):
        return value

    if isinstance(value, str) and re.match(
        r"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$", value
    ):
        return int(value.lstrip("#"), 16)
    raise ValueError(
        f"Color must be a hex string or an integer between 0 and 0xFFFFFF, got {value}"
    )


EVENT_META_VALIDATORS = {
    "title": title_validator,
    "subtitle": title_validator,
    "description": description_validator,
    "id_asset": id_validator,
    "color": color_validator,
    "run_mode": run_mode_validator,
}


>>>>>>> Stashed changes
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

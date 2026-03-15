import datetime
import json
import os
from typing import Any

import nebula


def get_templates_dir() -> str | None:
    storage_dir = nebula.storages[1].local_path
    path = os.path.join(storage_dir, ".nx", "scheduling_templates")
    if os.path.isdir(path):
        return path
    return None


def list_templates() -> list[str]:
    templates_dir = get_templates_dir()
    if templates_dir is None:
        return []
    return [f[:-5] for f in os.listdir(templates_dir) if f.endswith(".json")]


def load_template(name: str) -> dict[str, Any]:
    template_dir = get_templates_dir()
    if not template_dir:
        raise nebula.NotFoundException("Templates directory not found")
    template_path = os.path.join(template_dir, f"{name}.json")
    if not os.path.isfile(template_path):
        raise nebula.NotFoundException(f"Template {name} not found")
    try:
        with open(template_path) as f:
            data = json.load(f)
            assert isinstance(data, dict), f"Template {name} is not a valid JSON object"
            return data
    except Exception as e:
        raise nebula.NebulaException(f"Failed to load template {name}") from e


def get_week_start(date: str, hour: int = 0, minute: int = 0) -> datetime.datetime:
    """Get the start of the week for the given date"""
    this_date = datetime.datetime.strptime(date, "%Y-%m-%d")  # noqa: DTZ007
    week_start_midnight = this_date - datetime.timedelta(days=this_date.weekday())
    return datetime.datetime(  # noqa: DTZ001
        week_start_midnight.year,
        week_start_midnight.month,
        week_start_midnight.day,
        hour,
        minute,
    )

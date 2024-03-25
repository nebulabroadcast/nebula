import datetime
from typing import TYPE_CHECKING, Any

from nxtools import datestr2ts, s2time

import nebula

if TYPE_CHECKING:
    from nebula.settings.models import AcceptModel, PlayoutChannelSettings

ItemRuns = dict[int, tuple[float, float]]


async def bin_refresh(
    bins: list[int],
    initiator: str | None = None,
    user: nebula.User | None = None,
) -> None:
    if not bins:
        return None

    username = user.name if user else None

    for id_bin in bins:
        # Resave bin to update duration
        b = await nebula.Bin.load(id_bin, username=username)
        await b.get_items()
        if user:
            b["updated_by"] = user.id
        # this log message triggers storing bin duration to its meta
        nebula.log.trace(
            f"New duration of {b} is {s2time(b.duration)} ({len(b.items)} items)",
            user=username,
        )
        await b.save(notify=False)

    query = """
    SELECT DISTINCT(c.id) AS id_event FROM events as e, channels AS c
    WHERE
        c.channel_type = 0 AND
        c.id = e.id_channel AND
        e.id_magic = ANY($1)
    """
    changed_events = [row["id_event"] async for row in nebula.db.iterate(query, bins)]
    await nebula.msg(
        "objects_changed",
        object_type="bin",
        objects=bins,
        initiator=initiator,
    )
    if changed_events:
        await nebula.msg(
            "objects_changed",
            object_type="event",
            objects=changed_events,
            initiator=initiator,
        )
    return None


async def get_item_runs(id_channel: int, start_time: int, end_time: int) -> ItemRuns:
    """Return a list of items broadcasted in the given time range"""
    query = """
        SELECT id_item, start, stop FROM asrun
        WHERE start >= $1 AND start < $2 AND id_channel = $3
        ORDER BY start DESC
        """
    return {
        row["id_item"]: (row["start"], row["stop"])
        async for row in nebula.db.iterate(query, start_time, end_time, id_channel)
    }


async def get_pending_assets(send_action: int | None) -> list[int]:
    """Return a list of assets that are pending for the given send action"""
    if send_action is None:
        return []
    pending_assets = []
    query = "SELECT id_asset FROM jobs WHERE id_action=$1 AND status IN (0, 5)"
    async for row in nebula.db.iterate(query, send_action):
        pending_assets.append(row["id_asset"])
    return pending_assets


def parse_durations(
    ameta: dict[str, Any], imeta: dict[str, Any]
) -> tuple[float, float, float]:
    """From the given asset and item metadata,
    return the duration, mark_in and mark_out
    """
    a_duration = ameta.get("duration", 0)
    a_mark_in = ameta.get("mark_in", 0)
    a_mark_out = ameta.get("mark_in", 0)

    i_duration = imeta.get("duration", 0)
    i_mark_in = imeta.get("mark_in", 0)
    i_mark_out = imeta.get("mark_out", 0)

    duration = i_duration or a_duration
    mark_in = mark_out = 0
    if i_mark_in or i_mark_out:
        duration = i_mark_out - i_mark_in
        mark_in = i_mark_in
        mark_out = i_mark_out
    elif a_mark_in or a_mark_out:
        duration = a_mark_out - a_mark_in
        mark_in = a_mark_in
        mark_out = a_mark_out

    return (duration, mark_in, mark_out)


def parse_rundown_date(
    date: str | None,
    channel_config: "PlayoutChannelSettings",
) -> int:
    """Parse the date from the request and return a datetime object"""
    if not date:
        date = datetime.datetime.now().strftime("%Y-%m-%d")
    hh, mm = channel_config.day_start
    start_time = datestr2ts(date, hh=hh, mm=mm)
    return start_time


def can_append(asset: nebula.Asset, conditions: "AcceptModel") -> bool:
    # TODO: raise an exception instead of returning False?
    if conditions.folders and asset["id_folder"] not in conditions.folders:
        nebula.log.warn(f"Folder {asset['id_folder']} not in {conditions.folders}")
        return False
    if conditions.media_types and asset["media_type"] not in conditions.media_types:
        nebula.log.warn(
            f"Media type {asset['media_type']} not in {conditions.media_types}"
        )
        return False
    if conditions.content_types and (
        asset["content_type"] not in conditions.content_types
    ):
        nebula.log.warn(
            f"Content type {asset['content_type']}" " not in {conditions.content_types}"
        )
        return False
    return True

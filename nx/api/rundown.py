__all__ = ["get_rundown", "api_rundown"]

import time

from nxtools import datestr2ts

from nx.core.common import NebulaResponse, config
from nx.db import DB
from nx.objects import Asset, Item, Event, anonymous
from nx.helpers import get_item_runs
from nx.core.enum import ObjectStatus, RunMode


def get_rundown(id_channel, start_time=False, end_time=False, db=False):
    """Get a rundown."""
    db = db or DB()
    channel_config = config["playout_channels"][id_channel]
    if not start_time:
        # default today
        sh, sm = channel_config.get("day_start", [6, 0])
        rundown_date = time.strftime("%Y-%m-%d", time.localtime(time.time()))
        start_time = datestr2ts(rundown_date, hh=sh, mm=sm)

    end_time = end_time or start_time + (3600 * 24)

    item_runs = get_item_runs(id_channel, start_time, end_time, db=db)

    if channel_config.get("send_action", False):
        db.query(
            """SELECT id_asset FROM jobs
            WHERE id_action=%s AND status in (0, 5)
            """,
            [channel_config["send_action"]],
        )
        pending_assets = [r[0] for r in db.fetchall()]
    else:
        pending_assets = []

    db.query(
        """
        SELECT
            e.id,
            e.meta,
            i.meta,
            a.meta
        FROM
            events AS e

        LEFT JOIN
            items AS i
        ON
            e.id_magic = i.id_bin

        LEFT JOIN
            assets AS a
        ON
            i.id_asset = a.id

        WHERE
            e.id_channel = %s AND e.start >= %s AND e.start < %s

        ORDER BY
            e.start ASC,
            i.position ASC,
            i.id ASC
        """,
        (id_channel, start_time, end_time),
    )

    current_event_id = None
    event = None

    ts_broadcast = ts_scheduled = 0
    pskey = "playout_status/{}".format(id_channel)
    for id_event, emeta, imeta, ameta in db.fetchall() + [(-1, None, None, None)]:
        if id_event != current_event_id:
            if event:
                yield event
                if not event.items:
                    ts_broadcast = 0
            if id_event == -1:
                break

            event = Event(meta=emeta)
            event.items = []
            current_event_id = id_event
            rundown_event_asset = event.meta.get("id_asset", False)

            if event["run_mode"]:
                ts_broadcast = 0
            event.meta["rundown_scheduled"] = ts_scheduled = event["start"]
            event.meta["rundown_broadcast"] = ts_broadcast = (
                ts_broadcast or ts_scheduled
            )

        if imeta:
            item = Item(meta=imeta, db=db)
            if ameta:
                asset = Asset(meta=ameta, db=db) if ameta else False
                item._asset = asset
            else:
                asset = False

            as_start, as_stop = item_runs.get(item.id, (0, 0))
            airstatus = 0
            if as_start:
                ts_broadcast = as_start
                if as_stop:
                    airstatus = ObjectStatus.AIRED
                else:
                    airstatus = ObjectStatus.ONAIR

            item.meta["asset_mtime"] = asset["mtime"] if asset else 0
            item.meta["rundown_scheduled"] = ts_scheduled
            item.meta["rundown_broadcast"] = ts_broadcast
            item.meta["rundown_difference"] = ts_broadcast - ts_scheduled
            if rundown_event_asset:
                item.meta["rundown_event_asset"] = rundown_event_asset

            istatus = 0
            if not asset:
                istatus = ObjectStatus.ONLINE
            elif airstatus:
                istatus = airstatus
            elif asset["status"] == ObjectStatus.OFFLINE:
                istatus = ObjectStatus.OFFLINE
            elif pskey not in asset.meta:
                istatus = ObjectStatus.REMOTE
            elif asset[pskey]["status"] == ObjectStatus.OFFLINE:
                istatus = ObjectStatus.REMOTE
            elif asset[pskey]["status"] == ObjectStatus.ONLINE:
                istatus = ObjectStatus.ONLINE
            elif asset[pskey]["status"] == ObjectStatus.CORRUPTED:
                istatus = ObjectStatus.CORRUPTED
            else:
                istatus = ObjectStatus.UNKNOWN

            item.meta["status"] = istatus
            if asset and asset.id in pending_assets:
                item.meta["transfer_progress"] = -1

            if item["run_mode"] != RunMode.RUN_SKIP:
                ts_scheduled += item.duration
                ts_broadcast += item.duration

            event.items.append(item)


def api_rundown(**kwargs):
    """Rundown API endpoint."""
    user = kwargs.get("user", anonymous)
    id_channel = int(kwargs.get("id_channel", -1))
    start_time = kwargs.get("start_time", 0)

    if not (
        user.has_right("rundown_view", id_channel)
        or user.has_right("rundown_edit", id_channel)
    ):
        return NebulaResponse(401)

    process_start_time = time.time()

    if id_channel not in config["playout_channels"]:
        return NebulaResponse(400, "Invalid playout channel specified")

    rows = []
    i = 0
    for event in get_rundown(id_channel, start_time):
        row = event.meta
        row["object_type"] = "event"
        row["is_empty"] = len(event.items) == 0
        row["id_bin"] = event["id_magic"]
        rows.append(row)
        i += 1
        for item in event.items:
            row = item.meta
            row["object_type"] = "item"
            rows.append(row)
            i += 1

    process_time = time.time() - process_start_time
    return NebulaResponse(
        200, f"Rundown loaded in {process_time:.02f} seconds", data=rows
    )

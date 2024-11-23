import time

import nebula
from nebula.enum import ObjectStatus, RunMode
from nebula.helpers.scheduling import get_pending_assets, parse_rundown_date

from .models import RundownRequestModel, RundownResponseModel, RundownRow


async def get_rundown(request: RundownRequestModel) -> RundownResponseModel:
    """Get a rundown"""
    if not (channel := nebula.settings.get_playout_channel(request.id_channel)):
        raise nebula.BadRequestException(f"No such channel: {request.id_channel}")

    request_start_time = time.monotonic()
    start_time = parse_rundown_date(request.date, channel)
    end_time = start_time + (3600 * 24)
    pending_assets = await get_pending_assets(channel.send_action)
    pskey = f"playout_status/{request.id_channel}"

    query = """
        SELECT
            e.id AS id_event,
            e.meta AS emeta,
            e.id_magic AS id_bin,
            i.id AS id_item,
            i.meta AS imeta,
            a.meta AS ameta,
            ar.latest_start AS as_start,
            ar.latest_stop AS as_stop
        FROM events AS e

        LEFT JOIN items AS i
        ON e.id_magic = i.id_bin

        LEFT JOIN assets AS a
        ON i.id_asset = a.id

        LEFT JOIN (
            SELECT
                id_item,
                start AS latest_start,
                stop AS latest_stop
                FROM (
                    SELECT
                        id_item,
                        start,
                        stop,
                        ROW_NUMBER() OVER
                            (PARTITION BY id_item ORDER BY start DESC) AS rn
                    FROM asrun
                    WHERE
                        id_channel = $1
                    AND start >= $2 - 604800
                    AND start < $3 + 604800
                ) AS ranked
                WHERE rn = 1
        ) AS ar

        ON i.id = ar.id_item

        WHERE
            e.id_channel = $1
        AND e.start >= $2
        AND e.start < $3

        ORDER BY
            e.start ASC,
            i.position ASC,
            i.id ASC
    """

    rows: list[RundownRow] = []

    last_event = None
    ts_broadcast = ts_scheduled = 0.0

    async for record in nebula.db.iterate(
        query, request.id_channel, start_time, end_time
    ):
        id_event = record["id_event"]
        id_item = record["id_item"]
        id_bin = record["id_bin"]
        emeta = record["emeta"] or {}
        imeta = record["imeta"] or {}
        ameta = record["ameta"] or {}

        event = nebula.Event.from_meta(emeta)
        item = nebula.Item.from_meta(imeta)
        if ameta:
            asset = nebula.Asset.from_meta(ameta)
            item.asset = asset
        else:
            asset = None

        if (last_event is None) or (id_event != last_event.id):
            row = RundownRow(
                id=id_event,
                type="event",
                row_number=len(rows),
                scheduled_time=event["start"],
                broadcast_time=event["start"],
                run_mode=event.get("run_mode", RunMode.RUN_AUTO),
                title=event.get("title"),
                subtitle=event.get("subtitle"),
                id_asset=event.get("id_asset"),
                id_bin=id_bin,
                id_event=id_event,
                meta=emeta,
            )

            ts_scheduled = row.scheduled_time
            if last_event is None:
                ts_broadcast = event["start"]

            if last_event and (not last_event.duration):
                ts_broadcast = event["start"]

            if emeta.get("run_mode", 0):
                ts_broadcast = event["start"]

            last_event = row
            rows.append(row)

        if id_item is None:
            # TODO: append empty row?
            continue

        airstatus: ObjectStatus | None = None

        if (as_start := record["as_start"]) is not None:
            if as_start > ts_broadcast:
                ts_broadcast = as_start
            as_stop = record["as_stop"]
            airstatus = ObjectStatus.AIRED if as_stop else ObjectStatus.ONAIR

        # TODO
        # if rundown_event_asset:
        #     item.meta["rundown_event_asset"] = rundown_event_asset

        # Row status

        istatus: ObjectStatus
        if not ameta:
            # virtual item. consider it online
            istatus = ObjectStatus.ONLINE
        elif ameta.get("status") == ObjectStatus.OFFLINE:
            # media is not on the production storage
            istatus = ObjectStatus.OFFLINE
        elif pskey not in ameta or ameta[pskey]["status"] == ObjectStatus.OFFLINE:
            # media is not on the playout storage
            istatus = ObjectStatus.REMOTE
        elif ameta[pskey]["status"] == ObjectStatus.CORRUPTED:
            # media is on the playout storage but corrupted
            istatus = ObjectStatus.CORRUPTED
        elif ameta[pskey]["status"] == ObjectStatus.ONLINE:
            if airstatus is not None:
                # media is on the playout storage and aired
                istatus = airstatus
                last_air = as_start
            else:
                # media is on the playout storage but not aired
                istatus = ObjectStatus.ONLINE
        else:
            istatus = ObjectStatus.UNKNOWN

        transfer_progress = -1 if asset and asset.id in pending_assets else None

        # duration, mark_in, mark_out = parse_durations(ameta, imeta)
        duration = item.duration
        mark_in = item.meta.get("mark_in")
        mark_out = item.meta.get("mark_out")

        # Append item to the result

        meta = {}
        if asset:
            for key in channel.rundown_columns:
                if (key in asset.meta) and (
                    key
                    not in [
                        "title",
                        "subtitle",
                        "id_asset",
                        "duration",
                        "status",
                        "mark_in",
                        "mark_out",
                    ]
                ):
                    meta[key] = asset.meta[key]

        id_asset = imeta.get("id_asset")
        primary = bool(event.get("id_asset") and (event["id_asset"] == id_asset))
        row = RundownRow(
            id=id_item,
            row_number=len(rows),
            type="item",
            scheduled_time=ts_scheduled,
            broadcast_time=ts_broadcast,
            run_mode=imeta.get("run_mode"),
            loop=imeta.get("loop"),
            item_role=imeta.get("item_role"),
            title=item["title"],
            subtitle=item["subtitle"],
            id_asset=id_asset,
            id_bin=id_bin,
            id_event=id_event,
            id_folder=asset["id_folder"] if asset else None,
            duration=duration,
            status=istatus,
            transfer_progress=transfer_progress,
            asset_mtime=ameta.get("mtime", 0),
            mark_in=mark_in,
            mark_out=mark_out,
            is_empty=False,
            is_primary=primary,
            meta=meta,
        )

        rows.append(row)

        # Update timestamps

        if row.run_mode != RunMode.RUN_SKIP:
            if not last_event.duration:
                last_event.broadcast_time = ts_broadcast
            ts_scheduled += duration
            if row.item_role not in ["placeholder", "lead_in", "lead_out"]:
                ts_broadcast += duration
            last_event.duration += duration
            last_event.is_empty = False

    elapsed = time.monotonic() - request_start_time
    msg = f"Rundown generated in {elapsed:.3f} seconds"

    return RundownResponseModel(rows=rows, detail=msg)

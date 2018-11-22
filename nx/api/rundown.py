#
# Returns a rundown for given day and channel
#
# Arguments:
#
# id_channel    Playout channel ID
#               Defaults to first playout channel
# start_time    Rundown start time (timestamp)
#               Defaults to today's broadcast day start
#

from nx import *

__all__ = ["get_rundown", "api_rundown"]


def get_rundown(id_channel, start_time=False, end_time=False, db=False):
    db = db or DB()
    if not start_time:
        # default today
        sh, sm = config["playout_channels"][id_channel].get("day_start", [6, 0])
        rundown_date = time.strftime("%Y-%m-%d", time.localtime(time.time()))
        rundown_start_time = datestr2ts(rundown_date, hh=sh, mm=sm)
        rundown_date = time.strftime("%Y-%m-%d", time.localtime(time.time()))
        start_time = datestr2ts(rundown_date, hh=sh, mm=sm)

    end_time = end_time or start_time + (3600 * 24)

    item_runs = get_item_runs(id_channel, start_time, end_time, db=db)

    db.query("""
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
                i.position ASC
            """, (id_channel, start_time, end_time))

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
            event.meta["rundown_broadcast"] = ts_broadcast = ts_broadcast or ts_scheduled

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
                    airstatus = AIRED
                else:
                    airstatus = ONAIR

            item.meta["asset_mtime"] = asset["mtime"] if asset else 0
            item.meta["rundown_scheduled"] = ts_scheduled
            item.meta["rundown_broadcast"] = ts_broadcast
            item.meta["rundown_difference"] = ts_broadcast - ts_scheduled
            if rundown_event_asset:
                item.meta["rundown_event_asset"] = rundown_event_asset

            istatus = 0
            if not asset:
                istatus = ONLINE
            elif airstatus:
                istatus = airstatus
            elif asset["status"] == OFFLINE:
                istatus = OFFLINE
            elif not pskey in asset.meta:
                istatus = REMOTE
            elif asset[pskey]["status"] == OFFLINE:
                istatus = REMOTE
            elif asset[pskey]["status"] == ONLINE:
                istatus = ONLINE
            elif asset[pskey]["status"] == CORRUPTED:
                istatus = CORRUPTED
            else:
                istatus = UNKNOWN

            item.meta["status"] = istatus

            ts_scheduled += item.duration
            ts_broadcast += item.duration

            event.items.append(item)



def api_rundown(**kwargs):
    user = kwargs.get("user", anonymous)
    id_channel = int(kwargs.get("id_channel", -1))
    start_time = kwargs.get("start_time", 0)

    if not (user.has_right("rundown_view", id_channel) or user.has_right("rundown_edit", id_channel)):
        return NebulaResponse(ERROR_ACCESS_DENIED)

    process_start_time = time.time()

    if not id_channel in config["playout_channels"]:
        return NebulaResponse(ERROR_BAD_REQUEST, "Invalid playout channel specified")

    rows = []
    i = 0
    for event in get_rundown(id_channel, start_time):
        row = event.meta
        row["object_type"] = "event"
        row["is_empty"] = len(event.items) == 0
        row["id_bin"] = event["id_magic"]
        rows.append(row)
        i+=1
        for item in event.items:
            row = item.meta
            row["object_type"] = "item"
            rows.append(row)
            i+=1

    process_time = time.time() - process_start_time
    return NebulaResponse(200, "Rundown loaded in {:.02f} seconds".format(process_time), data=rows)

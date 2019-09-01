import psycopg2

from nx import *

__all__ = ["api_schedule"]

def api_schedule(**kwargs):
    id_channel = kwargs.get("id_channel", 0)
    start_time = kwargs.get("start_time", 0)
    end_time = kwargs.get("end_time", 0)
    events = kwargs.get("events", []) # Events to add/update
    delete = kwargs.get("delete", []) # Event ids to delete
    db = kwargs.get("db", DB())
    user = kwargs.get("user", anonymous)
    initiator = kwargs.get("initiator", None)

    if not id_channel or id_channel not in config["playout_channels"]:
        return NebulaResponse(ERROR_BAD_REQUEST, "Unknown playout channel ID {}".format(id_channel))

    channel_config = config["playout_channels"][id_channel]
    changed_event_ids = []

    #
    # Delete events
    #

    for id_event in delete:
        if not user.has_right("scheduler_edit", id_channel):
            return NebulaResponse(ERROR_ACCESS_DENIED, "You are not allowed to edit this channel")
        event = Event(id_event, db=db)
        if not event:
            logging.warning("Unable to delete non existent event ID {}".format(id_event))
            continue
        try:
            event.bin.delete()
        except psycopg2.IntegrityError:
            return NebulaResponse(ERROR_LOCKED, "Unable to delete {}. Already aired.".format(event))
        else:
            event.delete()
        changed_event_ids.append(event.id)

    #
    # Create / update events
    #

    for event_data in events:
        if not user.has_right("scheduler_edit", id_channel):
            return NebulaResponse(ERROR_ACCESS_DENIED, "You are not allowed to edit this channel")
        id_event = event_data.get("id", False)

        db.query("SELECT meta FROM events WHERE id_channel=%s and start=%s", [id_channel, event_data["start"]])
        try:
            event_at_pos_meta = db.fetchall()[0][0]
            event_at_pos = Event(meta=event_at_pos_meta, db=db)
        except IndexError:
            event_at_pos = False

        if id_event:
            logging.debug("Updating event ID {}".format(id_event))
            event = Event(id_event, db=db)
            if not event:
                logging.warning("No such event id {}".format(id_event))
                continue
            pbin = event.bin
        elif event_at_pos:
            event = event_at_pos
            pbin = event.bin
        else:
            logging.debug("Creating new event")
            event = Event(db=db)
            pbin = Bin(db=db)
            pbin.save()
            logging.debug("Saved", pbin)
            event["id_magic"] = pbin.id
            event["id_channel"] = id_channel

        id_asset = event_data.get("id_asset", False)
        if id_asset and id_asset != event["id_asset"]:
            asset = Asset(id_asset, db=db)
            if asset:
                logging.info("Replacing event primary asset with {}".format(asset))
                pbin.delete_children()
                pbin.items = []

                item = Item(db=db)
                item["id_asset"] = asset.id
                item["position"] = 0
                item["id_bin"] = pbin.id
                item._asset = asset
                item.save()
                pbin.append(item)
                pbin.save()

                event["id_asset"] = asset.id
                for key in meta_types:
                    if meta_types[key]["ns"] != "m":
                        continue
                    if key in asset.meta:
                        event[key] = asset[key]

        for key in event_data:
            if key == "id_magic" and not event_data[key]:
                continue

            if key == "_items":
                for item_data in event_data["_items"]:
                    if not pbin.items:
                        start_pos = 0
                    else:
                        start_pos = pbin.items[-1]["position"]
                    try:
                        pos = int(item_data["position"])
                    except KeyError:
                        pos = 0
                    item = Item(meta=item_data, db=db)
                    item["position"] = start_pos + pos
                    item["id_bin"] = pbin.id
                    item.save()
                continue
            event[key] = event_data[key]

        changed_event_ids.append(event.id)
        event.save(notify=False)

    if changed_event_ids:
        messaging.send("objects_changed", objects=changed_event_ids, object_type="event", initiator=initiator)


    #
    # Return existing events
    #

    #TODO: ACL scheduler view

    result = []
    if start_time and end_time:
        logging.debug("Requested events of channel {} from {} to {}".format(
            id_channel,
            format_time(start_time),
            format_time(end_time)
            ))

        db.query("""
                SELECT e.meta, o.meta FROM events AS e, bins AS o
                WHERE
                    e.id_channel=%s
                    AND e.start > %s
                    AND e.start < %s
                    AND e.id_magic = o.id
                ORDER BY start ASC""",
                [id_channel, start_time, end_time]
            )
        res = db.fetchall()
        db.query("""
                SELECT e.meta, o.meta FROM events AS e, bins AS o
                WHERE
                    e.id_channel=%s
                    AND start <= %s
                    AND e.id_magic = o.id
                ORDER BY start DESC LIMIT 1""",
                [id_channel, start_time]
            )
        res = db.fetchall() + res

        for event_meta, alt_meta in res:
            ebin = Bin(meta=alt_meta, db=db)
            if "duration" in alt_meta.keys():
                event_meta["duration"] = ebin.duration
            result.append(event_meta)

    return NebulaResponse(200, data=result)

from nebulacore import *
from .connection import *
from .objects import *


def get_user(login, password, db=False):
    if not db:
        db = DB()
    db.query("SELECT meta FROM users WHERE login=%s AND password=%s", [login, get_hash(password)])
    res = db.fetchall()
    if not res:
        return False
    return User(meta=res[0][0])


def asset_by_path(id_storage, path, db=False):
    id_storage = str(id_storage)
    path = path.replace("\\", "/")
    if not db:
        db = DB()
    db.query("""
            SELECT id, meta FROM assets
                WHERE media_type = %s
                AND meta->>'id_storage' = %s
                AND meta->>'path' = %s
        """, [FILE, id_storage, path])
    for id, meta in db.fetchall():
        return Asset(meta=meta, db=db)
    return False


def asset_by_full_path(path, db=False):
    if not db:
        db = DB()
    for id_storage in storages:
        if path.startswith(storages[id_storage].local_path):
            return asset_by_path(id_storage, path.lstrip(storages[id_storage]["path"]), db=db)
    return False


def meta_exists(key, value, db=False):
    if not db:
        db = DB()
    db.query("SELECT id, meta FROM assets WHERE meta->>'%s' = '%s'", [key, value])
    for id, meta in db.fetchall():
        return Asset(meta=meta, db=db)
    return False


def get_day_events(id_channel, date, num_days=1):
    start_time = datestr2ts(date, *config["playout_channels"][id_channel].get("day_start", [6,0]))
    end_time = start_time + (3600*24*num_days)
    db = DB()
    db.query("SELECT id, meta FROM events WHERE id_channel=%s AND start > %s AND start < %s ", (id_channel, start_time, end_time))
    for id_event, meta in db.fetchall():
        yield Event(meta=meta)


def get_bin_first_item(id_bin, db=False):
    if not db:
        db = DB()
    db.query("SELECT id, meta FROM items WHERE id_bin=%s ORDER BY position LIMIT 1", [id_bin])
    for id, meta in db.fetchall():
        return Item(meta=meta, db=db)
    return False


def get_item_event(id_item, **kwargs):
    db = kwargs.get("db", DB())
    lcache = kwargs.get("cahce", cache)
    #TODO: Use db mogrify
    db.query("""SELECT e.id, e.meta FROM items AS i, events AS e WHERE e.id_magic = i.id_bin AND i.id = {} and e.id_channel in ({})""".format(
        id_item,
        ", ".join([str(f) for f in config["playout_channels"].keys()])
        ))
    for id, meta in db.fetchall():
        return Event(meta=meta, db=db)
    return False


def get_item_runs(id_channel, from_ts, to_ts, db=False):
    db = db or DB()
    db.query("SELECT id_item, start, stop FROM asrun WHERE start >= %s and start < %s ORDER BY start ASC", [int(from_ts), int(to_ts)] )
    result = {}
    for id_item, start, stop in db.fetchall():
        result[id_item] = (start, stop)
    return result


def get_next_item(item, **kwargs):
    db = kwargs.get("db", DB())
    if type(item) == int and item > 0:
        current_item = Item(item, db=db)
    elif isinstance(item, Item):
        current_item = item
    else:
        logging.error("Unexpected get_next_item argument {}".format(item))
        return False

    lcache = kwargs.get("cache", cache)
    logging.debug("Looking for item following {}".format(item))
    current_bin = Bin(current_item["id_bin"], db=db, cache=lcache)

    for item in current_bin.items:
        if item["position"] > current_item["position"]:
            if item["item_role"] == "lead_out":
                logging.info("Cueing Lead In")
                for i, r in enumerate(current_bin.items):
                    if r["item_role"] == "lead_in":
                        return r
                else:
                    next_item = current_bin.items[0]
                    next_item.asset
                    return next_item
            item.asset
            return item
    else:
        current_event = get_item_event(item.id, db=db, cache=lcache)
        db.query(
                "SELECT meta FROM events WHERE id_channel = %s and start > %s ORDER BY start ASC LIMIT 1",
                [current_event["id_channel"], current_event["start"]]
            )
        try:
            next_event = Event(meta=db.fetchall()[0][0], db=db, cache=lcache)
            if not next_event.bin.items:
                logging.debug("Next playlist is empty")
                raise Exception
            if next_event["run_mode"] and not kwargs.get("force_next_event", False):
                logging.debug("Next playlist run mode is not auto")
                raise Exception
            next_item = next_event.bin.items[0]
            next_item.asset
            return next_item
        except Exception:
            logging.info("Looping current playlist")
            next_item = current_bin.items[0]
            next_item.asset
            return next_item


def bin_refresh(bins, **kwargs):
    if not [b for b in bins if b]:
        return True
    db = kwargs.get("db", DB())
    sender = kwargs.get("sender", False)
    for id_bin in bins:
        b = Bin(id_bin, db=db)
        b.save()
        #cache.delete("2-" + str(id_bin))
    bq = ", ".join([str(b) for b in bins if b])
    changed_events = []
    db.query("""
            SELECT e.meta FROM events as e, channels AS c
            WHERE
                c.channel_type = 0 AND
                c.id = e.id_channel AND
                e.id_magic IN ({})
            """.format(bq)
        )
    for meta, in db.fetchall():
        event = Event(meta=meta, db=db)
        if event.id not in changed_events:
            changed_events.append(event.id)
    if changed_events:
        messaging.send(
                "objects_changed",
                sender=sender,
                objects=changed_events,
                object_type="event"
            )
    return True

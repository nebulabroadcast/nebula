import stat

from nebula import *
from nx.jobs import send_to

SCHEDULE_INTERVAL = 60
UNSCHEDULE_INTERVAL = 86400
DEFAULT_STATUS = {
        "status" : OFFLINE,
        "size" : 0,
        "mtime" : 0,
        "duration" : 0
        }


def get_scheduled_assets(id_channel, **kwargs):
    db = kwargs.get("db", DB())
    start = kwargs.get("start_time", time.time() - 3600*12)
    stop  = kwargs.get("end_time", time.time() + (3600*72))
    db.query("""
            SELECT DISTINCT(i.id_asset), a.meta FROM events as e, items as i, assets as a
            WHERE e.id_channel = %s
            AND a.id = i.id_asset
            AND e.start > %s
            AND e.start < %s
            AND i.id_bin = e.id_magic
            AND i.id_asset > 0""",
            [id_channel, start, stop]
        )
    for id, meta, in db.fetchall():
        yield Asset(meta=meta, db=db)


def check_file_validity(asset, id_channel):
    path = asset.get_playout_full_path(id_channel)
    try:
        res = mediaprobe(path)
    except:
        #log_traceback()
        logging.error("Unable to read", path)
        return CORRUPTED, 0
    if not res:
        return CORRUPTED, 0
    if res["duration"]:
        return CREATING, res["duration"]
    return UNKNOWN, 0


class PlayoutStorageTool(object):
    def __init__(self, id_channel, **kwargs):
        self.db = kwargs.get("db", DB())
        self.id_channel = id_channel
        self.playout_config = config["playout_channels"][id_channel]
        self.status_key = "playout_status/{}".format(self.id_channel)
        self.send_action = self.playout_config.get("send_action", False)
        self.scheduled_ids = []

    def __len__(self):
        return self.playout_config.get("playout_storage", 0) and self.playout_config.get("playout_path", 0)

    def main(self):
        db = self.db
        storage = storages[self.playout_config["playout_storage"]]
        if not storage:
            logging.debug("storage {} is not available".format(storage))
            return
        storage_path = storage.local_path

        for asset in get_scheduled_assets(self.id_channel, db=db):
            old_status = asset.get(self.status_key, DEFAULT_STATUS)

            # read playout file props
            try:
                fs = os.stat(asset.get_playout_full_path(self.id_channel))
                file_exists = stat.S_ISREG(fs[stat.ST_MODE])
            except FileNotFoundError:
                file_exists = False

            if file_exists:
                file_size = fs[stat.ST_SIZE]
                file_mtime = fs[stat.ST_MTIME]
            else:
                file_size = file_mtime = 0


            file_status = [OFFLINE, ONLINE][file_exists]

            ostatus = old_status.get("status", OFFLINE)
            omtime = old_status.get("mtime", 0)
            osize = old_status.get("size", 0)
            duration = old_status.get("duration", 0)

            now = time.time()

            # if file changed, check using ffprobe
            if omtime != file_mtime or osize != file_size:
                if file_exists:
                    file_status, duration = check_file_validity(asset, self.id_channel)
                else:
                    file_status = OFFLINE

            elif file_status == ONLINE:
                if ostatus == CREATING:
                    if now - file_mtime > 10 and omtime == file_mtime:
                        file_status = ONLINE
                    else:
                        file_status = CREATING
                elif ostatus == UNKNOWN:
                    if now - file_mtime > 10:
                        file_status = CORRUPTED


            if ostatus != file_status or omtime != file_mtime or osize != file_size:
                logging.info(
                        "Set {} playout status to {}".format(
                            asset,
                            get_object_state_name(file_status)
                        )
                    )
                asset[self.status_key] = {
                            "status" : file_status,
                            "size" : file_size,
                            "mtime" : file_mtime,
                            "duration" : duration
                        }
                asset.save()

            if file_status not in [ONLINE, CREATING] and self.send_action and asset["status"] == ONLINE:
                result = send_to(
                        asset.id,
                        self.send_action,
                        restart_existing=True,
                        restart_running=False,
                        db=db
                    )
                if result.response == 201:
                    logging.info("Sending {} to playout {} : {}".format(asset, self.playout_config["title"], result.message))



class Service(BaseService):
    def on_init(self):
        pass

    def on_main(self):
        db = DB()
        for id_channel in config["playout_channels"]:
            pst = PlayoutStorageTool(id_channel)
            pst.main()

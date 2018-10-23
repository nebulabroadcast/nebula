from nebula import *
from .ffprobe import FFProbe

probes = [
        FFProbe()
    ]

class Service(BaseService):
    def on_init(self):
        self.conds = []
        for cond in self.settings.findall("cond"):
            if cond is None:
                continue
            if not cond.text:
                continue
            x = eval("lambda asset: {}".format(cond.text))
            self.conds.append(x)

    def on_main(self):
        start_time = time.time()
        self.mounted_storages = []
        for id_storage in storages:
            storage_path = storages[id_storage].local_path
            if os.path.exists(storage_path) and len(os.listdir(storage_path)) != 0:
                self.mounted_storages.append(id_storage)

        db = DB()
        # do not scan trashed and archived files
        db.query("SELECT id, meta FROM assets WHERE media_type=%s AND status NOT IN (3, 4)", [FILE])
        i = 0
        for id, meta in db.fetchall():
            asset = Asset(meta=meta, db=db)
            self.process(asset)
            i += 1
            if i % 100 == 0 and config.get("debug_mode", False):
                logging.debug("{} files scanned".format(i))

        duration = time.time() - start_time
        if duration > 60 or config.get("debug_mode", False):
            logging.debug("Metadata scanned in {}".format(s2time(duration)))


    def process(self, asset):
        for cond in self.conds:
            if not cond(asset):
                return

        asset_file = FileObject(asset.file_path)
        id_storage = asset["id_storage"]
        if not id_storage:
            return
        if id_storage not in self.mounted_storages:
            logging.warning("Skipping unmounted storage {} of {}".format(asset["id_storage"], asset))
            return

        try:
            file_exists = asset_file.is_reg
        except IOError:
            file_exists = False

        if not file_exists:
            if asset["status"] in [ONLINE, RESET, CREATING]:
                logging.warning("{}: Turning offline (File does not exist)".format(asset))
                asset["status"] = OFFLINE
                asset.save()
            return

        fmtime = int(asset_file.mtime)
        fsize  = int(asset_file.size)

        if fsize == 0:
            if asset["status"] not in [OFFLINE, RETRIEVING]:
                logging.warning("{}: Turning offline (empty file)".format(asset))
                asset["status"] = OFFLINE
                asset.save()
            return


        if fmtime != asset["file/mtime"] or asset["status"] in [RESET, RETRIEVING]:
            try:
                f = asset_file.open("rb")
            except Exception:
                logging.debug("{} is not accessible (file creation in progress?)".format(asset))
                return
            else:
                f.seek(0,2)
                fsize = f.tell()
                f.close()

            if asset["status"] == RESET:
                asset.load_sidecar_metadata()

            # Filesize must be changed to update metadata automatically.
            # It sucks, but mtime only condition is.... errr doesn't work always

            if fsize == asset["file/size"] and asset["status"] not in [RESET, RETRIEVING]:
                logging.debug("{}: File mtime has been changed. Updating.".format(asset))
                asset["file/mtime"] = fmtime
                asset.save(set_mtime=False, notify=False)
            else:
                logging.info("{}: File size changed. Updating.".format(asset))

                keys = list(asset.meta.keys())
                for key in keys:
                    if meta_types[key]["ns"] in ("f", "q"):
                        del (asset.meta[key])

                asset["file/size"]  = fsize
                asset["file/mtime"] = fmtime
                asset["file/ctime"] = int(asset_file.ctime)

                for probe in probes:
                    if probe.accepts(asset):
                        logging.debug("{}: probing using {}".format(asset, probe))
                        result = probe(asset)
                        if result:
                            asset = result
                        elif asset["status"] != CREATING:
                            asset["status"] = CREATING
                            asset.save()
                            return
                        else:
                            return

                if asset["status"] == RESET:
                    asset["status"] = ONLINE
                    logging.info("{}: Reset completed".format(asset))
                else:
                    asset["status"] = CREATING
                asset.save()

        if asset["status"] == CREATING and asset["mtime"] + 15 > time.time():
            logging.debug("{}: Waiting for completion assurance.".format(asset))
            asset.save(set_mtime=False, notify=False)

        elif asset["status"] in (CREATING, OFFLINE):
            logging.goodnews("{}: Turning online".format(asset))
            asset["status"] = ONLINE
            asset["qc/state"] = 0
            asset.save()

            db = DB()
            db.query("""
                UPDATE jobs SET
                    status=5,
                    retries=0,
                    creation_time=%s,
                    start_time=NULL,
                    end_time=NULL,
                    message='Restarting after source update'
                WHERE
                    id_asset=%s
                    AND status IN (1,2,3,4)
                RETURNING id
                """,
                    [time.time(), asset.id]

                )
            res = db.fetchall()
            if res:
                logging.info("{}: Changed. Restarting jobs {}".format(asset, ", ".join([str(l[0]) for l in res])))
            db.commit()

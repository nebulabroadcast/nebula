from nebula import *
from .ffprobe import FFProbe

probes = [
        FFProbe()
    ]

class Service(BaseService):
    def on_init(self):
        self.conds = []
        rou = self.settings.attrib.get("restart_on_update", "all")
        if rou.lower() == "all":
            self.restart_on_update = "all"
        elif all([k.strip().isdigit() for k in rou.split(",")]):
            self.restart_on_update = [int(k.strip()) for k in rou.split(",")]
        else:
            self.restart_on_update = None
        logging.debug(f"Following actions will be restarted on source update: {self.restart_on_update}")

        for cond in self.settings.findall("cond"):
            if cond is None:
                continue
            if not cond.text:
                continue
            x = eval(f"lambda asset: {cond.text}")
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
                logging.debug(f"{i} files scanned")

        duration = time.time() - start_time
        if duration > 60 or config.get("debug_mode", False):
            logging.debug(f"Metadata scanned in {s2time(duration)}")


    def process(self, asset):
        for cond in self.conds:
            if not cond(asset):
                return

        asset_file = FileObject(asset.file_path)
        id_storage = asset["id_storage"]
        if not id_storage:
            return
        if id_storage not in self.mounted_storages:
            logging.warning(f"Skipping unmounted storage {asset["id_storage"]} of {asset}")
            return

        try:
            file_exists = asset_file.is_reg
        except IOError:
            file_exists = False

        if not file_exists:
            if asset["status"] in [ONLINE, RESET, CREATING]:
                logging.warning(f"{asset}: Turning offline (File does not exist)")
                asset["status"] = OFFLINE
                asset.save()
            return

        fmtime = int(asset_file.mtime)
        fsize  = int(asset_file.size)

        if fsize == 0:
            if asset["status"] not in [OFFLINE, RETRIEVING]:
                logging.warning(f"{asset}: Turning offline (empty file)")
                asset["status"] = OFFLINE
                asset.save()
            return


        if fmtime != asset["file/mtime"] or asset["status"] in [RESET, RETRIEVING]:
            try:
                f = asset_file.open("rb")
            except Exception:
                logging.debug(f"{asset} is not readable (transfer in progress?)")
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
                logging.debug(f"{asset}: File mtime has been changed. Updating metadata.")
                asset["file/mtime"] = fmtime
                asset.save(set_mtime=False, notify=False)
            elif fsize != asset["file/size"] or asset["status"] in [RESET, RETRIEVING]:
                if asset["status"] in [RESET, RETRIEVING]:
                    logging.info(f"{asset}: Metadata reset requested. Updating metadata.")
                else:
                    logging.info(f"{asset}: File has been changed. Updating metadata.")

                keys = list(asset.meta.keys())
                for key in keys:
                    if meta_types[key]["ns"] in ("f", "q"):
                        del (asset.meta[key])

                asset["file/size"]  = fsize
                asset["file/mtime"] = fmtime
                asset["file/ctime"] = int(asset_file.ctime)
                asset.save()

                for probe in probes:
                    if probe.accepts(asset):
                        logging.debug(f"{asset}: probing using {probe}")
                        result = probe(asset)
                        if result:
                            asset = result
                        elif asset["status"] != CREATING:
                            asset["status"] = CREATING
                            return
                        else:
                            return

                if asset["status"] == RESET:
                    asset["status"] = ONLINE
                    logging.info(f"{asset}: Metadata reset completed")
                else:
                    asset["status"] = CREATING
                asset.save()

        if asset["status"] == CREATING and asset["mtime"] + 15 > time.time():
            logging.debug(f"{asset}: Waiting for completion assurance")
            asset.save(set_mtime=False, notify=False)

        elif asset["status"] in (CREATING, OFFLINE):
            logging.goodnews(f"{asset}: Turning online")
            asset["status"] = ONLINE
            asset["qc/state"] = 0
            asset.save()

            if self.restart_on_update:
                if type(self.restart_on_update) == list:
                    action_cond = "AND id_action in ({})".format(",".join(self.restart_on_update))
                else:
                    action_cond = ""
                db = DB()
                db.query("""
                    UPDATE jobs SET
                        status=5,
                        retries=0,
                        progress=0,
                        creation_time=%s,
                        start_time=NULL,
                        end_time=NULL,
                        id_service=NULL,
                        message='Restarting after source update'
                    WHERE
                        id_asset=%s
                        AND status IN (1,2,3,4,6)
                        {}
                    RETURNING id
                    """.format(action_cond),
                        [time.time(), asset.id]

                    )
                res = db.fetchall()
                if res:
                    logging.info("{}: Changed. Restarting jobs {}".format(asset, ", ".join([str(l[0]) for l in res])))
                db.commit()

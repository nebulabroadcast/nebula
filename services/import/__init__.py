import uuid

from nx import *
from nx.services import BaseService
from nx.objects import *
from nx.common.filetypes import file_types

from themis import Themis


def temp_file(id_storage, ext):
    if id_storage:
        temp_path = os.path.join(storages[id_storage].local_path,".nx", "creating")
    else:
        temp_path = "/tmp/nx"

    if not os.path.exists(temp_path):
        try:
            os.makedirs(temp_path)
        except:
            return False

    temp_name = str(uuid.uuid1()) + ext
    return os.path.join(temp_path, temp_name)


class Service(BaseService):
    def on_init(self):
        ## TODO: Load this from service settings
        self.import_storage = 1
        self.import_dir = "import.dir"
        self.backup_dir = "backup.dir"
        self.identifier = "identifier/main"
        self.condition = "asset['origin'] == 'Production'"
        self.containers = ["."+f for f in file_types.keys() if file_types[f] == VIDEO]
        self.versioning = True
        self.profile = {
            "fps" : 25,
            "loudness" : -23.0,
            "container" : "mov",
            "width" : 1920,
            "height" : 1080,
            "pixel_format" : "yuv422p",
            "video_codec" : "dnxhd",
            "video_bitrate" : "36M",
            "audio_codec" : "pcm_s16le",
            "audio_sample_rate" : 48000
        }


        self.filesizes = {}
        self.import_path = os.path.join(storages[self.import_storage].local_path, self.import_dir)
        self.backup_path = os.path.join(storages[self.import_storage].local_path, self.backup_dir)


    def on_main(self):
        if not self.import_path:
            return

        if not os.path.exists(self.import_path):
            logging.error("Import directory does not exist. Shutting down service.")
            self.import_path = False
            self.shutdown(no_restart=True)
            return

        db = DB()

        for fname in os.listdir(self.import_path):

            if not os.path.splitext(fname)[1].lower() in self.containers:
                continue

            idec = os.path.splitext(fname)[0]
            fpath = os.path.join(self.import_path, fname)

            try:
                f = open(fpath,"rb")
            except:
                logging.debug("File creation in progress. {}".format(fname))
                continue

            f.seek(0,2)
            fsize = f.tell()
            f.close()

            if not (fname in self.filesizes.keys() and self.filesizes[fname] == fsize):
                self.filesizes[fname] = fsize
                logging.debug("New file {} detected (or file has been changed)".format(fname))
                continue

            db.query("SELECT id_object FROM nx_meta WHERE object_type = 0 AND tag=%s AND value=%s", [self.identifier, idec])
            for id_asset, in db.fetchall():
                asset = Asset(id_asset, db=db)

                if not eval(self.condition):
                    continue

                if not (asset["id_storage"] and asset["path"]):
                    self.mk_error(fname, "This file has no target path specified.")
                    continue

                self.do_import(fname, asset)
                break
            else:
                self.mk_error(fname, "This file is not expected.")


        for fname in os.listdir(self.import_path):
            if not fname.endswith(".error.txt"):
                continue
            idec = fname.replace(".error.txt", "")
            if not idec in [os.path.splitext(f)[0] for f in os.listdir(self.import_path)]:
                os.remove(os.path.join(self.import_path, fname))


    def mk_error(self, fname, message):
        fn = os.path.splitext(fname)[0] + ".error.txt"
        fn = os.path.join(self.import_path, fn)
        try:
            old_message = open(fn).read()
        except:
            old_message = ""

        if old_message != message:
            f = open(fn, "w")
            f.write(message)
            f.close()

            logging.error("{} : {}".format(fname, message))


    def version_backup(self, asset):
        target_path = os.path.join(
            storages[asset["id_storage"]].local_path,
            ".nx",
            "versions",
            "{:04d}".format(int(asset.id/1000)),
            "{:d}".format(asset.id)
            )

        target_fname = "{:d}{}".format(
            int(asset["mtime"]),
            os.path.splitext(asset.file_path)[1]
            )

        try:
            os.makedirs(target_path)
        except:
            pass

        try:
            os.rename(asset.file_path, os.path.join(target_path, target_fname))
        except:
            logging.warning("Unable to create version backup of {}".format(asset))









    def do_import(self, fname, asset):
        logging.info("Importing {}".format(asset))

        #
        # Remove / backup old file
        #

        if os.path.exists(asset.file_path):
            if self.versioning and os.path.exists(asset.file_path):
                self.version_backup(asset)

            if os.path.exists(asset.file_path):
                try:
                    os.remove(asset.file_path)
                except:
                    mk_error(fname, "Unable to remove previous version of the file.")
                    return False

            asset["status"] = OFFLINE
            asset["qc/state"] = 0
            asset.save()

        #
        # Process
        #

        tempfile = temp_file(asset["id_storage"], os.path.splitext(asset["path"])[1])

        try:
            open(tempfile,"w")
        except:
            self.mk_error(fname, "Unable to open target for writing")
            return False

        themis = Themis(
            os.path.join(self.import_path, fname),
            **self.profile
            )

        if not themis.process(output_path=tempfile):
            self.mk_error(fname, "Unable to import. Check log for more details")
            return False

        try:
            os.rename(tempfile, asset.file_path)
        except:
            mk_error(fname, "Unable to move converted file to it's destination")
            return False

        #
        # Backup original source file
        #

        if os.path.exists(os.path.join(self.import_path, fname)):
            logging.debug("Creating import file backup")
            try:
                os.remove(os.path.join(self.backup_path, fname))
            except:
                pass

            os.rename(os.path.join(self.import_path, fname), os.path.join(self.backup_path, fname) )

        try:
            os.remove(os.path.join(self.import_path, os.path.splitext(fname)[0] + ".error.txt"))
        except:
            pass

        logging.goodnews("Import {} completed".format(asset))

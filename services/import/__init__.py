import os

from nxtools import logging, log_traceback, get_temp, get_files

from nx.db import DB
from nx.core.common import storages
from nx.core.enum import ObjectStatus, ContentType
from nx.core.metadata import meta_types
from nx.mediaprobe import mediaprobe
from nx.base_service import BaseService
from nx.objects import Asset
from nx.filetypes import FileTypes

from .themis import Themis


def temp_file(id_storage, ext):
    temp_dir = os.path.join(storages[id_storage].local_path, ".nx", "creating")
    if not os.path.isdir(temp_dir):
        try:
            os.makedirs(temp_dir)
        except Exception:
            log_traceback()
            return False
    return get_temp(ext, temp_dir)


def mk_error(fname, message):
    log_file_path = os.path.splitext(fname.path)[0] + ".error.txt"
    try:
        old_message = open(log_file_path).read()
    except Exception:
        old_message = ""
    if old_message != message:
        logging.error("{} : {}".format(fname.base_name, message))
        with open(log_file_path, "w") as f:
            f.write(message)


def version_backup(asset):
    target_dir = os.path.join(
        storages[asset["id_storage"]].local_path,
        ".nx",
        "versions",
        f"{int(asset.id/1000):04d}",
        f"{asset.id:d}",
    )

    ext = os.path.splitext(asset.file_path)[1]
    target_fname = f"{asset['mtime']:d}{ext}"

    if not os.path.isdir(target_dir):
        try:
            os.makedirs(target_dir)
        except IOError:
            pass
    try:
        os.rename(asset.file_path, os.path.join(target_dir, target_fname))
    except IOError:
        log_traceback()
        logging.warning(f"Unable to create version backup of {asset}")


def do_import(parent, import_file, asset):
    probe = mediaprobe(import_file)
    match = True
    for condition in parent.conditions:
        value = parent.conditions[condition]
        if value != probe.get(condition, None):
            match = False
            break

    if match:
        logging.info(f"Fast importing {import_file} to {asset}")
        try:
            os.rename(import_file.path, asset.file_path)
        except Exception:
            log_traceback()
            mk_error(import_file, "Unable to fast import. See logs.")
            return False
    else:
        logging.info(f"Importing {import_file} to {asset}")

        try:
            themis = Themis(
                import_file,
                use_temp_file=False,
            )
        except Exception:
            mk_error(import_file, "Import failed (Unable to read source file)")
            return False

        themis.add_output(asset.file_path, **parent.profile)

        if themis.start():
            backup_dir = os.path.join(
                storages[parent.import_storage].local_path,
                parent.backup_dir,
            )
            try:
                if not os.path.isdir(backup_dir):
                    os.makedirs(backup_dir)
            except Exception:
                logging.error("Unable to create backup directory")
                os.remove(import_file.path)
            else:
                backup_path = os.path.join(
                    backup_dir, os.path.basename(asset.file_path)
                )
                logging.debug(f"Creating backup of {asset} to {backup_path}")
                if os.path.exists(backup_path):
                    os.remove(backup_path)
                os.rename(import_file.path, backup_path)
            logging.goodnews(f"{asset} imported")
        else:
            logging.error(f"{asset} import failed")
            mk_error(import_file, "Import failed")

    allkeys = list(asset.meta)
    for key in allkeys:
        if meta_types[key]["ns"] in ["q", "f"]:
            del asset.meta[key]
    asset["status"] = ObjectStatus.CREATING

    asset.save()

    logging.goodnews(f"Import {asset} finished")


class Service(BaseService):
    def on_init(self):
        # TODO: Load this from service settings

        try:
            self.import_storage = int(self.settings.find("id_storage").text)
            self.import_dir = self.settings.find("import_dir").text
            self.backup_dir = self.settings.find("backup_dir").text
        except Exception:
            logging.error(
                "Storage, import and backup directories "
                "must be specified. Shutting down"
            )
            self.shutdown(True)

        try:
            self.identifier = self.settings.find("identifier").text
        except Exception:
            self.identifier = "id/main"

        self.exts = FileTypes.exts_by_type(ContentType.VIDEO)
        self.versioning = True

        self.conditions = {}
        conditions = self.settings.find("fast_import_conditions")
        if conditions is not None:
            for param in conditions.findall("param"):
                self.conditions[param.attrib["name"]] = eval(param.text)

        profile = self.settings.find("profile")
        self.profile = {}
        if profile is None:
            logging.error("No profile is defined. Shutting down")
            self.shutdown(True)
        for param in profile.findall("param"):
            self.profile[param.attrib["name"]] = eval(param.text)

        self.filesizes = {}
        import_storage_path = storages[self.import_storage].local_path
        self.import_dir = os.path.join(import_storage_path, self.import_dir)
        self.backup_dir = os.path.join(import_storage_path, self.backup_dir)

    def on_main(self):
        if not self.import_dir:
            return

        if not os.path.isdir(self.import_dir):
            logging.error("Import directory does not exist. Shutting down.")
            self.import_path = False
            self.shutdown(no_restart=True)
            return

        db = DB()
        for import_file in get_files(self.import_dir, exts=self.exts):
            idec = import_file.base_name
            try:
                with import_file.open("rb") as f:
                    f.seek(0, 2)
                    fsize = f.tell()
            except IOError:
                logging.debug(f"Import file {import_file.base_name} is busy.")
                continue

            if not (
                import_file.path in self.filesizes
                and self.filesizes[import_file.path] == fsize
            ):
                self.filesizes[import_file.path] = fsize
                logging.debug(f"New file '{import_file.base_name}' detected")
                continue

            db.query(
                """
                SELECT meta FROM assets
                WHERE meta->>%s = %s
                """,
                [self.identifier, idec],
            )
            for (meta,) in db.fetchall():
                asset = Asset(meta=meta, db=db)

                if not (asset["id_storage"] and asset["path"]):
                    mk_error(import_file, "This file has no target path.")
                    continue

                if self.versioning and os.path.exists(asset.file_path):
                    version_backup(asset)

                do_import(self, import_file, asset)
                break
            else:
                mk_error(import_file, "This file is not expected.")

        for fname in os.listdir(self.import_dir):
            if not fname.endswith(".error.txt"):
                continue
            idec = fname.replace(".error.txt", "")
            if idec not in [
                os.path.splitext(f)[0] for f in os.listdir(self.import_dir)
            ]:
                os.remove(os.path.join(self.import_dir, fname))

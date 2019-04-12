from nebula import *

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

    logging.goodnews("Import transcoding {} completed".format(asset))

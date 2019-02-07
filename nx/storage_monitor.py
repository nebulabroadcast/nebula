import time

from nebulacore import *

from .agents import BaseAgent

__all__ = ["StorageMonitor"]

# id_storage: is_alive, check_interval, last_check
storage_status = {k : [True, 2, 0] for k in storages}


class StorageMonitor(BaseAgent):
    def main(self):
        storages_conf = config.get("storages", "all")
        for id_storage in storages:
            if type(storages_conf) == list and id_storage not in storages_conf:
                continue
            storage = storages[id_storage]

            if storage:
                storage_string = "{}:{}".format(config["site_name"], storage.id)
                storage_ident_path = os.path.join(storage.local_path,".nebula_root")

                if not (os.path.exists(storage_ident_path) and storage_string in [line.strip() for line in open(storage_ident_path).readlines()]):
                    try:
                        f = open(storage_ident_path, "a")
                        f.write(storage_string+"\n")
                        f.close()
                    except Exception:
                        if self.first_run:
                            logging.warning ("{} is mounted, but read only".format(storage))
                    else:
                        if self.first_run:
                            logging.info ("{} is mounted and root is writable".format(storage))
                continue

            s,i,l = storage_status[id_storage]
            if not s and time.time() - l < i:
                continue

            if s:
                logging.info ("{} is not mounted. Mounting...".format(storage))
            if not os.path.exists(storage.local_path):
                try:
                    os.mkdir(storage.local_path)
                except:
                    if s:
                        logging.error("Unable to create mountpoint for {}".format(storage))
                    storage_status[id_storage] = [False, 240, time.time()]
                    continue

            self.mount(storage)

            if ismount(storage.local_path):
                logging.goodnews("{} mounted successfully".format(storage))
                storage_status[id_storage][0] = True
                storage_status[id_storage][1] = 2
            else:
                if s:
                    logging.error("{} mounting failed".format(storage))
                storage_status[id_storage][0] = False
                check_interval = storage_status[id_storage][1]
                storage_status[id_storage][1] = min(240, check_interval*2)

            storage_status[id_storage][2] = time.time()


    def mount(self, storage):
        if storage["protocol"] == "samba":
            smbopts = {}
            if storage.get("login"):
                smbopts["user"] = storage["login"]
            if storage.get("password"):
                smbopts["pass"] = storage["password"]
            smbver = storage.get("samba_version", "3.0")
            if smbver:
                smbopts["vers"] = smbver

            host = storage["path"].split("/")[2]
            executable = "mount.cifs"
            if smbopts:
                opts = " -o '{}'".format(",".join(
                        ["{}={}".format(k, smbopts[k]) for k in smbopts]
                    ))
            else:
                opts = ""

            cmd = "mount.cifs {} {}{}".format(storage["path"], storage.local_path, opts)


        elif protocol == NFS:
            executable = "mount.nfs"
            cmd = "mount.nfs {} {}".format(storage["path"], storage.local_path)


        else:
            return
        c = Shell(cmd)
        if c.retcode:
            logging.debug(executable, ":", c.stderr().read().strip())


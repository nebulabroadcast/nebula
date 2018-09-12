import time
import psutil

from nebulacore import *

from .connection import *
from .agents import BaseAgent

__all__ = ["SystemMonitor"]


def update_host_info():
    hostname = config["host"]
    mem = psutil.virtual_memory()
    swp = psutil.swap_memory()
    stor = []
    for id_storage in storages:
        storage = storages[id_storage]
        usage = psutil.disk_usage(storage.local_path)
        stor.append({
                "id" : id_storage,
                "title": storage.title,
                "total" : usage.total,
                "free" : usage.free,
            })

    status = {
            "cpu" : psutil.cpu_percent(),
            "mem" : [mem.total, mem.free],
            "swp" : [swp.total, swp.free],
            "stor" : stor
        }

    db = DB()
    db.query(
            "UPDATE hosts SET last_seen=%s, status=%s WHERE hostname=%s",
            [time.time(), json.dumps(status), hostname]
        )
    db.commit()



class SystemMonitor(BaseAgent):
    def on_init(self):
        self.last_update = 0
        db = DB()
        try:
            db.query("INSERT INTO hosts(hostname, last_seen) VALUES (%s, %s)", [config["host"], time.time()])
        except IntegrityError:
            pass
        else:
            db.commit()

    def on_shutdown(self):
        pass

    def main(self):
        messaging.send("heartbeat")
        if time.time() - self.last_update > 5:
            update_host_info()
            self.last_update = time.time()

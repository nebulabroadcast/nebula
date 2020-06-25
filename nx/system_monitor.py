import os
import time
import psutil
import subprocess

from nebulacore import *

from .connection import *
from .agents import BaseAgent

__all__ = ["SystemMonitor"]

BOOT_TIME = psutil.boot_time()
NEBULA_START_TIME = time.time()

SMI_PATH = None
SMI_PATHS = [
        "c:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe",
        "/usr/bin/nvidia-smi",
        "/usr/local/bin/nvidia-smi"
    ]

for f in SMI_PATHS:
    if os.path.exists(f):
        SMI_PATH = f

def get_gpu_stats(smi_path, request_modes=["utilization"]):
    try:
        rawdata = subprocess.check_output([smi_path, "-q", "-d", "utilization"])
    except Exception:
        log_traceback()
        return {}

    rawdata = rawdata.decode("utf-8")

    modes = [
            ["Utilization",  "utilization"],
            ["GPU Utilization Samples", "gpu-samples"],
            ["Memory Utilization Samples", "mem-samples"],
            ["ENC Utilization Samples", "enc-samples"],
            ["DEC Utilization Samples", "dec-samples"],
        ]
    result = []
    gpu_id = -1
    current_mode = False
    gpu_stats = {}
    for line in rawdata.split("\n"):
        if line.startswith("GPU"):
            if gpu_id > -1:
                result.append(gpu_stats)

            gpu_stats = {"id" : line.split(" ")[1].strip()}
            gpu_id += 1
        for m, mslug in modes:
            if line.startswith((" "*4) + m):
                current_mode = mslug
                break

        if current_mode in request_modes and line.startswith(" "*8):
            key, value = line.strip().split(":")
            key = key.strip()
            try:
                value = float(value.strip().split(" ")[0])
            except:
                value = 0
            if current_mode not in gpu_stats:
                gpu_stats[current_mode] = {}
            gpu_stats[current_mode][key.lower()] =  value

    if gpu_id > -1:
        result.append(gpu_stats)

    return result


def update_host_info():
    hostname = config["host"]
    mem = psutil.virtual_memory()
    swp = psutil.swap_memory()
    stor = []
    for id_storage in storages:
        storage = storages[id_storage]
        if not storage:
            continue
        usage = psutil.disk_usage(storage.local_path)
        stor.append({
                "id" : id_storage,
                "title": storage.title,
                "total" : usage.total,
                "free" : usage.free,
            })

    root_fs = psutil.disk_usage("/")
    status = {
            "cpu" : psutil.cpu_percent(),
            "mem" : [mem.total, mem.available],
            "swp" : [swp.total, swp.free],
            "rfs" : [root_fs.total, root_fs.free],
            "stor" : stor,
            "boot_time" : BOOT_TIME,
            "start_time" : NEBULA_START_TIME,
        }

    if SMI_PATH:
        status["gpu"] = get_gpu_stats(SMI_PATH)

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
            try:
                update_host_info()
            except Exception:
                log_traceback("Unable to update host info")
            self.last_update = time.time()

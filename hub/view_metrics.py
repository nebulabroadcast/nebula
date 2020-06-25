from nebula import *
from cherryadmin.stats import *
from cherryadmin import CherryAdminRawView

def render_metric(name, value, **tags):
    result = "nebula_"
    tags["site_name"] = config["site_name"]
    result += name + "{"
    result += ", ".join(["{}=\"{}\"".format(k, tags[k]) for k in tags ])
    result += "}"
    result += " " + str(value) + "\n"
    return result


class ViewMetrics(CherryAdminRawView):
    def auth(self):
        return True

    def build(self, *args, **kwargs):
        db = DB()
        stor = {}
        cpu = []
        mem = []
        swp = []
        rfs = []
        gpu = []
        boot_times = []
        run_times = []
        last_seens = []
        db.query("SELECT hostname, last_seen, status FROM hosts")
        for hostname, last_seen, status in db.fetchall():
            last_seens.append([hostname, max(0, int(time.time() - last_seen))])
            if "boot_time" in status:
                boot_times.append([hostname, int(time.time() - status["boot_time"])])
            if "run_time" in status:
                run_times.append([hostname, int(time.time() - status["run_time"])])
            if "cpu" in status:
                cpu.append([hostname, status["cpu"]])
            if status.get("mem", [0,0])[0]:
                mem.append([hostname, status["mem"][0], status["mem"][1]])
            if status.get("swp", [0,0])[0]:
                swp.append([hostname, status["swp"][0], status["swp"][1]])
            if status.get("rfs", [0,0])[0]:
                rfs.append([hostname, status["rfs"][0], status["rfs"][1]])
            if status.get("gpu", None):
                gpu.append([hostname, status["gpu"]])

            for storage in status.get("stor",[]):
                if storage["id"] in stor:
                    continue
                stor[storage["id"]] = storage["title"], storage["total"], storage["free"]


        result = ""
        for hostname, value in boot_times:
            result += render_metric("uptime_seconds", value, hostname=hostname)

        for hostname, value in run_times:
            result += render_metric("runtime_seconds", value, hostname=hostname)

        for hostname, value in last_seens:
            result += render_metric("inactive_seconds", value, hostname=hostname)

        for hostname, value in cpu:
            result += render_metric("cpu_usage", value, hostname=hostname)

        for hostname, total, free in mem:
            usage = round(100*((total-free)/total), 3)
            result += render_metric("memory_bytes_total", total, hostname=hostname)
            result += render_metric("memory_bytes_free", free, hostname=hostname)
            result += render_metric("memory_usage", usage, hostname=hostname)

        for hostname, total, free in swp:
            usage = round(100*((total-free)/total), 3)
            result += render_metric("swap_bytes_total", total, hostname=hostname)
            result += render_metric("swap_bytes_free", free, hostname=hostname)
            result += render_metric("swap_usage", usage, hostname=hostname)

        for hostname, total, free in rfs:
            usage = round(100*((total-free)/total), 3)
            result += render_metric("rootfs_bytes_total", total, hostname=hostname)
            result += render_metric("rootfs_bytes_free", free, hostname=hostname)
            result += render_metric("rootfs_usage", usage, hostname=hostname)

        for id_storage in stor:
            title, total, free = stor[id_storage]
            usage = round(100*((total-free)/total), 3)
            result += render_metric("storage_bytes_total", total, id=id_storage, title=title)
            result += render_metric("storage_bytes_free", free, id=id_storage, title=title)
            result += render_metric("storage_usage", usage, id=id_storage, title=title)

        for hostname, gpustat in gpu:
            for i, g in enumerate(gpustat):
                usage = g["utilization"]
                result += render_metric("gpu_usage", usage["gpu"], gpu_id=i, hostname=hostname)
                result += render_metric("gpu_memory", usage["memory"], gpu_id=i, hostname=hostname)
                result += render_metric("gpu_encoder", usage["encoder"], gpu_id=i, hostname=hostname)
                result += render_metric("gpu_decoder", usage["decoder"], gpu_id=i, hostname=hostname)

        for user in request_stats:
            for method in request_stats[user]:
                result += render_metric("api_requests", request_stats[user][method], user=user, method=method)


        db.query("select status, count(status) from jobs group by status;")
        for status, count in db.fetchall():
            status_label = [
                        "Pending",
                        "In progress",
                        "Completed",
                        "Failed",
                        "Aborted",
                        "Restart",
                        "Skipped"
                    ][status]
            result += render_metric("jobs", count, status=status, status_label=status_label)


        db.query("SELECT id, service_type, host, title, autostart, state, last_seen FROM services")
        for id, stype, hostname, title, autostart, state, last_seen in db.fetchall():
            inactive = max(0,int(time.time() - last_seen))
            result += render_metric("service_state", state, hostname=hostname, id=id, title=title, service_type=stype)
            result += render_metric("service_inactive_seconds", inactive, hostname=hostname, id=id, title=title, service_type=stype)


        self.is_raw = True
        self.body = result
        self["mime"] = "text/txt"



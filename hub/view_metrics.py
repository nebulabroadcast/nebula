from nebula import *

from cherryadmin import CherryAdminRawView
from cherryadmin.stats import *
from promexp.metrics import Metrics


class ViewMetrics(CherryAdminRawView):
    def auth(self):
        return True

    def build(self, *args, **kwargs):
        db = DB()
        db.query("SELECT hostname, last_seen, status FROM hosts")

        metrics = Metrics()

        for hostname, last_seen, status in db.fetchall():
            metrics.add("inactive_seconds", time.time() - last_seen)
            for name, tags, value in status.get("metrics", []):
                if not name.startswith("shared_"):
                    tags["hostname"] = hostname
                metrics.add(name, value, **tags)

        for user in request_stats:
            for method in request_stats[user]:
                metrics.add("api_requests", request_stats[user][method], user=user, method=method)


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
            metrics.add("jobs", count, status=status, status_label=status_label)


        db.query("SELECT id, service_type, host, title, autostart, state, last_seen FROM services")
        for id, stype, hostname, title, autostart, state, last_seen in db.fetchall():
            inactive = max(0,int(time.time() - last_seen))
            metrics.add("service_state", state, hostname=hostname, id=id, title=title, service_type=stype)
            metrics.add("service_inactive_seconds", inactive, hostname=hostname, id=id, title=title, service_type=stype)


        self.is_raw = True
        self.body = metrics.render(prefix="nebula", site_name=config["site_name"])
        self["mime"] = "text/txt"



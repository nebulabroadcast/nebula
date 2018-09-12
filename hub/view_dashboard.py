from nebula import *
from cherryadmin import CherryAdminView

class ViewDashboard(CherryAdminView):
    def build(self, *args, **kwargs):
        self["name"] = "dashboard"
        self["title"] = "Dashboard"
        self["js"] = [
                "/static/js/dashboard.js"
            ]

        #
        # Hosts information (node status)
        #

        storage_info = {}

        db = DB()
        hosts = {}
        db.query("SELECT hostname, last_seen, status FROM hosts ORDER BY hostname ASC")
        for hostname, last_seen, status in db.fetchall():
            host_info = {
                    "last_seen" : last_seen,
                    "cpu" : status["cpu"],
                    "mem_total" : status["mem"][0],
                    "mem_free" : status["mem"][1],
                    "swp_total" : status["swp"][0],
                    "swp_free" : status["swp"][1]
                }

            hosts[hostname] = host_info
            if not storage_info:
                storage_info = status["stor"]

        self["hosts"] = hosts
        self["storages"] = storage_info

        #
        # MAM statistics
        #

        object_counts = {}
        for obj_type in  ["assets", "items", "bins", "events"]:
            db.query("SELECT COUNT(id) FROM {}".format(obj_type))
            object_counts[obj_type] = db.fetchall()[0][0]

        self["object_counts"] = object_counts


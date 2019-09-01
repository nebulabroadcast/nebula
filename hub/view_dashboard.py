import cherrypy

from nebula import *
from cherryadmin import CherryAdminView

from hub.view_tool import ViewTool

class ViewDashboard(CherryAdminView):
    def build(self, *args, **kwargs):

        #
        # If user has custom dashboard, load webtool plugin
        #

        custom_dash = self["user"]["dashboard"]

        if custom_dash:
            try:
                Plugin, title = self["site"]["webtools"].tools[custom_dash]
            except KeyError:
                raise cherrypy.HTTPError(404, "No such tool {}".format(custom_dash))

            try:
                args = args[1:]
            except IndexError:
                args = []
            plugin = Plugin(self, custom_dash)
            self["title"] = title
            self.view="tool"

            body = plugin.build(*args, **kwargs)
            if plugin.native:
                self.is_raw = False
                self["body"] = body
            else:
                self.is_raw = True
                self.body = body
            return

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
                    "swp_free" : status["swp"][1],
                    "root_total" : status["rfs"][0],
                    "root_free" : status["rfs"][1],
                }

            hosts[hostname] = host_info
            if not storage_info:
                storage_info = status["stor"]

        #
        # MAM statistics
        #

        object_counts = {}
        for obj_type in  ["assets", "items", "bins", "events"]:
            db.query("SELECT COUNT(id) FROM {}".format(obj_type))
            object_counts[obj_type] = db.fetchall()[0][0]


        self["name"] = "dashboard"
        self["title"] = "Dashboard"
        self["js"] = [] # ["/static/js/dashboard.js"]
        self["hosts"] = hosts
        self["storages"] = storage_info
        self["object_counts"] = object_counts

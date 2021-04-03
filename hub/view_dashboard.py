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

        tagmap = {
                "cpu_usage" : "cpu",
                "memory_bytes_total" : "mem_total" ,
                "memory_bytes_free" : "mem_free" ,
                "swap_bytes_total" : "swp_total" ,
                "swap_bytes_free" : "swp_free"
            }

        sinfo = {id : {"title" : storages[id].title} for id in storages}

        for hostname, last_seen, status in db.fetchall():
            host_info = {}
            for name, tags, value in status.get("metrics",[]):
                if name == "storage_bytes_total" and tags.get("mountpoint") == "/":
                    host_info["root_total"] = value
                elif name == "storage_bytes_free" and tags.get("mountpoint") == "/":
                    host_info["root_free"] = value

                elif name == "shared_storage_bytes_total":
                    sinfo[int(tags.get("id"))]["total"] = value

                elif name == "shared_storage_bytes_free":
                    sinfo[int(tags.get("id"))]["free"] = value

                elif name in tagmap:
                    host_info[tagmap[name]] = value
            hosts[hostname] = host_info
        storage_info = [{"id" : id, **d} for id, d in sinfo.items() if d.get("total") and d.get("free")]

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

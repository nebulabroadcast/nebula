from nebula import *
from nx.jobs import Job
from cherryadmin import CherryAdminView


class ViewJobs(CherryAdminView):
    def build(self, *args, **kwargs):
        self["name"] = "jobs"
        self["title"] = "Jobs"
        self["js"] = [
                "/static/js/jobs.js"
            ]

        mode = "active"
        if len(args) > 1:
            if args[1] in ["finished", "failed"]:
                mode = args[1]

        id_asset = kwargs.get("id_asset", 0)
        try:
            id_asset = int(id_asset)
        except ValueError:
            id_asset = 0

        self["mode"] = mode
        self["id_asset"] = id_asset

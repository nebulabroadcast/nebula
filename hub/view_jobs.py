import cherrypy

from nebula import *
from nx.jobs import Job
from cherryadmin import CherryAdminView


class ViewJobs(CherryAdminView):
    def build(self, *args, **kwargs):

        mode = "active"
        if len(args) > 1:
            if args[1] in ["finished", "failed"]:
                mode = args[1]

        id_asset = kwargs.get("id_asset", 0)
        id_action = kwargs.get("id_action", 0)
        try:
            id_asset = int(id_asset)
        except ValueError:
            id_asset = 0
        try:
            id_action = int(id_action)
        except ValueError:
            id_action = 0

        if cherrypy.request.method == "POST":
            if id_asset and id_action:
                #TODO: how to select restert_existing/running?
                response = api_send(
                       ids=[id_asset],
                       id_action=id_action,
                       user=self["user"]
                    )

                if response.is_error:
                    self.context.message(response.message, level="error")
                else:
                    self.context.message(response.message)

            id_asset = id_action = 0 # do not use filter: show all active jobs to see queue



        self["name"] = "jobs"
        self["js"] = ["/static/js/jobs.js"]
        self["title"] = mode.capitalize() +  " jobs"
        self["mode"] = mode
        self["id_asset"] = id_asset
        self["id_action"] = id_asset

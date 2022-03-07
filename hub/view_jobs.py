import cherrypy

from cherryadmin import CherryAdminView

from nx.api import api_actions, api_send
from nx.core.common import NebulaResponse
from nx.db import DB
from nx.objects import Asset


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

        query = kwargs.get("q", "")

        if cherrypy.request.method == "POST":
            if id_asset and id_action:
                # TODO: how to select restert_existing/running?
                response = api_send(
                    ids=[id_asset], id_action=id_action, user=self["user"]
                )

                if response.is_error:
                    self.context.message(response.message, level="error")
                else:
                    self.context.message(response.message)

            # do not use filter: show all active jobs to see queue
            id_asset = id_action = 0

        if id_asset:
            db = DB()
            asset = Asset(id_asset, db=db)
            actions = api_actions(user=self["user"], db=db, ids=[id_asset])
        else:
            actions = NebulaResponse(404)
            asset = False

        self["name"] = "jobs"
        self["js"] = ["/static/js/jobs.js"]
        self["title"] = mode.capitalize() + " jobs"
        self["mode"] = mode
        self["id_asset"] = id_asset
        self["asset"] = asset
        self["actions"] = actions.data if actions.is_success else []
        self["id_action"] = id_asset
        self["query"] = query

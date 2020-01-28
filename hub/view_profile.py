import cherrypy

from nebula import *
from cherryadmin import CherryAdminView


class ViewProfile(CherryAdminView):
    def build(self, *args, **kwargs):
        db = DB()
        id_user = int(kwargs.get("id_user", 0))
        if id_user and self["user"]["is_admin"]:
            user = User(id_user, db=db)
        else:
            user = self["user"]

        self["user"] = user

        password = kwargs.get("password", False)
        full_name = kwargs.get("full_name", False)
        dashboard = kwargs.get("dashboard", "")
        user_changed = False

        if cherrypy.request.method == "POST":
            if full_name:
                user["full_name"] = kwargs["full_name"]
                user_changed = True

            if password:
                if len(password) < 8:
                    self.context.message("The password is too weak. It must be at least 8 characters long.", "error")
                    return
                user.set_password(kwargs["password"])
                user_changed = True

            if dashboard != user["dashboard"]:
                user["dashboard"] = dashboard
                user_changed = True

            if user_changed:
                user.save()
                if self["user"].id == user.id:
                    self.context["user"] = user.meta
                    cherrypy.session["user_data"] = user.meta
                self.context.message("User profile saved")


        db.query("SELECT meta FROM users WHERE meta->>'is_admin' = 'true'")

        self["admins"] = [User(meta=meta) for meta, in db.fetchall()]
        self["name"] = "profile"
        self["title"] = "User profile"
        self["rights"] = [
                ["asset_edit",      "Edit assets", "folders"],
                ["asset_create",    "Create assets", "folders"],
                ["rundown_view",    "View rundown", "playout_channels"],
                ["rundown_edit",    "Edit rundown", "playout_channels"],
                ["scheduler_view",  "View scheduler", "playout_channels"],
                ["scheduler_edit",  "Modify scheduler", "playout_channels"],
                ["job_control",     "Control jobs", "action"],
                ["service_control", "Control services", "services"],
                ["mcr",             "Control playout", "playout_channels"],
            ]

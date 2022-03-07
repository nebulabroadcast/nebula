import os
import json
import cherrypy
import collections

from cherryadmin import CherryAdminView
from nxtools import get_files

from nx.db import DB
from nx.objects import User
from nx import load_settings

from hub.webtools import webtools


def get_settings_ctx(ctx, db, **kwargs):
    db.query("SELECT key, value FROM settings")
    result = {}
    for key, value in db.fetchall():
        result[key] = value
    ctx["data"] = result
    ctx["title"] = "Settings"


def get_folders_ctx(ctx, db, **kwargs):
    db.query("SELECT id, settings FROM folders")
    result = {}
    for key, settings in db.fetchall():
        result[key] = settings
    ctx["data"] = result
    ctx["title"] = "Folders"


def get_views_ctx(ctx, db, **kwargs):
    db.query("SELECT id, settings FROM views")
    result = {}
    for key, settings in db.fetchall():
        result[key] = settings
    ctx["data"] = result
    ctx["title"] = "Views"


def get_meta_types_ctx(ctx, db, **kwargs):
    db.query("SELECT key, settings FROM meta_types")
    result = {}
    for key, settings in db.fetchall():
        result[key] = settings
    ctx["data"] = result
    ctx["title"] = "Metadata keys"


def get_cs_ctx(ctx, db, **kwargs):
    cs = kwargs.get("cs")
    if not cs:
        db.query("SELECT DISTINCT(cs) FROM cs ORDER BY cs")
        ctx["data"] = [r[0] for r in db.fetchall()]
        return

    db.query("SELECT value, settings FROM cs WHERE cs = %s ORDER BY value", [cs])
    ctx["cs"] = cs
    ctx["data"] = db.fetchall()
    ctx["title"] = "Classification schemes"


def get_storages_ctx(ctx, db, **kwargs):
    db.query("SELECT id, settings FROM storages")
    result = {}
    for key, settings in db.fetchall():
        result[key] = settings
    ctx["data"] = result
    ctx["title"] = "Storages"


def get_actions_ctx(ctx, db, **kwargs):
    db.query("SELECT id, service_type, title FROM actions")
    result = {}
    for id, service_type, title in db.fetchall():
        result[id] = {
            "title": title,
            "service_type": service_type,
        }
    ctx["data"] = result
    ctx["title"] = "Actions"


def get_services_ctx(ctx, db, **kwargs):
    result = {}
    db.query(
        """
        SELECT id, service_type, host, title, autostart, loop_delay
        FROM services
        """
    )
    for id, service_type, host, title, autostart, loop_delay in db.fetchall():
        result[id] = {
            "service_type": service_type,
            "host": host,
            "title": title,
            "autostart": autostart,
            "loop_delay": loop_delay,
        }
    ctx["data"] = result
    ctx["title"] = "Services"


def get_channels_ctx(ctx, db, **kwargs):
    result = {}
    db.query("SELECT id, channel_type, settings FROM channels")
    for id, channel_type, settings in db.fetchall():
        result[id] = settings
        result[id]["channel_type"] = channel_type
    ctx["data"] = result
    ctx["title"] = "Channels"


def get_users_ctx(ctx, db, **kwargs):
    db.query("SELECT meta FROM users ORDER BY login ASC")
    result = []
    for (meta,) in db.fetchall():
        result.append(User(meta=meta))
    ctx["data"] = result
    ctx["title"] = "Users"


def get_sessions_ctx(ctx, db, **kwargs):
    if kwargs.get("delsession"):
        spath = os.path.join(ctx["settings"]["sessions_dir"], kwargs["delsession"])
        if len(kwargs["delsession"]) == 64:
            if os.path.exists(spath):
                os.remove(spath)

    data = {}
    for sfile in get_files(ctx["settings"]["sessions_dir"]):
        d = json.load(sfile.open())
        valid_until = d["ctime"] + (ctx["settings"]["sessions_timeout"] * 60)
        data[sfile.base_name] = {
            "login": d["user_data"].get("login"),
            "valid_until": valid_until,
            "ip": d.get("ip"),
            "user_agent": d.get("user_agent"),
        }
    ctx["data"] = data


modules = collections.OrderedDict(
    [
        ["settings", {"title": "Settings", "context": get_settings_ctx}],
        ["meta_types", {"title": "Keys", "context": get_meta_types_ctx}],
        ["folders", {"title": "Folders", "context": get_folders_ctx}],
        ["views", {"title": "Views", "context": get_views_ctx}],
        ["cs", {"title": "Classification", "context": get_cs_ctx}],
        ["storages", {"title": "Storages", "context": get_storages_ctx}],
        ["actions", {"title": "Actions", "context": get_actions_ctx}],
        ["services", {"title": "Services", "context": get_services_ctx}],
        ["channels", {"title": "Channels", "context": get_channels_ctx}],
        ["users", {"title": "Users", "context": get_users_ctx}],
        ["sessions", {"title": "Sessions", "context": get_sessions_ctx}],
    ]
)


class ViewSettings(CherryAdminView):
    def build(self, *args, **kwargs):
        if args[-1] == "reload_settings":
            load_settings()
            webtools.load()
            raise cherrypy.HTTPRedirect("/settings")

        module = "settings"
        if len(args) > 1:
            if args[1] in modules:
                module = args[1]
        db = DB()
        modules[module]["context"](self, db, **kwargs)

        self["name"] = "settings"
        self["title"] = "Settings"
        self["modules"] = modules
        self["module"] = module

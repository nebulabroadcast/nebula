import cherrypy
import collections

from nebula import *
from cherryadmin import CherryAdminView

from nebulacore.meta_format import FMH_DATA, CSH_DATA, CSA_DATA
from .webtools import webtools


def get_settings_ctx(ctx, **kwargs):
    db = DB()
    db.query("SELECT key, value FROM settings")
    result = {}
    for key, value in db.fetchall():
        result[key] = value
    ctx["data"] = result
    ctx["title"] = "Settings"


def get_folders_ctx(ctx, **kwargs):
    db = DB()
    db.query("SELECT id, settings FROM folders")
    result = {}
    for key, settings in db.fetchall():
        result[key] = settings
    ctx["data"] = result
    ctx["title"] = "Folders"


def get_views_ctx(ctx, **kwargs):
    db = DB()
    db.query("SELECT id, settings FROM views")
    result = {}
    for key, settings in db.fetchall():
        result[key] = settings
    ctx["data"] = result
    ctx["title"] = "Views"


def get_meta_types_ctx(ctx, **kwargs):
    db = DB()
    db.query("SELECT key, settings FROM meta_types")
    result = {}
    for key, settings in db.fetchall():
        result[key] = settings
    ctx["data"] = result
    ctx["title"] = "Metadata keys"


def get_cs_ctx(ctx, **kwargs):
    db = DB()
    cs = kwargs.get("cs")
    if not cs:
        db.query("SELECT DISTINCT(cs) FROM cs ORDER BY cs")
        ctx["data"] = [r[0] for r in db.fetchall()]
        return

    db.query("SELECT value, settings FROM cs WHERE cs = %s ORDER BY value", [cs])
    ctx["cs"] = cs
    ctx["data"] = db.fetchall()
    ctx["title"] = "Classification schemes"


def get_storages_ctx(ctx, **kwargs):
    db = DB()
    db.query("SELECT id, settings FROM storages")
    result = {}
    for key, settings in db.fetchall():
        result[key] = settings
    ctx["data"] = result
    ctx["title"] = "Storages"


def get_actions_ctx(ctx, **kwargs):
    db = DB()
    db.query("SELECT id, service_type, title FROM actions")
    result = {}
    for id, service_type, title in db.fetchall():
        result[id] = {
                "title" : title,
                "service_type" : service_type,
            }
    ctx["data"] = result
    ctx["title"] = "Actions"


def get_services_ctx(ctx, **kwargs):
    db = DB()
    result = {}
    db.query("SELECT id, service_type, host, title, autostart, loop_delay FROM services")
    for id, service_type, host, title, autostart, loop_delay in db.fetchall():
        result[id] = {
            "service_type" : service_type,
            "host": host,
            "title" : title,
            "autostart" : autostart,
            "loop_delay" : loop_delay
        }
    ctx["data"] = result
    ctx["title"] = "Services"


def get_channels_ctx(ctx, **kwargs):
    db = DB()
    result = {}
    db.query("SELECT id, channel_type, settings FROM channels")
    for id, channel_type, settings in db.fetchall():
        result[id] = settings
        result[id]["channel_type"] = channel_type
    ctx["data"] = result
    ctx["title"] = "Channels"


def get_users_ctx(ctx, **kwargs):
    db = DB()
    db.query("SELECT meta FROM users ORDER BY login ASC")
    result = []
    for meta, in db.fetchall():
        result.append(User(meta=meta))
    ctx["data"] = result
    ctx["title"] = "Users"



modules = collections.OrderedDict([
    ["settings",   {"title": "Settings", "context" : get_settings_ctx}],
    ["meta_types", {"title": "Keys", "context" : get_meta_types_ctx}],
    ["folders",    {"title": "Folders", "context" : get_folders_ctx}],
    ["views",      {"title": "Views", "context" : get_views_ctx}],
    ["cs",         {"title": "Classification", "context" : get_cs_ctx}],
    ["storages",   {"title": "Storages", "context" : get_storages_ctx}],
    ["actions",    {"title": "Actions", "context" : get_actions_ctx}],
    ["services",   {"title": "Services", "context" : get_services_ctx}],
    ["channels",   {"title": "Channels", "context" : get_channels_ctx}],
    ["users",      {"title": "Users", "context" : get_users_ctx}],
    ])



class ViewSettings(CherryAdminView):
    def build(self, *args, **kwargs):

        if args[-1] == "reload_settings":
            load_settings()
            webtools.load()
            FMH_DATA = {}
            CSH_DATA = {}
            CSA_DATA = {}
            raise cherrypy.HTTPRedirect("/settings")


        module = "settings"
        if len(args) > 1:
            if args[1] in modules:
                module = args[1]

        modules[module]["context"](self, **kwargs)

        self["name"] = "settings"
        self["title"] = "Settings"
        self["modules"] = modules
        self["module"] = module

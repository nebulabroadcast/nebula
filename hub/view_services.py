import cherrypy

from nebula import *
from cherryadmin import CherryAdminView

from nebulacore.meta_format import FMH_DATA, CSH_DATA, CSA_DATA
from .webtools import webtools

class ViewServices(CherryAdminView):
    def build(self, *args, **kwargs):

        if args[-1] == "reload_settings":
            load_settings()
            webtools.load()

            FMH_DATA = {}
            CSH_DATA = {}
            CSA_DATA = {}

            raise cherrypy.HTTPRedirect("/services")

        state_label = {
                STOPPED  : "<span class='label text-primary'>Stopped</span>",
                STARTED  : "<span class='label text-success'>Running</span>",
                STARTING : "<span class='label text-warning'>Starting</span>",
                STOPPING : "<span class='label text-warning'>Stopping</span>",
                KILL     : "<span class='label text-danger'>Killing</span>",
            }

        services = []
        db = DB()
        db.query("SELECT id, service_type, host, title, autostart, state, last_seen FROM services ORDER BY id")
        for id, service_type, host, title, autostart, state, last_seen in db.fetchall():
            service = {
                    "id" : id,
                    "service_type" : service_type,
                    "host" : host,
                    "title" : title,
                    "autostart" : autostart,
                    "state" : state,
                    "last_seen" : last_seen,
                    "message" :  ""
                }
            if time.time() - last_seen > 120:
                service["message"] = "Not responding for {}".format(s2words(time.time() - last_seen))
            services.append(service)

        self["name"] = "services"
        self["title"] = "Services"
        self["js"] = ["/static/js/services.js"]
        self["data"]  = services

import time

from cherryadmin import CherryAdminView
from nxtools import s2words
from nx.db import DB


class ViewServices(CherryAdminView):
    def build(self, *args, **kwargs):
        services = []
        db = DB()
        db.query(
            """
            SELECT id, service_type, host, title, autostart, state, last_seen
            FROM services ORDER BY id
            """
        )
        for id, service_type, host, title, autostart, state, last_seen in db.fetchall():
            service = {
                "id": id,
                "service_type": service_type,
                "host": host,
                "title": title,
                "autostart": autostart,
                "state": state,
                "last_seen": last_seen,
                "message": "",
            }
            if time.time() - last_seen > 120:
                nrtime = s2words(time.time() - last_seen)
                service["message"] = f"Not responding for {nrtime}"
            services.append(service)

        self["name"] = "services"
        self["title"] = "Services"
        self["js"] = ["/static/js/services.js"]
        self["data"] = services

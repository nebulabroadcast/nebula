#
# Returns system status and controls services
#
# Arguments:
#
# request       list of information to show.
#               defaults to everything ["services", "hosts"]
# stop          stop service by its ID
# start         start service by its ID
# kill          kill service by its ID
# set_autostart toggle service autostart param (True/False)
#

from nx import *

__all__ = ["api_system"]

def api_system(**kwargs):
    if not kwargs.get("user", None):
        return {'response' : 401, 'message' : 'unauthorized'}

    request = kwargs.get("request", [
            "services",
            "hosts"
        ])
    db = DB()

    if "stop" in kwargs:
        id_service = kwargs["stop"]
        if not type(id_service) == int:
            return {"response" : 400, "message" : "Bad request (id_service to stop)"}
        db.query("UPDATE services SET state=3 WHERE id=%s", [id_service])
        db.commit()

    if "start" in kwargs:
        id_service = kwargs["start"]
        if not type(id_service) == int:
            return {"response" : 400, "message" : "Bad request (id_service to start)"}
        db.query("UPDATE services SET state=2 WHERE id=%s", [id_service])
        db.commit()

    if "kill" in kwargs:
        id_service = kwargs["kill"]
        if not type(id_service) == int:
            return {"response" : 400, "message" : "Bad request (id_service to kill)"}
        db.query("UPDATE services SET state=4 WHERE id=%s", [id_service])
        db.commit()

    if "set_autostart" in kwargs:
        id_service = kwargs["set_autostart"]
        if not type(id_service) in int:
            return {"response" : 400, "message" : "Bad request (id_service to set autostart)"}
        db.query("UPDATE services SET autostart=NOT autostart WHERE id=%s", [id_service])
        db.commit()

    result = {}
    if "services" in request:
        services = []
        db.query("SELECT id, service_type, host, title, autostart, state, last_seen FROM services ORDER BY id ASC")
        for id, service_type, host, title, autostart, state, last_seen in db.fetchall():
            service = {
                    "id" : id,
                    "type" : service_type,
                    "host" : host,
                    "title" : title,
                    "autostart" : autostart,
                    "state" : state,
                    "last_seen" : last_seen
                }
            services.append(service)
        result["services"] = services

    if "hosts" in request:
        hosts = []
        db.query("SELECT hostname, last_seen, status FROM hosts ORDER BY hostname")
        for hostname, last_seen, status in db.fetchall():
            host = status
            host["hostname"] = hostname
            host["last_seen"] = last_seen
            hosts.append(host)
        result["hosts"] = hosts

    return {"response" : 200, "message" : "OK", "data" : result}

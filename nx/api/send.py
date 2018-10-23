from nx import *
from nx.jobs import send_to

__all__ = ["api_send"]

def api_send(**kwargs):
    if not kwargs.get("user", None):
        return NebulaResponse(ERROR_UNAUTHORISED)

    ids       = kwargs.get("ids", [])
    id_action = kwargs.get("id_action", False)
    settings  = kwargs.get("settings", {})
    restart_existing   = kwargs.get("restart_existing", True)
    restart_running    = kwargs.get("restart_running", False)
    db        = kwargs.get("db", DB())

    if "user" in kwargs:
        user = User(meta=kwargs.get("user"))
        if not user:
            return NebulaResponse(ERROR_ACCESS_DENIED, "You are not allowed to execute this action")
        #TODO: Better ACL

    if not id_action:
        return NebulaResponse(ERROR_BAD_REQUEST, "No valid action selected")

    if not ids:
        return NebulaResponse(ERROR_BAD_REQUEST,  "No asset selected")

    if not user.has_right("job_control", id_action):
        return NebulaResponse(ERROR_ACCESS_DENIED, "You are not allowed to start this action")

    logging.info("{} is starting action {} for following assets: {}".format(user, id_action, ", ".join([str (i) for i in  ids]) ))

    for id_object in ids:
        send_to(
                id_object,
                id_action,
                settings=settings,
                id_user=user.id,
                restart_existing=restart_existing,
                restart_running=restart_running,
                db=db
            )

    return NebulaResponse(SUCCESS_ACCEPTED, "Starting {} jobs".format(len(ids)))


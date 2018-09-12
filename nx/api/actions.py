from nx import *

__all__ = ["api_actions"]

def api_actions(**kwargs):
    if not kwargs.get("user", None):
        return {'response' : 401, 'message' : 'unauthorized'}

    ids = kwargs.get("ids", [])
    db = kwargs.get("db", DB())
    user = User(meta=kwargs.get("user"))
    if not user:
        return {"response" : 403, "message" : "You are not allowed to execute any actions"}

    if not ids:
        return {"response" : 400, "message" : "No asset selected"}

    result = []


    db.query("SELECT id, title, settings FROM actions ORDER BY id ASC")
    for id, title, settings in db.fetchall():
        allow = False
        try:
            cond = xml(settings).find("allow_if").text
        except Exception:
            log_traceback()
            continue

        for id_asset in ids:
            asset = Asset(id_asset, db=db)
            if not eval(cond):
                break
        else:
            if user.has_right("job_control", id):
                result.append((id, title))

    return {'response' : 200, 'message' : 'OK', 'data' : result }

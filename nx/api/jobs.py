from nx import *

__all__ = ["api_jobs"]

def api_jobs(**kwargs):
    formatted = kwargs.get("formatted", False) # load titles etc
    user = kwargs.get("user", anonymous)
    query = kwargs.get("query", "")
    id_asset = kwargs.get("id_asset", False)
    view = kwargs.get("view", "active")
    db = kwargs.get("db", DB())
    now = time.time()

    id_user = user.id or None

    if not user:
        return NebulaResponse(401, "You are not logged-in")

    for k in ["restart", "abort"]:
        if k in kwargs and not user.has_right("job_control", anyval=True):
            return NebulaResponse(403, "You are not authorized to control this job")

    if "restart" in kwargs:
        jobs = [int(i) for i in kwargs["restart"]]
        db.query("""
            UPDATE jobs SET
                id_user=%s,
                status=5,
                retries=0,
                creation_time=%s,
                start_time=NULL,
                end_time=NULL,
                id_service=NULL,
                message='Restart requested'
            WHERE
                id IN %s
            RETURNING id
            """,
            [id_user, now, tuple(jobs)]
            )
        result = [r[0] for r in db.fetchall()]
        db.commit()
        logging.info("Restarted jobs {}".format(result))
        for job_id in result:
            messaging.send(
                "job_progress",
                id=job_id,
                status=5,
                progress=0,
                ctime=now,
                stime=None,
                etime=None,
                message="Restart requested"
            )
        return NebulaResponse(200, "Job restarted", data=result)

    if "abort" in kwargs:
        jobs = [int(i) for i in kwargs["abort"]]
        db.query("""
            UPDATE jobs SET
                status=4,
                end_time=%s,
                message='Aborted'
            WHERE
                id IN %s
            RETURNING id
            """,
            [now, tuple(jobs)]
            )
        result = [r[0] for r in db.fetchall()]
        logging.info("Aborted jobs {}".format(result))
        db.commit()
        for job_id in result:
            messaging.send(
                "job_progress",
                id=job_id,
                status=4,
                progress=0,
                etime=now,
                message="Aborted"
            )
        #TODO: smarter message
        return NebulaResponse(200, "Job aborted", data=result)


    #TODO: fulltext

    try:
        id_asset = int(id_asset)
    except ValueError:
        id_asset = False

    cond = ""
    if id_asset:
        cond = "AND j.id_asset = {}".format(id_asset)

    elif kwargs.get("fulltext"):
        fulltext = kwargs["fulltext"]
        if ":" in fulltext:
            key, value = fulltext.split(":")
            key = key.strip()
            value = value.strip().lower().replace("'", "")
            cond += " AND a.meta->>'{}' ILIKE '{}'".format(key, value)
        else:
            ft = slugify(fulltext, make_set=True)
            for word in ft:
                cond += "AND a.id IN (SELECT id FROM ft WHERE object_type=0 AND value LIKE '{}%')".format( word)

    elif view == "active":
        # Pending, in_progress, restart
        cond = "AND (j.status IN (0, 1, 5) OR j.end_time > {})".format(time.time() - 30)
    elif view == "finished":
        # completed, aborted, skipped
        cond = "AND j.status IN (2, 4, 6)"
    elif view == "failed":
        # failed
        cond = "AND j.status IN (3)"

    data = []
    db.query("""SELECT
                j.id,
                j.id_asset,
                j.id_action,
                j.id_service,
                j.id_user,
                j.priority,
                j.retries,
                j.status,
                j.progress,
                j.message,
                j.creation_time,
                j.start_time,
                j.end_time,
                a.meta
            FROM jobs AS j, assets AS a
            WHERE a.id = j.id_asset
            {}
            ORDER BY
                end_time DESC NULLS FIRST,
                start_time DESC NULLS LAST,
                creation_time DESC
            LIMIT 100
            """.format(cond))
    for id, id_asset, id_action, id_service, id_user, priority, retries, status, progress, message, ctime, stime, etime, meta in db.fetchall():
        row = {
                "id" : id,
                "id_asset" : id_asset,
                "id_action" : id_action,
                "id_service" : id_service,
                "id_user" : id_user,
                "priority" : priority,
                "retries" : retries,
                "status" : status,
                "progress" : progress,
                "message" : message,
                "ctime" : format_time(ctime, never_placeholder="") if formatted else ctime,
                "stime" : format_time(stime, never_placeholder="") if formatted else stime,
                "etime" : format_time(etime, never_placeholder="") if formatted else etime
            }

        asset = Asset(meta=meta)
        row["asset_title"] = asset["title"]
        row["action_title"] = config["actions"][id_action]["title"]
        if id_service:
            service = config["services"].get(id_service, {"title" : "Unknown", "host" : "Unknown"})
            row["service_title"] = "{}@{}".format(service["title"], service["host"])
        else:
            row["service_title"] = ""

        data.append(row)

    return NebulaResponse(200, data=data)

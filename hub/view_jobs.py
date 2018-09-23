from nebula import *
from nx.jobs import Job
from cherryadmin import CherryAdminView


def get_jobs(conds, db=False):
    db = db or DB()
    query = """
        SELECT
            j.id_action,
            j.id_asset,
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
            a.meta,
            c.title,
            j.id
        FROM jobs AS j, assets AS a, actions as c
        WHERE
            a.id = j.id_asset
            AND c.id = j.id_action
            AND ({})
            ORDER BY
                end_time DESC NULLS FIRST,
                start_time DESC NULLS LAST,
                creation_time DESC
        LIMIT 500
            """.format(conds)

    db.query(query)
    data = []
    for row in db.fetchall():
        rowdata = {
                "id_action" : row[0],
                "id_asset" : row[1],
                "id_service" : row[2],
                "id_user" : row[3],
                "priority" : row[4],
                "retries" : row[5],
                "status" : row[6],
                "progress" : row[7],
                "message" : row[8],
                "creation_time" : format_time(row[9], never_placeholder="(not yet)"),
                "start_time" : format_time(row[10], never_placeholder="(not yet)"),
                "end_time" : format_time(row[11], never_placeholder="(not yet)"),
                "asset" : Asset(meta=row[12]),
                "action" : row[13],
                "id" : row[14]
        }
        data.append(rowdata)
    return data


class ViewJobs(CherryAdminView):
    def build(self, *args, **kwargs):
        self["name"] = "jobs"
        self["title"] = "Jobs"
        self["js"] = []

        mode = "active"
        if len(args) > 1:
            if args[1] in ["finished", "failed"]:
                mode = args[1]

        if mode == "active":
            conds = "j.status in (0,1,5) OR j.end_time > {}".format(int(time.time() - 120))
        elif mode == "finished":
            conds = "j.status in (2,6)"
        elif mode == "failed":
            conds = "j.status in (3,4)"

        db = DB()

        self["jobs"] = get_jobs(conds, db=db)
        self["mode"] = mode
        self["show_job_title"] = True

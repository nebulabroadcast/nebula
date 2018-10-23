from nebulacore import *
from .connection import *
from .objects import *

MAX_RETRIES = 3

__all__ = ["Job", "Action", "send_to"]


class Action(object):
    def __init__(self, id_action, title, settings):
        self.id = id_action
        self.title = title
        self.settings = settings
        try:
            create_if = settings.findall("create_if")[0]
        except IndexError:
            self.create_if = False
        else:
            if create_if is not None:
                if create_if.text:
                    self.create_if = create_if.text
                else:
                    self.create_if = False

        try:
            start_if = settings.findall("start_if")[0]
        except IndexError:
            self.start_if = False
        else:
            if start_if is not None:
                if start_if.text:
                    self.start_if = start_if.text
                else:
                    self.start_if = False

        try:
            skip_if = settings.findall("skip_if")[0]
        except IndexError:
            self.skip_if = False
        else:
            if skip_if is not None:
                if skip_if.text:
                    self.skip_if = skip_if.text
                else:
                    self.skip_if = False

    @property
    def created_key(self):
        return "job_created/{}".format(self.id)

    def should_create(self, asset):
        if self.create_if:
            return eval(self.create_if)
        return False

    def should_start(self, asset):
        if self.start_if:
            return eval(self.start_if)
        return True

    def should_skip(self, asset):
        if self.skip_if:
            return eval(self.skip_if)
        return False


class Actions():
    def __init__(self):
        self.data = {}

    def load(self, id_action):
        db = DB()
        db.query("SELECT title, settings FROM actions WHERE id = %s", [id_action])
        for title, settings in db.fetchall():
            self.data[id_action] = Action(id_action, title, xml(settings))

    def __getitem__(self, key):
        if not key in self.data:
            self.load(key)
        return self.data.get(key, False)

actions = Actions()



class Job():
    def __init__(self, id, db=False):
        self._db = db
        self.id = id
        self.id_service = None
        self.id_user = 0
        self.priority = 3
        self.retries = 0
        self._asset = None
        self._settings = None
        self._action = None

    @property
    def id_asset(self):
        return self.asset.id

    @property
    def id_action(self):
        return self.action.id

    @property
    def db(self):
        if not self._db:
            self._db = DB()
        return self._db

    @property
    def asset(self):
        if self._asset is None:
            self.load()
        return self._asset

    @property
    def settings(self):
        if self._settings is None:
            self.load()
        return self._settings

    @property
    def action(self):
        if self._action is None:
            self.load()
        return self._action

    def __repr__(self):
        return "job ID:{} [{}@{}]".format(self.id, self.action.title, self.asset)

    def load(self):
        self.db.query("""
            SELECT id_action, id_asset, id_service, id_user, settings, priority, retries, status, progress, message
            FROM jobs WHERE id=%s
        """, [self.id])
        for id_action, id_asset, id_service, id_user, settings, priority, retries, status, progress, message in self.db.fetchall():
            self.id_service = id_service
            self.id_user = id_user
            self.priority = priority
            self.retries = retries
            self.status = status
            self.progress = progress
            self.message = message
            self._settings = settings
            self._asset = Asset(id_asset, db=self.db)
            self._action = actions[id_action]
            return
        logging.error("No such {}".format(self))

    def take(self, id_service):
        self.db.query("""UPDATE jobs SET
                    id_service=%s,
                    start_time=%s,
                    end_time=NULL,
                    status=1,
                    progress=0
                WHERE id=%s AND id_service IS NULL""",
                [id_service, time.time(), self.id])
        self.db.commit()
        self.db.query(
                "SELECT id FROM jobs WHERE id=%s AND id_service=%s",
                [self.id, id_service]
            )
        if self.db.fetchall():
            return True
        return False

    def set_progress(self, progress, message="In progress"):
        db = DB()
        db.query(
            """UPDATE jobs SET
                    progress=%s,
                    message=%s
                WHERE id=%s""",
            [progress, message, self.id])
        db.commit()
        messaging.send("job_progress", id=self.id, id_asset=self.id_asset, id_action=self.id_action, status=1, progress=progress, message=message)

    def get_status(self):
        self.db.query("SELECT status FROM jobs WHERE id=%s", [self.id])
        return self.db.fetchall()[0][0]

    def abort(self, message="Aborted"):
        logging.warning("{} aborted".format(self))
        self.db.query("UPDATE jobs SET end_time=%s, status=4, message=%s WHERE id=%s", [time.time(), message, self.id])
        self.db.commit()
        messaging.send("job_progress", id=self.id, id_asset=self.id_asset, id_action=self.id_action, status=4, progress=0, message=message)

    def restart(self, message="Restarted"):
        logging.warning("{} restarted".format(self))
        self.db.query("UPDATE jobs SET id_service=NULL, start_time=NULL, end_time=NULL, status=5, retries=0, progress=0, message=%s WHERE id=%s", [message, self.id])
        self.db.commit()
        messaging.send("job_progress", id=self.id, id_asset=self.id_asset, id_action=self.id_action, status=5, progress=0, message=message)

    def fail(self, message="Failed", critical=False):
        if critical:
            retries = MAX_RETRIES
        else:
            retries = self.retries + 1
        self.db.query(
            """UPDATE jobs SET
                    id_service=NULL,
                    retries=%s,
                    priority=%s,
                    status=3,
                    progress=0,
                    message=%s
                WHERE id=%s""",
            [retries, max(0, self.priority-1), message, self.id]
            )
        self.db.commit()
        logging.error("{}: {}".format(self, message))
        messaging.send("job_progress", id=self.id, id_asset=self.id_asset, id_action=self.id_action, status=3, progress=0, message=message)

    def done(self, message="Completed"):
        self.db.query(
            """UPDATE jobs SET
                    status=2,
                    progress=100,
                    end_time=%s,
                    message=%s
                WHERE id=%s""",
            [time.time(), message, self.id]
            )
        self.db.commit()
        logging.goodnews("{}: {}".format(self, message))
        messaging.send("job_progress", id=self.id, id_asset=self.asset.id, id_action=self.action.id, status=2, progress=100, message=message)




def get_job(id_service, action_ids, db=False):
    assert type(action_ids) == list, "action_ids must be list of integers"
    if not action_ids:
        return False
    db = db or DB()
    q = """
        SELECT id, id_action, id_asset, id_user, settings, priority, retries, status FROM jobs
        WHERE
            status IN (0,3,5)
            AND id_action IN %s
            AND id_service IS NULL
            AND retries < %s
            ORDER BY priority DESC, creation_time DESC
        """
    db.query(q, [ tuple(action_ids), MAX_RETRIES ])

    for id_job, id_action, id_asset, id_user, settings, priority, retries, status in db.fetchall():
        asset = Asset(id_asset, db=db)
        action = actions[id_action]
        job = Job(id_job, db=db)
        job._asset = asset
        job._settings = settings
        job.priority = priority
        job.retries = retries
        job.id_user = id_user
        for pre in action.settings.findall("pre"):
            try:
                exec(pre.text)
            except Exception:
                log_traceback()
                continue
        if not action:
            logging.warning("Unable to get job. No such action ID {}".format(id_action))
            continue

        if status != 5 and action.should_skip(asset):
            logging.info("Skipping {}".format(job))
            now = time.time()
            db.query("""
                UPDATE jobs SET
                    status=6,
                    message='Skipped',
                    start_time=%s,
                    end_time=%s
                WHERE id=%s""",
                [now, now, id_job]
                )
            db.commit()
            continue

        if action.should_start(asset):
            if job.take(id_service):
                return job
            else:
                logging.warning("Unable to take {}".format(job))
                continue
        else:
            db.query("UPDATE jobs SET message='Waiting' WHERE id=%s", [id_job])
            messaging.send("job_progress", id=id_job, id_asset=id_asset, id_action=id_action, status=status, progress=0, message="Waiting")
            db.commit()
    return False




def send_to(id_asset, id_action, settings={}, id_user=None, priority=3, restart_existing=True, restart_running=False, db=False):
    db  = db or DB()
    if not id_asset:
        NebulaResponse(401, message="You must specify existing object")

    db.query(
        "SELECT id FROM jobs WHERE id_asset=%s AND id_action=%s AND settings=%s",
        [id_asset, id_action, json.dumps(settings)])
    res = db.fetchall()
    if res:
        if restart_existing:
            conds = "0,5"
            if not restart_running:
                conds += ",1"

            db.query("""
                UPDATE jobs SET
                    id_service=NULL,
                    message='Restart requested',
                    status=5,
                    retries=0,
                    creation_time=%s,
                    start_time=NULL,
                    end_time=NULL
                WHERE id=%s
                    AND status NOT IN({})
                RETURNING id
                    """.format(conds),
                    [time.time(), res[0][0]])
            db.commit()
            if db.fetchall():
                messaging.send("job_progress", id=res[0][0], id_asset=id_asset, id_action=id_action, progress=0)
                return NebulaResponse(201, message="Job restarted")
            return NebulaResponse(200, message="Job exists. Not restarting")
        else:
            return NebulaResponse(200, message="Job exists. Not restarting")

    #
    # Create new job
    #

    db.query(
        """INSERT INTO jobs (
            id_asset,
            id_action,
            id_user,
            settings,
            priority,
            message,
            creation_time
        ) VALUES (
            %s,
            %s,
            %s,
            %s,
            %s,
            'Pending',
            %s
        )
        RETURNING id
        """,
            [id_asset, id_action, id_user, json.dumps(settings), priority, time.time()]
        )

    try:
        id_job = db.fetchall()[0][0]
        db.commit()
    except Exception:
        log_traceback()
        return NebulaResponse(500, "Unable to create job")

    messaging.send(
            "job_progress",
            id=id_job,
            id_asset=id_asset,
            id_action=id_action,
            progress=0,
            message="Job created",
        )
    return NebulaResponse(201, message="Job created")

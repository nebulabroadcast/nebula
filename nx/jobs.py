__all__ = ["Job", "Action", "send_to"]

import json
import time

from nxtools import xml, logging, log_traceback

from nx.db import DB
from nx.core.common import NebulaResponse
from nx.messaging import messaging
from nx.objects import Asset

from nx.core.enum import ObjectStatus, ContentType, MediaType, JobState

# Backwards compatibility
OFFLINE = 0
ONLINE = 1
CREATING = 2  # File exists, but was changed recently.
TRASHED = 3  # File has been moved to trash location.
ARCHIVED = 4  # File has been moved to archive location.
RESET = 5  # Reset metadata action has been invoked.
CORRUPTED = 6
REMOTE = 7
UNKNOWN = 8
AIRED = 9  # Auxiliary value.
ONAIR = 10
RETRIEVING = 11
AUDIO = 1
VIDEO = 2
IMAGE = 3
TEXT = 4
DATABROADCASTING = 5
INTERSTITIAL = 6
EDUCATION = 7
APPLICATION = 8
GAME = 9
PACKAGE = 10
PENDING = 0
IN_PROGRESS = 1
COMPLETED = 2
FAILED = 3
ABORTED = 4
RESTART = 5
SKIPPED = 6
VIRTUAL = 0
FILE = 1
URI = 2


MAX_RETRIES = 3


class Action:
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
        return f"job_created/{self.id}"

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


class Actions:
    def __init__(self):
        self.data = {}

    def load(self, id_action):
        db = DB()
        db.query("SELECT title, settings FROM actions WHERE id = %s", [id_action])
        for title, settings in db.fetchall():
            self.data[id_action] = Action(id_action, title, xml(settings))

    def __getitem__(self, key):
        if key not in self.data:
            self.load(key)
        return self.data.get(key, False)


actions = Actions()


class Job:
    def __init__(self, id, db=False):
        self._db = db
        self.id = id
        self.id_service = None
        self.id_user = 0
        self.priority = 3
        self.retries = 0
        self.status = JobState.PENDING
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
        return f"job ID:{self.id} [{self.action.title}@{self.asset}]"

    def load(self):
        self.db.query(
            """
            SELECT
                id_action,
                id_asset,
                id_service,
                id_user,
                settings,
                priority,
                retries,
                status,
                progress,
                 message
            FROM jobs WHERE id=%s
            """,
            [self.id],
        )
        for (
            id_action,
            id_asset,
            id_service,
            id_user,
            settings,
            priority,
            retries,
            status,
            progress,
            message,
        ) in self.db.fetchall():
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
        logging.error(f"No such {self}")

    def take(self, id_service):
        now = time.time()
        self.db.query(
            """
            UPDATE jobs SET
                id_service=%s,
                start_time=%s,
                end_time=NULL,
                status=1,
                progress=0
            WHERE id=%s AND id_service IS NULL
            """,
            [id_service, now, self.id],
        )
        self.db.commit()
        self.db.query(
            "SELECT id FROM jobs WHERE id=%s AND id_service=%s", [self.id, id_service]
        )
        if self.db.fetchall():
            messaging.send(
                "job_progress",
                id=self.id,
                id_asset=self.id_asset,
                id_action=self.id_action,
                stime=now,
                status=1,
                progress=0,
                message="Starting...",
            )
            return True
        return False

    def set_progress(self, progress, message="In progress"):
        db = DB()
        progress = round(progress, 2)
        db.query(
            """
            UPDATE jobs SET
                status=1,
                progress=%s,
                message=%s
            WHERE id=%s
            """,
            [progress, message, self.id],
        )
        db.commit()
        messaging.send(
            "job_progress",
            id=self.id,
            id_asset=self.id_asset,
            id_action=self.id_action,
            status=JobState.IN_PROGRESS,
            progress=progress,
            message=message,
        )

    def get_status(self):
        self.db.query("SELECT status FROM jobs WHERE id=%s", [self.id])
        self.status = self.db.fetchall()[0][0]
        return self.status

    def abort(self, message="Aborted"):
        now = time.time()
        logging.warning(f"{self} aborted")
        self.db.query(
            """
            UPDATE jobs SET
                end_time=%s,
                status=4,
                message=%s
            WHERE id=%s
            """,
            [now, message, self.id],
        )
        self.db.commit()
        self.status = JobState.ABORTED
        messaging.send(
            "job_progress",
            id=self.id,
            id_asset=self.id_asset,
            id_action=self.id_action,
            etime=now,
            status=JobState.ABORTED,
            progress=0,
            message=message,
        )

    def restart(self, message="Restarted"):
        logging.warning(f"{self} restarted")
        self.db.query(
            """
            UPDATE jobs SET
                id_service=NULL,
                start_time=NULL,
                end_time=NULL,
                status=5,
                retries=0,
                progress=0,
                message=%s
            WHERE id=%s
            """,
            [message, self.id],
        )
        self.db.commit()
        self.status = JobState.RESTART
        messaging.send(
            "job_progress",
            id=self.id,
            id_asset=self.id_asset,
            id_action=self.id_action,
            stime=None,
            etime=None,
            status=5,
            progress=0,
            message=message,
        )

    def fail(self, message="Failed", critical=False):
        if critical:
            retries = MAX_RETRIES
        else:
            retries = self.retries + 1
        self.db.query(
            """
            UPDATE jobs SET
                id_service=NULL,
                retries=%s,
                priority=%s,
                status=3,
                progress=0,
                message=%s
            WHERE id=%s
            """,
            [retries, max(0, self.priority - 1), message, self.id],
        )
        self.db.commit()
        self.status = JobState.FAILED
        logging.error(f"{self}: {message}")
        messaging.send(
            "job_progress",
            id=self.id,
            id_asset=self.id_asset,
            id_action=self.id_action,
            status=JobState.FAILED,
            progress=0,
            message=message,
        )

    def done(self, message="Completed"):
        now = time.time()
        self.db.query(
            """
            UPDATE jobs SET
                status=2,
                progress=100,
                end_time=%s,
                message=%s
            WHERE id=%s
            """,
            [now, message, self.id],
        )
        self.db.commit()
        self.status = JobState.COMPLETED
        logging.goodnews(f"{self}: {message}")
        messaging.send(
            "job_progress",
            id=self.id,
            id_asset=self.asset.id,
            id_action=self.action.id,
            status=JobState.COMPLETED,
            etime=now,
            progress=100,
            message=message,
        )


def get_job(id_service, action_ids, db=False):
    assert type(action_ids) == list, "action_ids must be list of integers"
    if not action_ids:
        return False
    db = db or DB()
    now = time.time()

    running_jobs_count = {}
    db.query(
        """
        select id_action, count(id)
        from jobs
        where status=1
        group by id_action
        """
    )
    for id_action, cnt in db.fetchall():
        running_jobs_count[id_action] = cnt

    q = """
        SELECT
            id,
            id_action,
            id_asset,
            id_user,
            settings,
            priority,
            retries,
            status
        FROM jobs
        WHERE
            status IN (0,3,5)
            AND id_action IN %s
            AND id_service IS NULL
            AND retries < %s
            ORDER BY priority DESC, creation_time DESC
        """
    db.query(q, [tuple(action_ids), MAX_RETRIES])

    for (
        id_job,
        id_action,
        id_asset,
        id_user,
        settings,
        priority,
        retries,
        status,
    ) in db.fetchall():
        asset = Asset(id_asset, db=db)
        action = actions[id_action]
        job = Job(id_job, db=db)
        job._asset = asset
        job._settings = settings
        job.priority = priority
        job.retries = retries
        job.id_user = id_user

        max_running_jobs = action.settings.attrib.get("max_jobs", 0)
        try:
            max_running_jobs = int(max_running_jobs)
        except ValueError:
            max_running_jobs = 0
        if max_running_jobs:
            running_jobs = running_jobs_count.get(id_action, 0)
            if running_jobs >= max_running_jobs:
                continue  # Maximum allowed jobs already running. skip

        for pre in action.settings.findall("pre"):
            if pre.text:
                try:
                    exec(pre.text)
                except Exception:
                    log_traceback()
                    continue
        if not action:
            logging.warning(f"Unable to get job. No such action ID {id_action}")
            continue

        if status != 5 and action.should_skip(asset):
            logging.info(f"Skipping {job}")
            db.query(
                """
                UPDATE jobs SET
                    status=6,
                    message='Skipped',
                    start_time=%s,
                    end_time=%s
                WHERE id=%s
                """,
                [now, now, id_job],
            )
            db.commit()
            continue

        if action.should_start(asset):
            if job.take(id_service):
                return job
            else:
                logging.warning(f"Unable to take {job}")
                continue
        else:
            db.query("UPDATE jobs SET message='Waiting' WHERE id=%s", [id_job])
            messaging.send(
                "job_progress",
                id=id_job,
                id_asset=id_asset,
                id_action=id_action,
                status=status,
                progress=0,
                message="Waiting",
            )
            db.commit()
    return False


def send_to(
    id_asset,
    id_action,
    settings=None,
    id_user=None,
    priority=3,
    restart_existing=True,
    restart_running=False,
    db=False,
):
    db = db or DB()
    if not id_asset:
        NebulaResponse(401, message="You must specify existing object")

    if settings is None:
        settings = {}

    db.query(
        """
        SELECT id
        FROM jobs
        WHERE id_asset=%s AND id_action=%s AND settings=%s
        """,
        [id_asset, id_action, json.dumps(settings)],
    )
    res = db.fetchall()
    if res:
        if restart_existing:
            conds = "0,5"
            if not restart_running:
                conds += ",1"

            db.query(
                f"""
                UPDATE jobs SET
                    id_user=%s,
                    id_service=NULL,
                    message='Restart requested',
                    status=5,
                    retries=0,
                    creation_time=%s,
                    start_time=NULL,
                    end_time=NULL
                WHERE id=%s
                    AND status NOT IN ({conds})
                RETURNING id
                """,
                [id_user, time.time(), res[0][0]],
            )
            db.commit()
            if db.fetchall():
                messaging.send(
                    "job_progress",
                    id=res[0][0],
                    id_asset=id_asset,
                    id_action=id_action,
                    progress=0,
                )
                return NebulaResponse(201, message="Job restarted")
            return NebulaResponse(200, message="Job exists. Not restarting")
        else:
            return NebulaResponse(200, message="Job exists. Not restarting")

    #
    # Create a new job
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
        [id_asset, id_action, id_user, json.dumps(settings), priority, time.time()],
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

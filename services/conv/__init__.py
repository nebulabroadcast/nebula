import time

from nxtools import xml, logging, s2words, log_traceback

from nx.db import DB
from nx.base_service import BaseService
from nx.core.enum import JobState
from nx.jobs import Action, get_job

from services.conv.encoders import NebulaFFMPEG

FORCE_INFO_EVERY = 20

available_encoders = {"ffmpeg": NebulaFFMPEG}


class Service(BaseService):
    def on_init(self):
        self.service_type = "conv"
        self.actions = []
        db = DB()
        db.query(
            """
            SELECT id, title, service_type, settings
            FROM actions ORDER BY id
            """
        )
        for id_action, title, service_type, settings in db.fetchall():
            if service_type == self.service_type:
                logging.debug(f"Registering action {title}")
                self.actions.append(Action(id_action, title, xml(settings)))
        self.reset_jobs()

    def reset_jobs(self):
        db = DB()
        db.query(
            """
            UPDATE jobs SET
                id_service=NULL,
                progress=0,
                retries=0,
                status=5,
                message='Restarting after service restart',
                start_time=0,
                end_time=0
            WHERE
                id_service=%s AND STATUS IN (0,1,5)
            RETURNING id
            """,
            [self.id_service],
        )
        for (id_job,) in db.fetchall():
            logging.info(f"Restarting job ID {id_job} (converter restarted)")
        db.commit()

    def progress_handler(self, position):
        position = float(position)
        stat = self.job.get_status()
        if stat == JobState.RESTART:
            self.encoder.stop()
            self.job.restart()
            return
        elif stat == JobState.ABORTED:
            self.encoder.stop()
            self.job.abort()
            return

        progress = (position / self.job.asset["duration"]) * 100
        self.job.set_progress(progress, f"Encoding: {progress:.02f}%")

    def on_main(self):
        db = DB()
        self.job = get_job(
            self.id_service, [action.id for action in self.actions], db=db
        )
        if not self.job:
            return
        logging.info("Got {}".format(self.job))

        asset = self.job.asset
        action = self.job.action

        try:
            job_params = self.job.settings
        except Exception:
            log_traceback()
            job_params = {}

        tasks = action.settings.findall("task")
        job_start_time = time.time()

        for id_task, task in enumerate(tasks):
            try:
                using = task.attrib["mode"]
                if using not in available_encoders:
                    continue
            except KeyError:
                self.job.fail(
                    f"Wrong encoder type specified for task {id_task}", critical=True
                )
                return

            logging.debug(f"Configuring task {id_task+1} of {len(tasks)}")

            self.encoder = available_encoders[using](asset, task, job_params)
            result = self.encoder.configure()

            if not result:
                self.job.fail(result.message, critical=True)
                return

            logging.info(f"Starting task {id_task+1} of {len(tasks)}")

            self.encoder.start()
            self.encoder.wait(self.progress_handler)

            if self.job.status != JobState.IN_PROGRESS:
                return

            logging.debug(f"Finalizing task {id_task+1} of {len(tasks)}")
            result = self.encoder.finalize()

            if not result:
                self.job.fail(result.message)
                return
            job_params = self.encoder.params

        job = self.job  # noqa

        for success_script in action.settings.findall("success"):
            logging.info("Executing success script")
            success_script = success_script.text
            exec(success_script)

        elapsed_time = time.time() - job_start_time
        duration = asset["duration"] or 1
        speed = duration / elapsed_time

        self.job.done(f"Finished in {s2words(elapsed_time)} ({speed:.02f}x realtime)")

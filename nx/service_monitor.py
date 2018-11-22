from nebulacore import *

from .connection import *
from .agents import BaseAgent

import subprocess

__all__ = ["ServiceMonitor"]

class ServiceMonitor(BaseAgent):
    def on_init(self):
        self.services = {}
        db = DB()
        db.query("SELECT id, pid FROM services WHERE host=%s", [config["host"]])
        for id_service, pid in db.fetchall():
            if pid:
                self.kill_service(pid)
        db.query("UPDATE services SET state = 0 WHERE host=%s", [config["host"]])
        db.commit()


    def on_shutdown(self):
        services = self.services.keys()
        for id_service in services:
            self.kill_service(id_service=id_service)


    @property
    def running_services(self):
        result = []
        for id_service in self.services.keys():
            proc, title = self.services[id_service]
            if proc.poll() == None:
                result.append((id_service, title))
        return result


    def main(self):
        db = DB()
        db.query("SELECT id, service_type, title, autostart, loop_delay, settings, state, pid, last_seen FROM services WHERE host=%s", [config["host"]])

        #
        # Start / stop service
        #

        for id, service_type, title, autostart, loop_delay, settings, state, pid, last_seen in db.fetchall():
            messaging.send(
                    "service_state",
                    id=id,
                    state=state,
                    autostart=autostart,
                    last_seen=last_seen
                )
            if state == STARTING: # Start service
                if not id in self.services.keys():
                    self.start_service(id, title, db = db)

            elif state == KILL: # Kill service
                if id in self.services.keys():
                    self.kill_service(self.services[id][0].pid)

        #
        # Real service state
        #

        service_list = [i for i in self.services.keys()]
        for id_service in service_list:
            proc, title = self.services[id_service]
            if proc.poll() == None:
                continue
            del self.services[id_service]
            logging.warning("Service {} ({}) terminated".format(title,id_service))
            db.query("UPDATE services SET state=0 WHERE id = %s", [id_service])
            db.commit()

        #
        # Autostart
        #

        db.query("SELECT id, title, state, autostart FROM services WHERE host=%s AND state=0 AND autostart=true", [config["host"]])
        for id, title, state, autostart in db.fetchall():
            if not id in self.services.keys():
                logging.debug("AutoStarting service {} ({})".format(title, id))
                self.start_service(id, title)


    def start_service(self, id_service, title, db=False):
        proc_cmd = [
            os.path.join(config["nebula_root"], "manage.py"),
            "run",
            str(id_service),
            "\"{}\"".format(title)
            ]

        logging.info("Starting service {} - {}".format(id_service, title))

        self.services[id_service] = [
                subprocess.Popen(proc_cmd, cwd=config["nebula_root"]),
                title
            ]


    def stop_service(self, id_service, title, db=False):
        logging.info("Stopping service {} ({})".format(id_service, title))


    def kill_service(self, pid=False, id_service=False):
        if id_service in self.services:
            pid = self.services[id_service][0].pid
        if pid == os.getpid() or pid == 0:
            return
        logging.info("Attempting to kill PID {}".format(pid))
        os.system(os.path.join(config["nebula_root"], "support", "kill_tree.sh {}".format(pid)))


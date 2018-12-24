from nebulacore import *
from .connection import *

__all__ = ["BaseService"]

class BaseService(object):
    def __init__(self, id_service, settings=False):
        logging.debug("Initializing service")
        self.id_service = id_service
        self.settings   = settings
        config["id_service"] = id_service

        try:
            self.on_init()
        except SystemExit:
            pass
            sys.exit(0)
        except:
            log_traceback("Unable to initialize service")
            self.shutdown()
        else:
            db = DB()
            db.query("UPDATE services SET last_seen = %d, state=1 WHERE id=%d" % (time.time(), self.id_service))
            db.commit()
        logging.goodnews("Service started")

    def on_init(self):
        pass

    def on_main(self):
        pass

    def soft_stop(self):
        logging.info("Soft stop requested")
        db = DB()
        db.query("UPDATE services SET state=3 WHERE id=%s", [self.id_service])
        db.commit()

    def shutdown(self, no_restart=False):
        logging.info("Shutting down")
        if no_restart:
            db = DB()
            db.query("UPDATE services SET autostart=FALSE WHERE id=%s", [self.id_service])
            db.commit()
        sys.exit(0)

    def heartbeat(self):
        db = DB()
        db.query("SELECT state FROM services WHERE id=%s", [self.id_service])
        try:
            state = db.fetchall()[0][0]
        except IndexError:
            state = KILL
        else:
            if state == 0:
                state = 1
            db.query("UPDATE services SET last_seen=%s, state=%s WHERE id=%s", [time.time(), state, self.id_service])
            db.commit()

        if state in [STOPPED, STOPPING, KILL]:
            self.shutdown()

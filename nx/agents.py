import time
import threading

from nebulacore import *

__all__ = ["BaseAgent"]

class BaseAgent():
    def __init__(self, once=False):
        self.first_run = True
        self.thread = None
        self.is_running = False
        self.should_run = True
        try:
            self.on_init()
        except:
            log_traceback()
            critical_error(f"Unable to start {self.__class__.__name__}")
        if once:
            self.main()
        else:
            self.thread = threading.Thread(target=self.run, daemon=True)
            self.thread.start()

    def on_init(self):
        pass

    def on_shutdown(self):
        pass

    def shutdown(self):
        self.should_run = False

    def run(self):
        self.is_running = True
        logging.info(f"Starting {self.__class__.__name__}")
        while self.should_run:
            try:
                self.main()
            except:
                log_traceback()
            self.first_run = False
            time.sleep(2)
        self.on_shutdown()
        self.is_running = False

    def main(self):
        pass

from nebula import *

class BaseEncoder(object):
    def __init__(self, asset, task, job_params):
        self.asset = asset
        self.task = task
        self.params = vars
        self.proc = None
        self.progress  = 0
        self.message = "Started"

    def configure(self):
        pass

    def start(self):
        pass

    def stop(self):
        pass

    def work(self):
        pass


    def finalize(self):
        pass

    @property
    def is_running(self):
        return False

def temp_file(id_storage, ext):
    temp_dir = os.path.join(
            storages[id_storage].local_path,
            ".nx",
            "creating"
        )
    if not os.path.isdir(temp_dir):
        try:
            os.makedirs(temp_dir)
        except Exception:
            log_traceback()
            return False
    return get_temp(ext, temp_dir)

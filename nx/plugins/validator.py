__all__ = ["get_validator"]

import imp

from nx import *
from nx.plugins.common import get_plugin_path

class ValidatorPlugin(object):
    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self._db = False

    @property
    def db(self):
        if not self._db:
            if "db" in self.kwargs:
                self._db = self.kwargs["db"]
            else:
                self._db = DB()
        return self._db


def get_validator(object_type, **kwargs):
    plugin_path = get_plugin_path("validator")
    if not plugin_path:
        return

    f = FileObject(plugin_path, object_type + ".py")
    if f.exists:
        try:
            py_mod = imp.load_source(object_type, f.path)
        except:
            log_traceback("Unable to load plugin {}".format(plugin_name))
            return
    else:
        return

    if not "Plugin" in dir(py_mod):
        logging.error("No plugin class found in {}".format(f))
        return
    return py_mod.Plugin(**kwargs)



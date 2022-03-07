import os
import imp
import time
import sys

from nxtools import logging

from nx.base_service import BaseService
from nx.plugins import get_plugin_path


class Service(BaseService):
    def on_init(self):
        self.exec_init = False
        self.exec_main = False
        self.plugin = False

        if "script" in self.settings.attrib:
            fname = self.settings.attrib["script"]
            result = self.load_from_script(fname)
        else:
            result = self.load_from_settings()

        if not result:
            logging.error("Unable to load worker. Shutting down")
            self.shutdown(no_restart=True)

    def load_from_script(self, fname):
        if not fname.lower().endswith(".py"):
            fname += ".py"
        workerdir = get_plugin_path("worker")
        if not workerdir:
            logging.error("Plugin path is not set. Storage unmouted?")
            time.sleep(5)
            sys.exit(0)
        script_path = os.path.join(workerdir, fname)
        mod_name, file_ext = os.path.splitext(fname)

        if not os.path.exists(script_path):
            logging.error(f"Plugin {fname} not found")
            return False

        py_mod = imp.load_source(mod_name, script_path)

        if "Plugin" not in dir(py_mod):
            logging.error(f"No plugin class found in {fname}")
            return False

        logging.debug(f"Loading plugin {mod_name}")
        self.plugin = py_mod.Plugin(self)
        self.plugin.on_init()
        return True

    def load_from_settings(self):
        try:
            self.exec_init = self.settings.find("init").text
        except Exception:
            pass
        try:
            self.exec_main = self.settings.find("main").text
        except Exception:
            pass
        if self.exec_init:
            exec(self.exec_init)
        return True

    def on_main(self):
        if self.plugin:
            self.plugin.on_main()
        elif self.exec_main:
            exec(self.exec_main)

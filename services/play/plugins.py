__all__ = ["PlayoutPlugins"]

import os
import imp

from nxtools import logging, log_traceback

from nx.plugins import get_plugin_path


class PlayoutPlugins(object):
    def __init__(self, service):
        self.service = service
        self.plugins = []

    def load(self):
        self.plugins = []
        bpath = get_plugin_path("playout")
        if not bpath:
            logging.warning("Playout plugins directory does not exist")
            return

        for plugin_name in self.service.channel_config.get("plugins", []):
            plugin_file = plugin_name + ".py"
            plugin_path = os.path.join(bpath, plugin_file)

            if not os.path.exists(plugin_path):
                logging.error(f"Plugin {plugin_name} does not exist")
                continue

            try:
                py_mod = imp.load_source(plugin_name, plugin_path)
            except Exception:
                log_traceback(f"Unable to load plugin {plugin_name}")
                continue

            if "Plugin" not in dir(py_mod):
                logging.error(f"No plugin class found in {plugin_file}")
                continue

            logging.info("Initializing plugin {}".format(plugin_name))
            self.plugins.append(py_mod.Plugin(self.service))
            self.plugins[-1].title = self.plugins[-1].title or plugin_name.capitalize()
        logging.info("All plugins initialized")

    def __getitem__(self, key):
        return self.plugins[key]

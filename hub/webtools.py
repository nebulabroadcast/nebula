import imp

from nebula import *

class WebTools():
    def __init__(self):
        self.load()

    def load(self):
        logging.info("Reloading webtools")
        self.tools = {}
        global plugin_path
        if not plugin_path:
            return
        tooldir = os.path.join(plugin_path, "webtools")
        for plugin_path in get_files(tooldir,recursive=False, hidden=False, exts=["py"]):
            plugin_name = plugin_path.base_name
            try:
                py_mod = imp.load_source(plugin_name, plugin_path.path)
            except Exception:
                log_traceback("Unable to load plugin {}".format(plugin_name))
                continue

            if not "Plugin" in dir(py_mod):
                logging.error("No plugin class found in {}".format(plugin_file))
                continue

            Plugin = py_mod.Plugin
            if hasattr(Plugin, "title"):
                title = Plugin.title
            else:
                title = plugin_name.capitalize()
            self.tools[plugin_name] = [Plugin, title]


    @property
    def links(self):
        return [[k, self.tools[k][1]] for k in sorted(self.tools.keys())]


webtools = WebTools()


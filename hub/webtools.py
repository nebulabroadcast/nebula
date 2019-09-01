import imp

from nx import *
from nx.plugins import get_plugin_path

class WebTools():
    def __init__(self):
        self.load()

    def load(self):
        logging.info("Reloading webtools")
        self.tools = {}
        tooldir = get_plugin_path("webtools")
        if not tooldir:
            return
        for plugin_entry in os.listdir(tooldir):
            entry_path = os.path.join(tooldir, plugin_entry)
            if os.path.isdir(entry_path):
                plugin_module_path = os.path.join(entry_path, plugin_entry + ".py")
                if not os.path.exists(plugin_module_path):
                    continue
            elif not os.path.splitext(plugin_entry)[1] == ".py":
                continue
            else:
                plugin_module_path = os.path.join(tooldir, plugin_entry)

            plugin_module_path = FileObject(plugin_module_path)
            plugin_name = plugin_module_path.base_name
            try:
                py_mod = imp.load_source(plugin_name, plugin_module_path.path)
            except Exception:
                log_traceback("Unable to load plugin {} ({})".format(plugin_name, plugin_module_path))
                continue

            if not "Plugin" in dir(py_mod):
                logging.error("No plugin class found in {}".format(plugin_file))
                continue

            Plugin = py_mod.Plugin
            if hasattr(Plugin, "title"):
                title = Plugin.title
            else:
                title = plugin_name.capitalize()
            logging.info("Loaded plugin {} ({})".format(plugin_name, plugin_module_path))
            self.tools[plugin_name] = [Plugin, title]


    @property
    def links(self):
        return [[k, self.tools[k][1]] for k in sorted(self.tools.keys()) if self.tools[k][0].gui]


webtools = WebTools()


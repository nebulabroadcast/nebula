import imp
from nebula import *


class APIMethods(dict):
    def __init__(self):
        super(APIMethods, self).__init__()
        self.load()

    def load(self):
        self.clear()
        self.update({
                "get"      : api_get,
                "set"      : api_set,
                "browse"   : api_browse,
                "delete"   : api_delete,
                "settings" : api_settings,
                "rundown"  : api_rundown,
                "order"    : api_order,
                "schedule" : api_schedule,
                "jobs"     : api_jobs,
                "playout"  : api_playout,
                "actions"  : api_actions,
                "send"     : api_send,
                "solve"    : api_solve,
                "system"   : api_system,
            })
        logging.info("Reloading API methods")
        apidir = get_plugin_path("api")
        if not apidir:
            return

        for plugin_entry in os.listdir(apidir):
            entry_path = os.path.join(apidir, plugin_entry)
            if os.path.isdir(entry_path):
                plugin_module_path = os.path.join(entry_path, plugin_entry + ".py")
                if not os.path.exists(plugin_module_path):
                    continue
            elif not os.path.splitext(plugin_entry)[1] == ".py":
                continue
            else:
                plugin_module_path = os.path.join(apidir, plugin_entry)

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

            plugin = py_mod.Plugin()
            logging.info("Loaded plugin {} ({})".format(plugin_name, plugin_module_path))
            self[plugin_name] = plugin



api_methods = APIMethods()

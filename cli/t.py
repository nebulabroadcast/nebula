import os
import imp

from .common import *

def t(*args):
    tools_dir = os.path.join(plugin_path, "tools")
    plugin_name = args[0]

    try:
        fp, pathname, description = imp.find_module(plugin_name, [tools_dir])
    except ImportError:
        critical_error("unable to locate module: " + plugin_name)

    try:
        module = imp.load_module(plugin_name, fp, pathname, description)
    except Exception :
        log_traceback()
        critical_error("Unable ot open tool " + plugin_name)

    logging.user = plugin_name
    margs = args[1:] if len(args) > 1 else []
    module.Plugin(*margs)

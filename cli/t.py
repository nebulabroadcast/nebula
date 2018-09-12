import os
import imp

from .common import *

def t(*args):
    tools_dir = os.path.join(plugin_path, "tools")

    plugin_name = args[0]
    plugin_file = plugin_name + ".py"
    path = os.path.join(tools_dir, plugin_file)

    mod = imp.load_source(plugin_name, path)

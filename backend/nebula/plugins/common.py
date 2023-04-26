import os
import sys

from nebula.config import config

modules_root = os.path.join(config.plugin_dir, "common")
if os.path.isdir(modules_root):
    for pydirname in os.listdir(modules_root):
        pydir = os.path.join(modules_root, pydirname)
        if not os.path.isdir(pydir):
            continue
        if pydir in sys.path:
            continue
        sys.path.append(pydir)

#!/usr/bin/env python3

from cli import *
from nxtools import logging, log_traceback, critical_error
import os
import sys

orig_dir = os.getcwd()
if orig_dir != "/opt/nebula":
    os.chdir("/opt/nebula")


logging.user = "nebula"

if __name__ == "__main__":
    command = os.path.basename(sys.argv[0])

    if command.startswith("nx"):
        module = command[2:]
        args = sys.argv[1:]
    else:
        if len(sys.argv) < 2:
            critical_error("This command takes at least one argument")
        module = sys.argv[1]
        args = sys.argv[2:]
        if module not in modules:
            critical_error("Unknown module '{}'".format(module))

    try:
        modules[module](*args)
    except SystemExit:
        pass
    except Exception:
        log_traceback()

os.chdir(orig_dir)

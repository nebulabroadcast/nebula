#!/usr/bin/env python3

if __name__ == "__main__":
    print()

import os
import sys
import time

from nxtools import logging, log_traceback, critical_error

from nx.core.common import config
from nx.plugins import get_plugin_path

#
# Start agents only if this script is executed (not imported)
#

if __name__ == "__main__":
    from nx.storage_monitor import StorageMonitor
    from nx.service_monitor import ServiceMonitor
    from nx.system_monitor import SystemMonitor

    # Crontab sync

    cron_file = "/etc/cron.d/nebula"

    def sync_cron():
        plugin_path = get_plugin_path("cron")
        if not plugin_path:
            return False

        cron_source = os.path.join(plugin_path, config["host"])
        if not os.path.exists(cron_source):
            return False

        if not os.path.isdir("/etc/cron.d"):
            os.makedirs("/etc/cron.d")

        if not os.path.exists(cron_file):
            pass
        elif os.path.getmtime(cron_file) < os.path.getmtime(cron_source):
            pass
        else:
            return True

        logging.info("Installing new crontab")
        src = open(cron_source).read()
        with open(cron_file, "w") as f:
            f.write(src)
        return True

    def del_cron():
        if os.path.exists(cron_file):
            logging.info("Removing crontab")
            os.remove(cron_file)

    # Agents

    def are_running(agents):
        return any([agent.is_running for agent in agents])

    def shutdown(agents):
        logging.info("Shutting down agents")
        for agent in agents:
            agent.shutdown()
        while are_running(agents):
            time.sleep(0.5)

    agents = []
    for Agent in [StorageMonitor, ServiceMonitor, SystemMonitor]:
        try:
            agents.append(Agent())
        except Exception:
            log_traceback()
            shutdown(agents)
            critical_error(f"Unable to start {Agent.__name__}")

    # Main loop

    while True:
        try:
            sync_cron() or del_cron()
            time.sleep(10)
        except KeyboardInterrupt:
            break
        except Exception:
            log_traceback()
            time.sleep(10)

    # Shutdown (CTRL+C)

    print()
    try:
        logging.warning("Shutting down nebula. Please wait...")
        shutdown(agents)
        logging.goodnews("Exiting gracefully")
        sys.exit(0)
    except KeyboardInterrupt:
        print()
        logging.warning("Immediate shutdown enforced. This may cause problems")
        sys.exit(1)


else:
    # This is a very dirty hack to keep old plugins working.

    import os  # noqa
    import sys  # noqa
    import json  # noqa
    import time  # noqa

    from nxtools import *  # noqa

    from nx.db import *  # noqa
    from nx.plugins import *  # noqa
    from nx.core.common import *  # noqa
    from nx.helpers import *  # noqa
    from nx.objects import *  # noqa
    from nx.cache import *  # noqa
    from nx.messaging import *  # noqa

    from nx.legacy.constants import *  # noqa

#!/usr/bin/env python3
#
#    This file is part of Nebula media asset management.
#
#    Nebula is free software: you can redistribute it and/or modify
#    it under the terms of the GNU General Public License as published by
#    the Free Software Foundation, either version 3 of the License, or
#    (at your option) any later version.
#
#    Nebula is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU General Public License for more details.
#
#    You should have received a copy of the GNU General Public License
#    along with Nebula. If not, see <http://www.gnu.org/licenses/>.
#

if __name__ == "__main__":
    print ()

import os
import sys
import rex

#
# Env setup
#

if sys.version_info[:2] < (3, 0):
    reload(sys)
    sys.setdefaultencoding('utf-8')

from nx import *

config["nebula_root"] = os.path.abspath(os.getcwd())
if not config["nebula_root"] in sys.path:
    sys.path.insert(0, config["nebula_root"])

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
            time.sleep(.5)

    agents = []
    for Agent in [StorageMonitor, ServiceMonitor, SystemMonitor]:
        try:
            agents.append(Agent())
        except Exception:
            log_traceback()
            shutdown(agents)
            critical_error("Unable to start {}".format(Agent.__name__))

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

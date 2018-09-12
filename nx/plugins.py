__all__ = ["plugin_path", "PlayoutPlugin", "PlayoutPluginSlot", "WorkerPlugin", "ValidatorPlugin"]

import os
import sys

from nebulacore import *

from .connection import *

#
# Plugin root
#

plugin_path = os.path.join(
        storages[int(config.get("plugin_storage", 1))].local_path,
        config.get("plugin_root", ".nx/scripts/v5")
    )

if not os.path.exists(plugin_path):
    logging.warning("Plugin root dir does not exist")
    plugin_path = False

#
# Common python scripts
#

if plugin_path:
    common_dir = os.path.join(plugin_path, "common")
    if os.path.isdir(common_dir) and os.listdir(common_dir) and not common_dir in sys.path:
        sys.path.insert(0, common_dir)

#
# Playout plugins
#

class PlayoutPluginSlot(object):
    def __init__(self, slot_type, slot_name, **kwargs):
        assert slot_type in ["action", "text", "number", "select"]
        self.type = slot_type
        self.name = slot_name
        self.opts = kwargs

    def __getitem__(self, key):
        return self.opts.get(key, False)

    def __setitem__(self, key, value):
        self.opts[key] = value

    @property
    def title(self):
        return self.opts.get("title", self.name.capitalize())

class PlayoutPlugin(object):
    def __init__(self, service):
        self.service = service
        self.id_layer = self.service.caspar_feed_layer + 1
        self.slots = []
        self.tasks = []
        self.on_init()
        self.busy = False
        self.title = False

    @property
    def slot_manifest(self):
        result = []
        for id_slot, slot in enumerate(self.slots):
            s = {
                    "id" : id_slot,
                    "name" : slot.name,
                    "type" : slot.type,
                    "title" : slot.title,
                }
            for key in slot.opts:
                if key in s:
                    continue
                val = slot.opts[key]
                if callable(val):
                    s[key] = val()
                else:
                    s[key] = val
            result.append(s)
        return result

    @property
    def current_asset(self):
        return self.service.current_asset

    @property
    def current_item(self):
        return self.service.current_item

    def main(self):
        if not self.busy:
            self.busy = True
            try:
                self.on_main()
            except Exception:
                log_traceback()
            self.busy = False

    def layer(self, id_layer=False):
        if not id_layer:
            id_layer = self.id_layer
        return "{}-{}".format(self.service.caspar_channel, id_layer)

    def query(self, query):
        return self.service.controller.query(query)

    def on_init(self):
        pass

    def on_change(self):
        pass

    def on_command(self, action, **kwargs):
        pass

    def on_main(self):
        if not self.tasks:
            return
        if self.tasks[0]():
            del self.tasks[0]
            return

#
# Object validator plugin
#

class ValidatorPlugin(object):
    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self._db = False

    @property
    def db(self):
        if not self._db:
            if "db" in self.kwargs:
                self._db = self.kwargs["db"]
            else:
                self._db = DB()
        return self._db


#
# Worker service plugin
#

class WorkerPlugin(object):
    def __init__(self, service):
        self.service = service

    @property
    def config(self):
        return self.service.config

    def on_init(self):
        pass

    def on_main(self):
        pass

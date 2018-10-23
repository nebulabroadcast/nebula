__all__ = ["plugin_path", "PlayoutPlugin", "PlayoutPluginSlot", "WorkerPlugin", "ValidatorPlugin", "SolverPlugin"]

import os
import sys

from nebulacore import *

from .objects import *
from .helpers import *
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


#
# Rundown solver plugin
#

class SolverPlugin(object):
    def __init__(self, placeholder, **kwargs):
        self.db = kwargs.get("db", DB())
        self.placeholder = placeholder
        self.bin = self.placeholder.bin
        self.event = self.placeholder.event
        self.new_items = []
        self._next_event = None
        self._needed_duration = 0

    @property
    def next_event(self):
        if not self._next_event:
            self.db.query(
                    "SELECT meta FROM events WHERE id_channel = %s AND start > %s",
                    [self.event["id_channel"], self.event["start"]]
                )
            try:
                self._next_event = Event(meta=self.db.fetchall()[0][0], db=self.db)
            except:
                self._next_event = Event(meta={
                        "id_channel" : self.event["id_channel"],
                        "start" : self.event["start"] + 3600
                    })
        return self._next_event

    @property
    def current_duration(self):
        dur = 0
        for item in self.new_items:
            dur += item.duration
        return dur

    @property
    def needed_duration(self):
        if not self._needed_duration:
            dur = self.next_event["start"] - self.event["start"]
            for item in self.bin.items:
                if item.id == self.placeholder.id:
                    continue
                dur -= item.duration
            self._needed_duration = dur
        print ("need", self._needed_duration)
        return self._needed_duration

    def main(self):
        message = "Solver returned no items. Keeping placeholder."
        try:
            for new_item in self.solve():
                self.new_items.append(new_item)
        except Exception:
            message = log_traceback()
            self.new_items = []

        if not self.new_items:
            return NebulaResponse(501, message)

        i = 0
        for item in self.bin.items:
            i +=1
            if item.id == self.placeholder.id:
                item.delete()
                for new_item in self.new_items:
                    i+=1
                    new_item["id_bin"] = self.bin.id
                    new_item["position"] = i
                    new_item.save()
            if item["position"] != i:
                item["position"] = i
                item.save()

        bin_refresh([self.bin.id], db=self.db)
        messaging.send("objects_changed", objects=[self.bin.id], object_type="bin")
        return NebulaResponse(200, "ok")



    def solve(self):
        """
        This method must return a list or yield items
        (no need to specify order or bin values) which
        replaces the original placeholder.
        """
        return []

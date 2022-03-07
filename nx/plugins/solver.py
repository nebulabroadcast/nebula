import sys
import imp

from nxtools import logging, format_time, log_traceback, FileObject

from nx.core.common import NebulaResponse
from nx.db import DB
from nx.objects import Bin, Item, Event
from nx.helpers import bin_refresh
from nx.plugins.common import get_plugin_path


class SolverPlugin(object):
    def __init__(self, placeholder, **kwargs):
        self.db = kwargs.get("db", DB())
        self.init_solver(placeholder)
        self.affected_bins = []

    def init_solver(self, placeholder):
        self.placeholder = placeholder
        self.bin = self.placeholder.bin
        self.event = self.placeholder.event
        self.new_items = []
        self._next_event = None
        self._needed_duration = 0
        self.solve_next = None

    @property
    def next_event(self):
        if not self._next_event:
            self.db.query(
                """
                SELECT meta FROM events
                WHERE id_channel = %s AND start > %s
                ORDER BY start ASC LIMIT 1
                """,
                [self.event["id_channel"], self.event["start"]],
            )
            try:
                self._next_event = Event(meta=self.db.fetchall()[0][0], db=self.db)
            except IndexError:
                self._next_event = Event(
                    meta={
                        "id_channel": self.event["id_channel"],
                        "start": self.event["start"] + 3600,
                    }
                )
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
        return self._needed_duration

    def block_split(self, tc):
        if tc <= self.event["start"] or tc >= self.next_event["start"]:
            logging.error(
                "Timecode of block split must be between "
                "the current and next event start times"
            )
            return False

        logging.info(f"Splitting {self.event} at {format_time(tc)}")
        logging.info(
            "Next event is {} at {}".format(
                self.next_event, self.next_event.show("start")
            )
        )
        new_bin = Bin(db=self.db)
        new_bin.save(notify=False)

        new_placeholder = Item(db=self.db)
        new_placeholder["id_bin"] = new_bin.id
        new_placeholder["position"] = 0

        for key in self.placeholder.meta.keys():
            if key not in ["id_bin", "position", "id_asset", "id"]:
                new_placeholder[key] = self.placeholder[key]

        new_placeholder.save(notify=False)
        new_bin.append(new_placeholder)
        new_bin.save(notify=False)

        new_event = Event(db=self.db)
        new_event["id_channel"] = self.event["id_channel"]
        new_event["title"] = "Split block"
        new_event["start"] = tc
        new_event["id_magic"] = new_bin.id

        new_event.save(notify=False)

        self._needed_duration = None
        self._next_event = None
        self.solve_next = new_placeholder

        if new_bin.id not in self.affected_bins:
            self.affected_bins.append(new_bin.id)

        return True

    def main(self, debug=False, counter=0):
        logging.info("Solving {}".format(self.placeholder))
        message = "Solver returned no items. Keeping placeholder."
        try:
            for new_item in self.solve():
                self.new_items.append(new_item)
                if debug:
                    logging.debug("Appending {}".format(new_item.asset))
        except Exception:
            message = log_traceback("Error occured during solving")
            return NebulaResponse(501, message)

        if debug:
            return NebulaResponse(202)

        if not self.new_items:
            return NebulaResponse(204, message)

        i = 0
        for item in self.bin.items:
            i += 1
            if item.id == self.placeholder.id:
                item.delete()
                for new_item in self.new_items:
                    i += 1
                    new_item["id_bin"] = self.bin.id
                    new_item["position"] = i
                    new_item.save(notify=False)
            if item["position"] != i:
                item["position"] = i
                item.save(notify=False)

        if self.bin.id not in self.affected_bins:
            self.affected_bins.append(self.bin.id)

        if self.solve_next:
            self.init_solver(self.solve_next)
            return self.main(debug=debug, counter=len(self.new_items) + counter)

        bin_refresh(self.affected_bins, db=self.db)
        return NebulaResponse(
            200, "Created {} new items".format(len(self.new_items) + counter)
        )

    def solve(self):
        """
        This method must return a list or yield items
        (no need to specify order or bin values) which
        replaces the original placeholder.
        """
        return []


def get_solver(solver_name):
    if not get_plugin_path("solver"):
        return

    for f in [
        FileObject(get_plugin_path("solver"), solver_name + ".py"),
        FileObject(get_plugin_path("solver"), solver_name, solver_name + ".py"),
    ]:

        if f.exists:
            sys.path.insert(0, f.dir_name)
            try:
                py_mod = imp.load_source(solver_name, f.path)
                break
            except Exception:
                log_traceback("Unable to load plugin {}".format(solver_name))
                return
    else:
        logging.error("{} does not exist".format(f))
        return

    if "Plugin" not in dir(py_mod):
        logging.error("No plugin class found in {}".format(f))
        return
    return py_mod.Plugin

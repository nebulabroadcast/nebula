__all__ = ["CasparController"]

import os
import time
import telnetlib

try:
    import _thread as thread
except ImportError:
    import thread


from nebula import *

from nxtools.caspar import CasparCG
from ccginfo import *


class CasparController(object):
    def __init__(self, parent):
        self.parent = parent

        self.caspar_host         = parent.channel_config.get("caspar_host", "localhost")
        self.caspar_port         = int(parent.channel_config.get("caspar_port", 5250))
        self.caspar_channel      = int(parent.channel_config.get("caspar_channel", 1))
        self.caspar_feed_layer   = int(parent.channel_config.get("caspar_feed_layer", 10))

        self.current_item = False
        self.current_fname = False
        self.cued_item = False
        self.cued_fname = False
        self.cueing = False
        self.force_cue = False

        self.paused   = False
        self.stopped  = False
        self.stalled  = False

        self.fpos = self.fdur = 0
        self.cued_in = self.cued_out = self.current_in = self.current_out = 0

        self.bad_requests = 0
        self.request_time = self.recovery_time = time.time()

        if not self.connect():
            logging.error("Unable to connect CasparCG Server. Shutting down.")
            self.parent.shutdown()
            return

        Parser = get_info_parser(self.infc)
        self.parser = Parser(self.infc, self.caspar_channel)

        thread.start_new_thread(self.work, ())

    @property
    def id_channel(self):
        return self.parent.id_channel

    @property
    def host(self):
        return self.caspar_host

    @property
    def port(self):
        return self.caspar_port

    def connect(self):
        if not hasattr(self, "cmdc"):
            self.cmdc = CasparCG(self.host, self.port)
            self.infc = CasparCG(self.host, self.port)
        return self.cmdc.connect() and self.infc.connect()

    def query(self, *args, **kwargs):
        return self.cmdc.query(*args, **kwargs)


    @property
    def fps(self):
        return self.parent.fps

    @property
    def position(self):
        return int(self.fpos - self.current_in)

    @property
    def duration(self):
        if self.parent.current_live:
            return 0
        dur = self.fdur
        if self.current_out > 0:
            dur -= dur - self.current_out
        if self.current_in > 0:
            dur -= self.current_in
        return dur

    def work(self):
        while True:
            try:
                self.main()
                time.sleep(.01)
            except Exception:
                log_traceback()
            time.sleep(.3)

    def main(self):
        info = self.parser.get_info(self.caspar_feed_layer)
        if not info:
            logging.warning("Channel {} update stat failed".format(self.id_channel))
            self.bad_requests += 1
            if self.bad_requests > 10:
                logging.error("Connection lost. Reconnecting...")
                if self.connect():
                    logging.goodnews("Connection estabilished")
                else:
                    logging.error("Connection call failed")
                    time.sleep(2)
            time.sleep(.3)
            return
        else:
            self.request_time = time.time()
        self.bad_requests = 0

        current_fname = info["current"]
        cued_fname = info["cued"]

        #
        #
        # Auto recovery
        #
#        if not current_fname and time.time() - self.recovery_time > 20:
#            self.parent.channel_recover()
#            return
#        self.recovery_time = time.time()

        if cued_fname and (not self.paused) and (info["pos"] == self.fpos) and (not self.stopped) and not self.parent.current_live and self.cued_item and (not self.cued_item["run_mode"]):
            if self.stalled and self.stalled < time.time() - 5:
                logging.warning("Stalled for a long time")
                logging.warning("Taking stalled clip (pos: {})".format(self.fpos))
                self.take()
            elif not self.stalled:
                logging.debug("Playback is stalled")
                self.stalled = time.time()
        elif self.stalled:
            logging.debug("No longer stalled")
            self.stalled = False

        self.fpos = info["pos"]
        self.fdur = info["dur"]


        #
        # Playlist advancing
        #

        advanced = False

        if self.cueing and self.cueing == current_fname and not cued_fname and not self.parent.cued_live:
            logging.warning("Using short clip workaround")
            self.current_item  = self.cued_item
            self.current_fname = current_fname
            self.current_in    = self.cued_in
            self.current_out   = self.cued_out
            self.cued_in = self.cued_out = 0
            advanced = True
            self.cued_item = False
            self.cueing = False
            self.cued_fname = False

        elif (not cued_fname) and (current_fname) and not self.parent.cued_live:
            if current_fname == self.cued_fname:
                self.current_item  = self.cued_item
                self.current_fname = self.cued_fname
                self.current_in    = self.cued_in
                self.current_out   = self.cued_out
                self.cued_in = self.cued_out = 0
                advanced = True
            self.cued_item = False

        elif (not current_fname) and (not cued_fname) and self.parent.cued_live:
            self.current_item  = self.cued_item
            self.current_fname = "LIVE"
            self.current_in    = 0
            self.current_out   = 0
            self.cued_in = self.cued_out = 0
            advanced = True
            self.cued_item = False
            self.parent.on_live_enter()

        if advanced:
            try:
                self.parent.on_change()
            except Exception:
                log_traceback("Playout on_change failed")

        if self.current_item and not self.cued_item and not self.cueing:
            self.parent.cue_next()

        elif self.force_cue:
            logging.info("Forcing cue next")
            self.parent.cue_next()
            self.force_cue = False

        if self.cueing:
            if cued_fname == self.cued_fname:
                logging.debug("Cued", self.cueing)
                self.cueing = False
            else:
                logging.debug("Cueing", self.cueing)


        if self.cued_item and cued_fname and cued_fname != self.cued_fname and not self.cueing:
            logging.warning("Cue mismatch: IS: {} SHOULDBE: {}".format(cued_fname, self.cued_fname))
            self.cued_item = False


        try:
            self.parent.on_progress()
        except Exception:
            log_traceback("Playout on_main failed")
        self.current_fname = current_fname
        self.cued_fname = cued_fname


    def cue(self, fname, item, **kwargs):
        auto       = kwargs.get("auto", True)
        layer      = kwargs.get("layer", self.caspar_feed_layer)
        play       = kwargs.get("play", False)
        loop       = kwargs.get("loop", False)
        mark_in    = item.mark_in()
        mark_out   = item.mark_out()

        marks = ""
        if loop:
            marks += " LOOP"
        if mark_in:
            marks += " SEEK {}".format(int(mark_in * self.parser.seek_fps))
        if mark_out and mark_out < item["duration"] and mark_out > mark_in:
            marks += " LENGTH {}".format(int((mark_out - mark_in) * self.parser.seek_fps))

        if play:
            q = "PLAY {}-{} {}{}".format(
                    self.caspar_channel,
                    layer,
                    fname,
                    marks
                )
        else:
            q = "LOADBG {}-{} {} {} {}".format(
                    self.caspar_channel,
                    layer,
                    fname,
                    ["","AUTO"][auto],
                    marks
                )

        self.cueing = fname
        result = self.query(q)

        if result.is_error:
            message = "Unable to cue \"{}\" {} - args: {}".format(fname, result.data, str(kwargs))
            self.cued_item  = Item()
            self.cued_fname = False
            self.cueing     = False
        else:
            self.cued_item  = item
            self.cued_fname = fname
            self.cued_in    = mark_in*self.fps
            self.cued_out   = mark_out*self.fps
            message = "Cued item {} ({})".format(self.cued_item, fname)

        return NebulaResponse(result.response, message)


    def clear(self, **kwargs):
        layer = layer or self.caspar_feed_layer
        result = self.query("CLEAR {}-{}".format(self.channel, layer))
        return NebulaResponse(result.response, result.data)


    def take(self, **kwargs):
        layer = kwargs.get("layer", self.caspar_feed_layer)
        if not self.cued_item or self.cueing:
            return NebulaResponse(400, "Unable to take. No item is cued.")
        self.paused = False
        result = self.query("PLAY {}-{}".format(self.caspar_channel, layer))
        if result.is_success:
            if self.parent.current_live:
                self.parent.on_live_leave()
            message = "Take OK"
            self.stalled = False
            self.paused = False
            self.stopped = False
        else:
            message = "Take command failed: " + result.data
        return NebulaResponse(result.response, message)


    def retake(self, **kwargs):
        layer = kwargs.get("layer", self.caspar_feed_layer)
        if self.parent.current_live:
            return NebulaResponse(409, "Unable to retake live item")
        seekparam = str(int(self.current_item.mark_in() * self.fps))
        if self.current_item.mark_out():
            seekparam += " LENGTH {}".format(int((self.current_item.mark_out() - self.current_item.mark_in()) * self.parser.seek_fps))
        q = "PLAY {}-{} {} SEEK {}".format(self.caspar_channel, layer, self.current_fname, seekparam)
        self.paused = False
        result = self.query(q)
        if result.is_success:
            message = "Retake OK"
            self.stalled = False
            self.paused = False
            self.stopped = False
            self.parent.cue_next()
        else:
            message = "Take command failed: " + result.data
        return NebulaResponse(result.response, message)


    def freeze(self, **kwargs):
        layer = kwargs.get("layer", self.caspar_feed_layer)
        if self.parent.current_live:
            return NebulaResponse(409, "Unable to freeze live item")
        if not self.paused:
            q = "PAUSE {}-{}".format(self.caspar_channel, layer)
            message = "Playback paused"
            new_val = True
        else:
            if self.parser.protocol >= 2.07:
                q = "RESUME {}-{}".format(self.caspar_channel, layer)
            else:
                length = "LENGTH {}".format(int(
                    (self.current_out or self.fdur) - self.fpos
                    ))
                q = "PLAY {}-{} {} SEEK {} {}".format(
                        self.caspar_channel,
                        layer,
                        self.current_fname,
                        self.fpos,
                        length
                    )
            message = "Playback resumed"
            new_val = False

        result = self.query(q)
        if result.is_success:
            self.paused = new_val
            if self.parser.protocol < 2.07 and not new_val:
                self.force_cue = True
        else:
            message = result.data
        return NebulaResponse(result.response, message)


    def abort(self, **kwargs):
        layer = kwargs.get("layer", self.caspar_feed_layer)
        if not self.cued_item:
            return NebulaResponse(400, "Unable to abort. No item is cued.")
        q = "LOAD {}-{} {}".format(self.caspar_channel, layer, self.cued_fname)
        if self.cued_item.mark_in():
            q += " SEEK {}".format(int(self.cued_item.mark_in() * self.parser.seek_fps))
        if self.cued_item.mark_out():
            q += " LENGTH {}".format(int((self.cued_item.mark_out() - self.cued_item.mark_in()) * self.parser.seek_fps))
        result =  self.query(q)
        if result.is_success:
            self.paused = True
        return NebulaResponse(result.response, result.data)

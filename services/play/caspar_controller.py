__all__ = ["CasparController"]

import os
import time
import telnetlib

try:
    import _thread as thread
except ImportError:
    import thread


from nx import *
from nxtools.caspar import CasparCG

def basefname(fname):
    """Platform dependent path splitter (caspar is always on win)"""
    return os.path.splitext(fname.split("\\")[-1])[0]


class CasparController(object):
    def __init__(self, parent):
        self.parent = parent

        self.current_item = False
        self.current_fname = False
        self.cued_item = False
        self.cued_fname = False
        self.cueing = False
        self.force_cue = False

        self.paused   = False
        self.stopped  = False
        self.stalled  = False

        self.pos = self.dur = self.fpos = self.fdur = 0
        self.cued_in = self.cued_out = self.current_in = self.current_out = 0

        self.bad_requests = 0
        self.request_time = self.recovery_time = time.time()

        self.connect()
        res = self.query("VERSION")
        if res.data.startswith("2.0.6"):
            self.version = 2.06
        elif res.data.startswith("2.0.7"):
            self.version = 2.07
        else:
            self.version = 2.1
        logging.debug("CasparCG Version {}".format(self.version))

        thread.start_new_thread(self.work, ())

    @property
    def id_channel(self):
        return self.parent.id_channel

    @property
    def host(self):
        return self.parent.caspar_host

    @property
    def port(self):
        return self.parent.caspar_port

    def connect(self):
        if not hasattr(self, "cmdc"):
            self.cmdc = CasparCG(self.host, self.port)
            self.infc = CasparCG(self.host, self.port)
            return True
        return self.cmdc.connect() and self.infc.connect()

    def query(self, *args, **kwargs):
        return self.cmdc.query(*args, **kwargs)

    def update_stat(self):
        result = self.infc.query(
                "INFO {}-{}".format(
                    self.parent.caspar_channel,
                    self.parent.caspar_feed_layer
                )
            )
        if result.is_error:
            logging.error("Unable to get CasparCG status: Error {} ({})".format(
                    result.code,
                    result.data
                ))
            return False
        try:
            xstat = xml(result.data)
        except Exception:
            log_traceback()
            return False
        else:
            self.request_time = time.time()
            self.xstat = xstat
            return True

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
            except Exception:
                log_traceback()
            time.sleep(.3)

    def main(self):
        if not self.update_stat():
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
        self.bad_requests = 0
        if not self.xstat:
            return False
        video_layer = self.xstat

        #
        # Current clip
        #

        if self.version >= 2.1:
            try:
                fg_prod = video_layer.find("foreground").find("producer")
                if fg_prod.find("type").text == "image-producer":
                    self.fpos = self.fdur = self.pos = self.dur = 0
                    current_fname = basefname(fg_prod.find("location").text)
                elif fg_prod.find("type").text == "empty-producer":
                    current_fname = False # No video is playing right now
                else:
                    self.fpos = int(fg_prod.find("file-frame-number").text)
                    self.fdur = int(fg_prod.find("file-nb-frames").text)
                    self.pos  = int(fg_prod.find("frame-number").text)
                    self.dur  = int(fg_prod.find("nb-frames").text)
                    current_fname = basefname(fg_prod.find("filename").text)
            except Exception:
#                if not self.parent.current_live:
#                    logging.debug("Nothing is playing")
                current_fname = False

            try:
                bg_prod = video_layer.find("background").find("producer")
                if bg_prod.find("type").text == "image-producer":
                    cued_fname = basefname(bg_prod.find("location").text)
                elif bg_prod.find("type").text == "empty-producer":
                    cued_fname = False # No video is cued
                else:
                    cued_fname = basefname(bg_prod.find("filename").text)
            except Exception:
#                if not self.parent.cued_live:
#                    logging.debug("Nothing is cued")
                cued_fname = False

        else:

            try:
                fg_prod = video_layer.find("foreground").find("producer")
                if fg_prod.find("type").text == "image-producer":
                    self.fpos = self.fdur = self.pos = self.dur = 0
                    current_fname = basefname(fg_prod.find("location").text)
                elif fg_prod.find("type").text == "empty-producer":
                    current_fname = False # No video is playing right now
                else:
                    self.fpos = int(fg_prod.find("file-frame-number").text)
                    self.fdur = int(fg_prod.find("file-nb-frames").text)
                    self.pos  = int(video_layer.find("frame-number").text)
                    self.dur  = int(video_layer.find("nb_frames").text)
                    current_fname = basefname(fg_prod.find("filename").text)
            except Exception:
#                if not self.parent.current_live:
#                    logging.debug("Nothing is playing")
                current_fname = False

            try:
                bg_prod = video_layer.find("background").find("producer").find("destination").find("producer")
                if bg_prod.find("type").text == "image-producer":
                    cued_fname = basefname(bg_prod.find("location").text)
                elif bg_prod.find("type").text == "empty-producer":
                    cued_fname = False # No video is cued
                else:
                    cued_fname = basefname(bg_prod.find("filename").text)
            except Exception:
#                if not self.parent.cued_live:
#                    logging.debug("Nothing is cued")
                cued_fname = False

        #
        # Auto recovery
        #

#        if not current_fname and time.time() - self.recovery_time > 20:
#            self.parent.channel_recover()
#            return
#        self.recovery_time = time.time()

        if cued_fname and (not current_fname) and (not self.paused) and (not self.stopped) and not self.parent.current_live:
            if self.stalled > time.time() - 2:
                logging.warning("Taking stalled clip")
                self.take()
            elif not self.stalled:
                self.stalled = time.time()
        else:
            self.stalled = False

        #
        # Playlist advancing
        #

        advanced = False

        if (not cued_fname) and (current_fname) and not self.parent.cued_live:
            if current_fname == self.cued_fname:
                self.current_item  = self.cued_item
                self.current_fname = self.cued_fname
                self.current_in    = self.cued_in
                self.current_out   = self.cued_out
                self.cued_in = self.cued_out = 0
                advanced = True
            self.cued_item = False

        if (not current_fname) and (not cued_fname) and self.parent.cued_live:
            self.current_item  = self.cued_item
            self.current_fname = "LIVE"
            self.current_in    = 0
            self.current_out   = 0
            self.cued_in = self.cued_out = 0
            advanced = True
            self.cued_item = False
            self.parent.on_live_enter()

        if self.force_cue:
            logging.info("Forcing cue next")
            self.parent.cue_next()
            self.force_cue = False

        if advanced:
            self.parent.on_change()
            self.parent.cue_next()

        if self.cued_item and cued_fname and cued_fname != self.cued_fname and not self.cueing:
            logging.warning("Cue mismatch: IS: {} SHOULDBE: {}".format(cued_fname, self.cued_fname))
            self.cued_item = False

        if self.current_item and not self.cued_item and not self.cueing:
            self.parent.cue_next()

        self.parent.on_progress()
        self.current_fname = current_fname
        self.cued_fname = cued_fname


    def cue(self, fname, item, **kwargs):
        auto       = kwargs.get("auto", True)
        layer      = kwargs.get("layer", self.parent.caspar_feed_layer)
        play       = kwargs.get("play", False)
        mark_in    = item.mark_in()
        mark_out   = item.mark_out()

        marks = ""
        if mark_in:
            marks += " SEEK {}".format(int(float(mark_in) * self.fps))
        if mark_out:
            marks += " LENGTH {}".format(int((float(mark_out) - float(mark_in)) * self.fps))

        if play:
            q = "PLAY {}-{} {}{}".format(
                    self.parent.caspar_channel,
                    layer,
                    fname,
                    marks
                )
        else:
            q = "LOADBG {}-{} {} {} {}".format(
                    self.parent.caspar_channel,
                    layer,
                    fname,
                    ["","AUTO"][auto],
                    marks
                )

        result = self.query(q)

        if result.is_error:
            message = "Unable to cue \"{}\" {} - args: {}".format(fname, result.data, str(kwargs))
            self.cued_item  = Item()
            self.cued_fname = False
        else:
            self.cued_item  = item
            self.cued_fname = fname
            self.cued_in    = mark_in*self.fps
            self.cued_out   = mark_out*self.fps
            message = "Cued item {} ({})".format(self.cued_item, fname)
        return NebulaResponse(result.response, message)


    def clear(self, **kwargs):
        layer = layer or self.parent.caspar_feed_layer
        result = self.query("CLEAR {}-{}".format(self.channel, layer))
        return NebulaResponse(result.response, result.data)

    def take(self, **kwargs):
        layer = kwargs.get("layer", self.parent.caspar_feed_layer)
        if not self.cued_item:
            return NebulaResponse(400, "Unable to take. No item is cued.")
        self.paused = False
        result = self.query("PLAY {}-{}".format(self.parent.caspar_channel, layer))
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
        layer = kwargs.get("layer", self.parent.caspar_feed_layer)
        if self.parent.current_live:
            return NebulaResponse(409, "Unable to retake live item")
        seekparam = str(int(self.current_item.mark_in() * self.fps))
        if self.current_item.mark_out():
            seekparam += " LENGTH {}".format(int((self.current_item.mark_out() - self.current_item.mark_in()) * self.fps))
        q = "PLAY {}-{} {} SEEK {}".format(self.parent.caspar_channel, layer, self.current_fname, seekparam)
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
        layer = kwargs.get("layer", self.parent.caspar_feed_layer)
        if self.parent.current_live:
            return NebulaResponse(409, "Unable to freeze live item")
        if not self.paused:
            q = "PAUSE {}-{}".format(self.parent.caspar_channel, layer)
            message = "Playback paused"
            new_val = True
        else:
            if self.version >= 2.07:
                q = "RESUME {}-{}".format(self.parent.caspar_channel, layer)
            else:
                length = "LENGTH {}".format(int(
                    (self.current_out or self.fdur) - self.fpos
                    ))
                q = "PLAY {}-{} {} SEEK {} {}".format(
                        self.parent.caspar_channel,
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
            if self.version < 2.07 and not new_val:
                self.force_cue = True
        else:
            message = result.data
        return NebulaResponse(result.response, message)

    def abort(self, **kwargs):
        layer = kwargs.get("layer", self.parent.caspar_feed_layer)
        if not self.cued_item:
            return NebulaResponse(400, "Unable to abort. No item is cued.")
        q = "LOAD {}-{} {}".format(self.parent.caspar_channel, layer, self.cued_fname)
        if self.cued_item.mark_in():
            q += " SEEK {}".format(int(self.cued_item.mark_in() * self.fps))
        if self.cued_item.mark_out():
            q += " LENGTH {}".format(int((self.cued_item.mark_out() - self.cued_item.mark_in()) * self.fps))
        result =  self.query(q)
        if result.is_success:
            self.paused = True
        return NebulaResponse(result.response, result.data)

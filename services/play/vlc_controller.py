__all__ = ["VlcController"]

import os
import time
import vlc

try:
    import _thread as thread
except ImportError:
    import thread


from nebula import *


class VlcMedia(object):
    def __init__(self, instance, full_path, item, **kwargs):
        self.auto       = kwargs.get("auto", True)
        loop       = kwargs.get("loop", False)
        self.mark_in    = item.mark_in()
        self.mark_out   = item.mark_out()

        self.item = item
        self.fname = full_path

        self.parsed = False
        self.media = instance.media_new(self.fname)
        if loop:
            self.media.add_option(":repeat")
        # NB: Times are input as float seconds, but all other VLC functions use milliseconds.
        if self.mark_in:
            self.media.add_option(":start-time=%f" % self.mark_in)
        if self.mark_out:
            self.media.add_option(":stop-time=%f" % self.mark_out)

        self.media.event_manager().event_attach(
            vlc.EventType.MediaParsedChanged, self.parse_callback)

        ret = self.media.parse_with_options(0, -1)
        if ret != 0:
            raise ValueError("failed to parse media")

        # TODO: set self.fname from self.media.get_mrl()?

    def __del__(self):
        self.media.release()

    def parse_callback(self, event):
        self.parsed = True
        # TODO: Provide a way to block on this and check if media.get_parsed_status() == MediaParsedStatus.done
        logging.debug("parsed media", self.fname, event.u.new_status)
        # Clean up event handler to prevent memory leak
        self.media.event_manager().event_detach(vlc.EventType.MediaParsedChanged)

    @property
    def mark_in_ms(self):
        return self.mark_in * 1000

    @property
    def mark_out_ms(self):
        return self.mark_out * 1000

class VlcController(object):
    def __init__(self, parent):
        self.parent = parent

        # VLC always uses milliseconds for timestamps
        self.parent.fps = 1000

        self.caspar_feed_layer   = int(parent.channel_config.get("caspar_feed_layer", 10))

        self.current = None
        self.cued = None

        self.args = parent.channel_config.get("vlc_args", "--fullscreen")

        self.instance = vlc.Instance(self.args)
        self.media_player = self.instance.media_player_new()
        if parent.channel_config.get("vlc_fullscreen", True):
            self.media_player.set_fullscreen(True)
        self.media_player.event_manager().event_attach(
            vlc.EventType.MediaPlayerEndReached, self.next_item_callback)
        # MediaPlayerMediaChanged

        thread.start_new_thread(self.work, ())

    @property
    def current_item(self):
        if self.current:
            return self.current.item

    @property
    def cued_item(self):
        if self.cued:
            return self.cued.item

    @property
    def current_fname(self):
        if self.current:
            return self.current.fname
        return False

    @property
    def cued_fname(self):
        if self.cued:
            return self.cued.fname
        return False

    @property
    def cueing(self):
        return self.cued and not self.cued.parsed

    @cueing.setter
    def cueing(self, value):
        # Ignore play service's attempt to set this
        pass

    @property
    def request_time(self):
        """Time of last status update (always now for VLC)."""
        return time.time()

    @property
    def id_channel(self):
        return self.parent.id_channel

    @property
    def fps(self):
        return self.parent.fps

    @property
    def fpos(self):
        return self.media_player.get_time()

    @property
    def fdur(self):
        return self.media_player.get_length()

    @property
    def paused(self):
        return self.media_player.get_state() == vlc.State.Paused

    @property
    def position(self):
        if self.current:
            return int(self.fpos - self.current.mark_in_ms)
        return 0

    @property
    def duration(self):
        if self.parent.current_live or not self.current:
            return 0
        dur = self.fdur
        if self.current.mark_out_ms > 0:
            dur = self.current.mark_out_ms
        if self.current.mark_in_ms > 0:
            dur -= self.current.mark_in_ms
        return dur

    def work(self):
        while True:
            try:
                self.main()
            except Exception:
                log_traceback()
            time.sleep(.3)

    def next_item_callback(self, event):
        print(event.u)
        if self.cued and self.cued.auto:
            # If we try to manipulate the player from within the callback, we'll deadlock.
            thread.start_new_thread(self.take, ())

    def main(self):
        if self.current_item and not self.cued_item:
            self.parent.cue_next()

        try:
            self.parent.on_progress()
        except Exception:
            log_traceback("Playout on_main failed")


    def cue(self, item, full_path, **kwargs):
        self.cued = VlcMedia(self.instance, full_path, item, **kwargs)
        layer      = kwargs.get("layer", self.caspar_feed_layer)
        play       = kwargs.get("play", False)

        if play:
            return self.take()

        message = "Cued item {} ({})".format(self.cued_item, full_path)

        return NebulaResponse(200, message)


    def clear(self, **kwargs):
        layer = layer or self.caspar_feed_layer
        self.media_player.stop()
        self.current = None
        self.cued = None
        return NebulaResponse(200, "all items removed")


    def take(self, **kwargs):
        layer = kwargs.get("layer", self.caspar_feed_layer)
        if not self.cued_item:
            return NebulaResponse(400, "Unable to take. No item is cued.")

        self.media_player.set_media(self.cued.media)
        self.media_player.play()

        self.current = self.cued
        self.cued = None

        self.parent.on_change()

        # TODO: Check if media actually starts playing
        if True:
            if self.parent.current_live:
                self.parent.on_live_leave()
            code = 200
            message = "Take OK"
        else:
            code = 500
            message = "Take command failed"
        return NebulaResponse(code, message)


    def retake(self, **kwargs):
        layer = kwargs.get("layer", self.caspar_feed_layer)
        if self.parent.current_live:
            return NebulaResponse(409, "Unable to retake live item")
        if not self.current:
            return NebulaResponse(400, "Unable to retake. No item is playing.")
        self.media_player.set_time(self.current.mark_in_ms)
        message = "Retake OK"
        self.parent.cue_next()
        return NebulaResponse(200, message)


    def freeze(self, **kwargs):
        layer = kwargs.get("layer", self.caspar_feed_layer)
        if self.parent.current_live:
            return NebulaResponse(409, "Unable to freeze live item")
        if not self.paused:
            self.media_player.set_pause(True)
            message = "Playback paused"
        else:
            self.media_player.set_pause(False)
            message = "Playback resumed"

        return NebulaResponse(200, message)


    def abort(self, **kwargs):
        layer = kwargs.get("layer", self.caspar_feed_layer)
        if not self.cued:
            return NebulaResponse(400, "Unable to abort. No item is cued.")
        self.media_player.next()
        self.media_player.set_pause(True)
        return NebulaResponse(200, "Current item aborted")

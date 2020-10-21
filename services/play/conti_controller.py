__all__ = ["VlcController"]

import os
import time
import rex

rex.require("https://github.com/immstudios/conti")

from nebula import *
from conti import *

CONTI_DEBUG["source"] = True
CONTI_DEBUG["encoder"] = False


class NebulaContiSource(ContiSource):
    def __init__(self, parent, path, **kwargs):
        super(NebulaContiSource, self).__init__(parent, path, **kwargs)
        self.item = kwargs["item"]

class NebulaConti(Conti):
    def append_next_item(self):
        self.parent.parent.cue_next()

    def progress_handler(self):
        self.parent.position = self.current.position * self.parent.fps
        self.parent.duration = self.current.duration * self.parent.fps
        self.parent.request_time = time.time()
        self.parent.parent.on_progress()
    

class ContiController(object):
    def __init__(self, parent):
        self.parent = parent
        self.cueing = False
        self.request_time = time.time()
        settings = {
            "playlist_length" : 2,
            "blocking" : False,
            "outputs" : self.parent.channel_config.get("conti_outputs", [])
        }
        settings.update(self.parent.channel_config.get("conti_settings", {}))
        self.conti = NebulaConti(None, **settings)
        self.conti.parent = self

    @property
    def current_item(self):
        return self.conti.current.item if self.conti.current else False

    @property
    def current_fname(self):
        return self.conti.current.path if self.conti.current else False

    @property
    def cued_item(self):
        return self.cued.item if self.cued else False

    @property
    def cued_fname(self):
        return self.cued.path if self.cued else False

    @property
    def id_channel(self):
        return self.parent.id_channel

    @property
    def fps(self):
        return self.parent.fps

    @property
    def paused(self):
        return self.conti.paused

    def cue(self, item, full_path, **kwargs):
        kwargs["item"] = item
        kwargs["meta"] = item.asset.meta
        self.cued = NebulaContiSource(self.conti, full_path, **kwargs)
        #TODO: add per-source filters here
        self.cued.open()

        if not self.cued:
            return NebulaResponse(500)

        if len(self.conti.playlist) > 1:
            del(self.conti.playlist[1:])
        self.conti.playlist.append(self.cued)

        if not self.conti.started:
            logging.info("Starting Conti")
            self.conti.start()

        if kwargs.get("play", False):
            return self.take()
        message = "Cued item {} ({})".format(self.cued_item, full_path)
        return NebulaResponse(200, message)


    def take(self, **kwargs):
        self.conti.take()
        return NebulaResponse(200)

    def freeze(self, **kwargs):
        self.conti.freeze()
        return NebulaResponse(200)

    def retake(self, **kwargs):
        return NebulaResponse(200)

    def abort(self, **kwargs):
        self.conti.abort()
        return NebulaResponse(200)
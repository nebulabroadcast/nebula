import time
import fractions
import threading

from nxtools import *
from nxtools.caspar import *

from .oscserver import OSCServer


class CasparClip():
    def __init__(self, channel):
        self.name = ""
        self.mark_in = 0
        self.mark_out = 0
        self.position = 0
        self.duration = 0
        self.fps = channel.fps
        self.paused = False
        self.loop = False
        self.producer = "empty"

    def handle_osc(self, address, *args):
        if address == ["paused"]:
            self.paused = args[0]
        elif address == ["loop"]:
            self.loop = args[0]
        elif address == ["producer"]:
            self.producer = args[0]
            if self.producer == "empty":
                self.name = ""
        elif address == ["file", "name"]:
            self.name = args[0]

        elif address == ["file", "time"]:
            self.position, self.duration = args

        elif address[-1] == "fps":
            try:
                self.fps = fractions.Fraction(*args)
            except ZeroDivisionError:
                pass

        else:
            return
            print(address, args)

    def __len__(self):
        return self.producer != "empty"

class CasparChannel():
    def __init__(self):
        self.fps = fractions.Fraction(25, 1)
        self.layers = {}

    def __getitem__(self, key):
        return self.layers.get(key, None)

    def handle_osc(self, address, *args):
        if address == ["framerate"]:
            self.fps = fractions.Fraction(*args)
        elif address == ["mixer", "audio", "volume"]:
            self.volume = args
        elif address[0:2] == ["stage", "layer"]:
            try:
                layer = int(address[2])
            except (IndexError, ValueError):
                return False
            if not layer in self.layers:
                self.layers[layer] = {
                    "background" :  CasparClip(self),
                    "foreground" :  CasparClip(self)
                }
            self.layers[layer][address[3]].handle_osc(address[4:], *args)
        else:
            print("CHAN ERR", address, args)
            return False

class CasparOSCServer():
    def __init__(self, osc_port=5253):
        self.osc_port = osc_port
        self.channels = {}
        self.last_osc = time.time()
        self.osc_server = OSCServer("", self.osc_port, self.handle_osc)
        self.osc_thread = threading.Thread(target=self.serve_forever, args=())
        self.osc_thread.name = 'OSC Server'
        self.osc_thread.start()

    def __getitem__(self, key):
        return self.channels.get(key, None)

    def serve_forever(self):
        self.osc_server.serve_forever()
        logging.info("OSC server stopped")

    def shutdown(self):
        self.osc_server.shutdown()

    def handle_osc(self, address, *args):
        if type(address) == str:
            address = address.split("/")
        if len(address) < 2:
            return False
        if address[1] != "channel":
            print("CTRL ERR", address)
            return False
        try:
            channel = int(address[2])
        except (KeyError, ValueError):
            return False

        if not channel in self.channels:
            self.channels[channel] = CasparChannel()
        self.channels[channel].handle_osc(address[3:], *args)

        self.last_osc = time.time()

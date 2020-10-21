from nx import *


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
        self.playout_dir = os.path.join(
                storages[self.channel_config["playout_storage"]].local_path,
                self.channel_config["playout_dir"]
            )
        self.id_layer = 0
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
    def id_channel(self):
        return self.service.id_channel

    @property
    def channel_config(self):
        return self.service.channel_config

    @property
    def current_asset(self):
        return self.service.current_asset

    @property
    def current_item(self):
        return self.service.current_item

    @property
    def position(self):
        return self.service.controller.position

    @property
    def duration(self):
        return self.service.controller.duration

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
        return "{}-{}".format(self.service.controller.caspar_channel, id_layer)

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

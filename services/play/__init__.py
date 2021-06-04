import threading

from nebula import *

from .request_handler import *
from .plugins import *

DEFAULT_STATUS = {
    "status" : OFFLINE,
}

def create_controller(parent):
    engine = parent.channel_config.get("engine")
    if engine == "vlc":
        from .vlc import VlcController
        return VlcController(parent)
    elif engine == "conti":
        from .conti import ContiController
        return ContiController(parent)
    elif engine == "casparcg":
        from .casparcg import CasparController
        return CasparController(parent)
    elif engine == "casparcg2":
        from .casparcg2 import CasparController
        return CasparController(parent)


class Service(BaseService):
    def on_init(self):
        if not config["playout_channels"]:
            logging.error("No playout channel configured")
            self.shutdown(no_restart=True)
            return

        try:
            self.id_channel = int(self.settings.find("id_channel").text)
            self.channel_config = config["playout_channels"][self.id_channel]
        except Exception:
            logging.error("Invalid channel specified")
            self.shutdown(no_restart=True)
            return

        self.fps = float(self.channel_config.get("fps", 25.0))

        self.current_asset = Asset()
        self.current_event = Event()

        self.last_run = False
        self.last_info = 0
        self.current_live = False
        self.cued_live = False
        self.auto_event = 0

        self.status_key = f"playout_status/{self.id_channel}"

        self.plugins = PlayoutPlugins(self)
        self.controller = create_controller(self)
        if not self.controller:
            logging.error("Invalid controller specified")
            self.shutdown(no_restart=True)
            return

        port = int(self.channel_config.get("controller_port", 42100))
        logging.info(f"Using port {port} for the HTTP interface.")

        self.server = HTTPServer(('', port), PlayoutRequestHandler)
        self.server.service = self
        self.server.methods = {
                "take" : self.take,
                "cue" : self.cue,
                "cue_forward" : self.cue_forward,
                "cue_backward" : self.cue_backward,
                "freeze" : self.freeze,
                "set" : self.set,
                "retake" : self.retake,
                "abort" : self.abort,
                "stat" : self.stat,
                "plugin_list" : self.plugin_list,
                "plugin_exec" : self.plugin_exec,
                "recover" : self.channel_recover
            }
        self.server_thread = threading.Thread(target=self.server.serve_forever, args=(), daemon=True)
        self.server_thread.start()
        self.plugins.load()
        self.on_progress()
        #self.channel_recover()


    def on_shutdown(self):
        if self.controller and hasattr(self.controller, "shutdown"):
            self.controller.shutdown()

    #
    # API Commands
    #

    def cue(self, **kwargs):
        db = kwargs.get("db", DB())
        lcache = kwargs.get("cache", cache)

        if "item" in kwargs and isinstance(kwargs["item"], Item):
            item = kwargs["item"]
            del(kwargs["item"])
        elif "id_item" in kwargs:
            item = Item(int(kwargs["id_item"]), db=db, cache=lcache)
            item.asset
            del(kwargs["id_item"])
        else:
            return NebulaResponse(400, "Unable to cue. No item specified")

        if not item:
            return NebulaResponse(404, f"Unable to cue. {item} does not exist")

        if item["item_role"] == "live":
            logging.info("Next is item is live")
            fname = self.channel_config.get("live_source", "EMPTY")
            response = self.controller.cue(fname, item, **kwargs)
            if response.is_success:
                self.cued_live = True
            return response

        if not item["id_asset"]:
            return NebulaResponse(400, f"Unable to cue virtual {item}")

        asset = item.asset
        playout_status = asset.get(self.status_key, DEFAULT_STATUS)["status"]

        kwargs["fname"] = kwargs["full_path"] = None
        if playout_status in [ONLINE, CREATING, UNKNOWN]:
            kwargs['fname'] = asset.get_playout_name(self.id_channel)
            kwargs['full_path'] = asset.get_playout_full_path(self.id_channel)

        if not kwargs["full_path"] and self.channel_config.get("allow_remote") and asset["status"] in (ONLINE, CREATING):
            kwargs["fname"] = kwargs["full_path"] = asset.file_path
            kwargs["remote"] = True

        if not kwargs["full_path"]:
            return NebulaResponse(404, f"Unable to cue {get_object_state_name(playout_status)} playout file")

        kwargs["mark_in"] = item["mark_in"]
        kwargs["mark_out"] = item["mark_out"]

        if item["run_mode"] == 1:
            kwargs["auto"] = False
        else:
            kwargs["auto"] = True

        kwargs["loop"] = bool(item["loop"])

        self.cued_live = False
        return self.controller.cue(item=item,  **kwargs)


    def cue_forward(self, **kwargs):
        cc = self.controller.cued_item
        if not cc:
            return NebulaResponse(204)
        db = DB()
        nc = get_next_item(cc.id, db=db, force="next")
        return self.cue(item=nc, db=db)


    def cue_backward(self, **kwargs):
        cc = self.controller.cued_item
        if not cc:
            return NebulaResponse(204)
        db = DB()
        nc = get_next_item(cc.id, db=db, force="prev")
        return self.cue(item=nc, db=db, level=5)



    def cue_next(self, **kwargs):
        logging.info("Cueing the next item")
        self.controller.cueing = True #TODO: deprecate. controller should handle this
        item = kwargs.get("item", self.controller.current_item)
        level = kwargs.get("level", 0)
        db = kwargs.get("db", DB())
        play = kwargs.get("play", False)
        lcache = kwargs.get("cache", Cache())

        if not item:
            logging.warning("Unable to cue next item. No current clip")
            return

        item_next = get_next_item(item.id, db=db, cache=lcache, force_next_event=bool(self.auto_event))

        if item_next["run_mode"] == 1:
            auto = False
        else:
            auto = True

        logging.info("Auto-cueing {}".format(item_next))
        result = self.cue(item=item_next, play=play, cache=lcache, auto=auto)

        if result.is_error:
            if level > 5:
                logging.error("Cue it yourself....")
                return False
            logging.warning(f"Unable to cue {item_next} ({result.message}). Trying next one.")
            item_next = self.cue_next(item=item_next, db=db, level=level+1, play=play)
        return item_next


    def take(self, **kwargs):
        return self.controller.take(**kwargs)

    def freeze(self, **kwargs):
        return self.controller.freeze(**kwargs)

    def retake(self, **kwargs):
        return self.controller.retake(**kwargs)

    def abort(self, **kwargs):
        return self.controller.abort(**kwargs)

    def set(self, **kwargs):
        """ Set a controller property.
        This is controller specific.
        Args:
            key (str): Name of the property
            value: Value to be set
        """
        key = kwargs.get("key", None)
        value = kwargs.get("value", None)
        if key == None or value == None:
            return NebulaResponse(400)
        if hasattr(self.controller, "set"):
            return self.controller.set(key, value)
        return NebulaResponse(501)
        return NebulaResponse(200)


    def stat(self, **kwargs):
        """Returns current status of the playback"""
        return NebulaResponse(200, data=self.playout_status)


    def plugin_list(self, **kwargs):
        result = []
        for id_plugin, plugin in enumerate(self.plugins):
            if not plugin.slots:
                continue
            result.append({
                "id" : id_plugin,
                "title" : plugin.title,
                "slots": plugin.slot_manifest,
            })
        return NebulaResponse(200, data=result)


    def plugin_exec(self, **kwargs):
        action = kwargs.get("action_name", False)
        data = json.loads(kwargs.get("data", "{}"))
        id_plugin = int(kwargs["id_plugin"])
        logging.debug("Executing playout plugin:", action, id_plugin, data)
        if not action:
            return NebulaResponse(400, "No plugin action requested")
        try:
            plugin = self.plugins[id_plugin]
        except (KeyError, IndexError):
            log_traceback()
            return NebulaResponse(400, "No such action")
        if plugin.on_command(action, **data):
            return NebulaResponse(200)
        else:
            return NebulaResponse(500, "Playout plugin failed")


    #
    # Props
    #

    #TODO: Find out whether this is actually needed
    @property
    def current_item(self):
        return self.controller.current_item


    @property
    def playout_status(self):
        return {
            "id_channel"    : self.id_channel,
            "fps"           : float(self.fps),
            "time_unit"     : self.controller.time_unit, #This is a transitional option. In future versions, frames will be deprecated
            "current_item"  : self.controller.current_item.id if self.controller.current_item else False,
            "cued_item"     : self.controller.cued_item.id if self.controller.cued_item else False,
            "position"      : self.controller.position,
            "duration"      : self.controller.duration,
            "current_title" : self.controller.current_item["title"] if self.controller.current_item else "(no clip)",
            "cued_title"    : self.controller.cued_item["title"]    if self.controller.cued_item    else "(no clip)",
            "request_time"  : self.controller.request_time,
            "paused"        : self.controller.paused,
            "loop"          : self.controller.loop if hasattr(self.controller, "loop") else False,
            "cueing"        : self.controller.cueing if hasattr(self.controller, "cueing") else False,
            "id_event"      : self.current_event.id if self.current_event else False,
            "current_fname" : self.controller.current_fname,
            "cued_fname"    : self.controller.cued_fname,
        }

    #
    # Events
    #


    def on_progress(self):
        if not self.controller:
            return # fix the race condition, when on_progress is created, but not yet added to the service
        if time.time() - self.last_info > .3:
            messaging.send("playout_status", **self.playout_status)
            self.last_info = time.time()

        for plugin in self.plugins:
            plugin.main()


    def on_change(self):
        if not self.controller.current_item:
            return

        item = self.controller.current_item
        db = DB()

        self.current_asset = item.asset or Asset()
        self.current_event = item.event or Event()

        logging.info (f"Advanced to {item}")

        if self.last_run:
            db.query("UPDATE asrun SET stop = %s WHERE id = %s",  [int(time.time()) , self.last_run])
            db.commit()

        if self.current_item:
            db.query(
                    "INSERT INTO asrun (id_channel, id_item, start) VALUES (%s, %s, %s)",
                    [self.id_channel, item.id, time.time()]
                )
            self.last_run = db.lastid()
            db.commit()
        else:
            self.last_run = False

        for plugin in self.plugins:
            try:
                plugin.on_change()
            except Exception:
                log_traceback("Plugin on-change failed")


    def on_live_enter(self):
        logging.goodnews("Entering a live event")
        self.current_live = True
        self.cued_live = False


    def on_live_leave(self):
        logging.goodnews("Leaving a live event")
        self.current_live = False


    def on_main(self):
        """
        This method checks if the following event
        should start automatically at given time.
        It does not handle AUTO playlist advancing
        """

        current_item = self.controller.current_item # YES. CURRENT
        if not current_item:
            return

        db = DB()

        current_event = get_item_event(current_item.id, db=db)

        if not current_event:
            logging.warning("Unable to fetch the current event")
            return

        db.query(
                """SELECT DISTINCT(e.id), e.meta, e.start FROM events AS e, items AS i
                    WHERE e.id_channel = %s
                    AND e.start > %s
                    AND e.start <= %s
                    AND i.id_bin = e.id_magic
                ORDER BY e.start ASC LIMIT 1""",
                [self.id_channel, current_event["start"], time.time()]
            )

        try:
            next_event = Event(meta=db.fetchall()[0][1], db=db)
        except IndexError:
            self.auto_event = False
            return

        if self.auto_event == next_event.id:
            return

        run_mode = int(next_event["run_mode"]) or RUN_AUTO

        if not run_mode:
            return

        elif not next_event.bin.items:
            return

        elif run_mode == RUN_MANUAL:
            pass # ?????

        elif run_mode == RUN_SOFT:
            logging.info("Soft cue", next_event)
            play = self.current_live # if current item is live, take next block/lead out automatically
            for i, r in enumerate(current_event.bin.items):
                if r["item_role"] == "lead_out":
                    try:
                        self.cue(
                                id_channel=self.id_channel,
                                id_item=current_event.bin.items[i+1].id,
                                db=db,
                                play=play
                            )
                        self.auto_event = next_event.id
                        break
                    except IndexError:
                        pass
            else:
                try:
                    id_item = next_event.bin.items[0].id
                except KeyError:
                    id_item = 0
                if not self.controller.cued_item:
                    return
                if id_item != self.controller.cued_item.id:
                    self.cue(
                            id_channel=self.id_channel,
                            id_item=id_item,
                            db=db
                        )
                    self.auto_event = next_event.id
                return

        elif run_mode == RUN_HARD:
            logging.info("Hard cue", next_event)
            id_item = next_event.bin.items[0].id
            self.cue(
                    id_channel=self.id_channel,
                    id_item=id_item,
                    play=True,
                    db=db
                )
            self.auto_event = next_event.id
            return



    def channel_recover(self):
        logging.warning("Performing recovery")

        db = DB()
        db.query("SELECT id_item, start FROM asrun WHERE id_channel = %s ORDER BY id DESC LIMIT 1", [self.id_channel])
        try:
            last_id_item, last_start = db.fetchall()[0]
        except IndexError:
            logging.error("Unable to perform recovery. Last item information is not available")
        last_item = Item(last_id_item, db=db)
        last_item.asset

        self.controller.current_item = last_item
        self.controller.cued_item = False
        self.controller.cued_fname = False

        if last_start + last_item.duration <= time.time():
            logging.info(f"Last {last_item} has been broadcasted. starting next item")
            new_item = self.cue_next(item=last_item, db=db, play=True)
        else:
            logging.info(f"Last {last_item} has not been fully broadcasted. Loading next one")
            new_item = self.cue_next(item=last_item, db=db)

        if not new_item:
            logging.error("Recovery failed. Unable to cue")
            return

        self.on_change()



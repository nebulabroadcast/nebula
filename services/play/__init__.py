try:
    import _thread as thread
except ImportError:
    import thread

from nebula import *

from .request_handler import *
from .caspar_controller import *
from .plugins import *

DEFAULT_STATUS = {
        "status" : OFFLINE,
        }

class Service(BaseService):
    def on_init(self):
        if not config["playout_channels"]:
            logging.error("No playout channel configured")
            self.shutdown(no_restart=True)

        self.last_run = False

        try:
            self.id_channel = int(self.settings.find("id_channel").text)
        except Exception:
            self.id_channel = int(min(config["playout_channels"].keys()))

        self.channel_config = config["playout_channels"][self.id_channel]

        self.caspar_host         = self.channel_config.get("caspar_host", "localhost")
        self.caspar_port         = int(self.channel_config.get("caspar_port", 5250))
        self.caspar_channel      = int(self.channel_config.get("caspar_channel", 1))
        self.caspar_feed_layer   = int(self.channel_config.get("caspar_feed_layer", 10))
        self.fps                 = float(self.channel_config.get("fps", 25.0))

        self.current_asset = Asset()
        self.current_event = Event()

        self.current_live = False
        self.cued_live = False
        self.auto_event = 0

        self.status_key = "playout_status/{}".format(self.id_channel)

        self.plugins = PlayoutPlugins(self)
        self.controller = CasparController(self)
        self.last_info = 0

        try:
            port = int(self.settings.find("port").text)
        except:
            port = 42100

        self.server = HTTPServer(('', port), PlayoutRequestHandler)
        self.server.service = self
        self.server.methods = {
                "take" : self.take,
                "cue" : self.cue,
                "cue_forward" : self.cue_forward,
                "cue_backward" : self.cue_backward,
                "freeze" : self.freeze,
                "retake" : self.retake,
                "abort" : self.abort,
                "stat" : self.stat,
                "plugin_list" : self.plugin_list,
                "plugin_exec" : self.plugin_exec,
                "recover" : self.channel_recover
            }
        thread.start_new_thread(self.server.serve_forever,())

        self.plugins.load()
        #self.channel_recover()

    @property
    def current_item(self):
        return self.controller.current_item

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
            return NebulaResponse(404, "Unable to cue. {} does not exist".format(item))

        if item["item_role"] == "live":
            logging.info("Next is item is live")
            fname = self.channel_config.get("live_source", "EMPTY")
            response = self.controller.cue(fname, item, **kwargs)
            if response.is_success:
                self.cued_live = True
            return response

        if not item["id_asset"]:
            return NebulaResponse(400, "Unable to cue virtual {}".format(item))

        asset = item.asset
        playout_status = asset.get(self.status_key, DEFAULT_STATUS)["status"]

        if playout_status not in [ONLINE, CREATING, UNKNOWN]:
            return NebulaResponse(404, "Unable to cue {} playout file ".format(get_object_state_name(playout_status)))

        kwargs["mark_in"] = item["mark_in"]
        kwargs["mark_out"] = item["mark_out"]

        if item["run_mode"] == 1:
            kwargs["auto"] = False
        else:
            kwargs["auto"] = True

        kwargs["loop"] = bool(item["loop"])

        self.cued_live = False
        return self.controller.cue(asset.get_playout_name(self.id_channel), item,  **kwargs)


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
        item = kwargs.get("item", self.controller.current_item)
        level = kwargs.get("level", 0)
        db = kwargs.get("db", DB())
        play = kwargs.get("play", False)
        lcache = kwargs.get("cache", Cache())

        if not item:
            logging.warning("Unable to cue next item. No current clip")
            return

        self.controller.cueing = True
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
            logging.warning("Unable to cue {} ({}). Trying next one.".format(item_next, result.message))
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

    def stat(self, **kwargs):
        return NebulaResponse(200, data=self.playout_status)

    def plugin_list(self, **kwargs):
        result = []
        for id_plugin, plugin in enumerate(self.plugins):
            if not plugin.slots:
                continue
            p = {
                    "id" : id_plugin,
                    "title" : plugin.title,
                    "slots": plugin.slot_manifest,
                }
            result.append(p)
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


    @property
    def playout_status(self):

        #TODO: Rewrite to be nice
        data = {}
        data["id_channel"]    = self.id_channel
        data["current_item"]  = self.controller.current_item.id if self.controller.current_item else False
        data["cued_item"]     = self.controller.cued_item.id if self.controller.cued_item else False
        data["position"]      = self.controller.position
        data["duration"]      = self.controller.duration
        data["current_title"] = self.controller.current_item["title"] if self.controller.current_item else "(no clip)"
        data["cued_title"]    = self.controller.cued_item["title"]    if self.controller.cued_item    else "(no clip)"
        data["request_time"]  = self.controller.request_time
        data["paused"]        = self.controller.paused
        data["cueing"]        = self.controller.cueing
        data["id_event"]      = self.current_event.id if self.current_event else False
        data["fps"]           = self.fps
        data["stopped"]       = False #TODO: deprecated. remove

        data["current_fname"] = self.controller.current_fname
        data["cued_fname"]    = self.controller.cued_fname
        return data


    def on_progress(self):
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

        logging.info ("Advanced to {}".format(item))

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
            logging.info("Last {} has been broadcasted. starting next item".format(last_item))
            new_item = self.cue_next(item=last_item, db=db, play=True)
        else:
            logging.info("Last {} has not been fully broadcasted. Loading next one".format(last_item))
        #    self.controller.force_cue = True
            new_item = self.cue_next(item=last_item, db=db)

        if not new_item:
            logging.error("Recovery failed. Unable to cue")
            return

        self.on_change()


    def on_live_enter(self):
        logging.goodnews("LIVE ENTER")
        self.current_live = True
        self.cued_live = False


    def on_live_leave(self):
        logging.goodnews("LIVE LEAVE")
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
            logging.warning("Unable to fetch current event")
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

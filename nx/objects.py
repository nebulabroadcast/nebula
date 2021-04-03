from nebulacore import *
from nebulacore.base_objects import *

from .db import DB
from .cache import cache
from .server_object import ServerObject

__all__ = ["Asset", "Item", "Bin", "Event", "User", "anonymous"]


class ObjectHelper(object):
    def __init__(self):
        self.classes = {}

    def __setitem__(self, key, value):
        self.classes[key] = value

    def invalidate(self, object_type, meta):
        obj = self.classes[object_type](meta=meta)
        obj.invalidate()

object_helper = ObjectHelper()


class Asset(AssetMixIn, ServerObject):
    table_name = "assets"
    db_cols = ["id_folder", "content_type", "media_type", "status", "version_of", "ctime", "mtime"]

    def invalidate(self):
        # Invalidate view count
        # TODO: Performance idea:
        #  - invalidate only if view is affected (folder changed, inserted...)
        for id_view in config["views"]:
            view = config["views"][id_view]
            for id_folder in view.get("folders", config["folders"].keys()):
                if self["id_folder"] == id_folder:
                    cache.delete("view-count-"+str(id_view))
                    break

    def load_sidecar_metadata(self):
        pass #TODO

    def delete_children(self):
        if self.id:
            self.db.query("DELETE FROM jobs WHERE id_asset = %s", [self.id])
            # db.commit is called by the delete method

    @property
    def has_proxy(self):
        return os.path.exists(self.proxy_full_path)

    @property
    def proxy_full_path(self):
        if not self.id:
            return ""
        if not hasattr(self, "_proxy_full_path"):
            self._proxy_full_path = os.path.join(
                        storages[self.proxy_storage].local_path,
                        self.proxy_path
                    )
        return self._proxy_full_path

    @property
    def proxy_storage(self):
        return config.get("proxy_storage", 1)

    @property
    def proxy_path(self):
        if not self.id:
            return ""
        if not hasattr(self, "_proxy_path"):
            tpl = config.get("proxy_path", ".nx/proxy/{id1000:04d}/{id}.mp4")
            id1000 = int(self.id/1000)
            self._proxy_path = tpl.format(id1000=id1000, **self.meta)
        return self._proxy_path

    def get_playout_name(self, id_channel):
        return f"{config['site_name']}-{self.id}"

    def get_playout_storage(self, id_channel):
        try:
            return config["playout_channels"][id_channel]["playout_storage"]
        except KeyError:
            return None


    def get_playout_path(self, id_channel):
        return os.path.join(
                config["playout_channels"][id_channel]["playout_dir"],
                self.get_playout_name(id_channel) + "." + config["playout_channels"][id_channel]["playout_container"]
            )

    def get_playout_full_path(self, id_channel):
        id_storage = self.get_playout_storage(id_channel)
        if not id_storage:
            return None
        return os.path.join(
                storages[id_storage].local_path,
                self.get_playout_path(id_channel)
            )



class Item(ItemMixIn, ServerObject):
    table_name = "items"
    db_cols = ["id_asset", "id_bin", "position"]
    defaults = {"id_asset" : 0, "position" : 0}

    @property
    def asset(self):
        if not hasattr(self, "_asset"):
            if not self.meta.get("id_asset", False):
                self._asset = False # Virtual items
            else:
                self._asset = Asset(self["id_asset"], db=self.db) or False
        return self._asset

    @property
    def bin(self):
        if not hasattr(self, "_bin"):
            self._bin = Bin(self["id_bin"], db=self.db)
        return self._bin

    @property
    def event(self):
        _bin = self.bin
        if not _bin:
            return False
        return _bin.event


class Bin(BinMixIn, ServerObject):
    table_name = "bins"
    db_cols = ["bin_type"]

    def invalidate(self):
        pass

    @property
    def items(self):
        if not hasattr(self, "_items"):
            if not self.id:
                self._items = []
            else:
                self.db.query("SELECT meta FROM items WHERE id_bin=%s ORDER BY position ASC, id ASC", [self.id])
                self._items = [Item(meta=meta, db=self.db) for meta, in self.db.fetchall()]
        return self._items

    @items.setter
    def items(self, value):
        assert type(value) == list
        self._items = value

    def append(self, item):
        assert isinstance(item, Item)
        self._items.append(item)

    @property
    def event(self):
        if not hasattr(self, "_event"):
            self.db.query("SELECT meta FROM events WHERE id_magic=%s", [self.id]) #TODO: playout only
            try:
                self._event = Event(meta=self.db.fetchall()[0][0])
            except IndexError:
                logging.error(f"Unable to get {self} event")
                self._event = False
            except Exception:
                log_traceback()
                self._event = False
        return self._event

    def delete_children(self):
        for item in self.items:
            item.delete()
        self._items = []

    def save(self, **kwargs):
        duration = 0
        for item in self.items:
            duration += item.duration
        if duration != self.duration:
            logging.debug(f"New duration of {self} is {s2tc(duration)}")
            self["duration"] = duration
        super(Bin, self).save(**kwargs)


class Event(EventMixIn, ServerObject):
    table_name = "events"
    db_cols = ["id_channel", "start", "stop", "id_magic"]

    @property
    def bin(self):
        if not hasattr(self, "_bin"):
            if not self["id_magic"]: # non-playout events
                self._bin = False
            else:
                self._bin = Bin(self["id_magic"], db=self.db)
        return self._bin

    @property
    def asset(self):
        if not hasattr(self, "_asset"):
            #TODO: non-playout events (by channel_type)
            if not self["id_asset"]:
                self._asset = False
            else:
                self._asset = Asset(self["id_asset"], db=self.db)
        return self._asset


class User(UserMixIn, ServerObject):
    table_name = "users"
    db_cols = ["login", "password"]

#
# Helpers
#

object_helper[ASSET] = Asset
object_helper[ITEM]  = Item
object_helper[BIN]   = Bin
object_helper[EVENT] = Event
object_helper[USER]  = User

anonymous_data = {"login" : "Anonymous"}
anonymous = User(meta=anonymous_data)

from nebulacore import *
from nebulacore.base_objects import BaseObject

from .db import DB
from .cache import cache
from .messaging import messaging

__all__ = ["ServerObject"]

def create_ft_index(meta):
    ft = {}
    if "subclips" in meta:
        weight = 8
        for sc in [k.get("title","") for k in meta["subclips"]]:
            try:
                for word in slugify(sc, make_set=True, min_length=3):
                    if not word in ft:
                        ft[word] = weight
                    else:
                        ft[word] = max(ft[word], weight)
            except Exception:
                logging.error(f"Unable to slugify key {key} with value {meta[key]}")
    for key in meta:
        if not key in meta_types:
            continue
        weight = meta_types[key]["fulltext"]
        if not weight:
            continue
        try:
            for word in slugify(meta[key], make_set=True, min_length=3):
                if not word in ft:
                    ft[word] = weight
                else:
                    ft[word] = max(ft[word], weight)
        except Exception:
            logging.error(f"Unable to slugify key {key} with value {meta[key]}")
    return ft


class ServerObject(BaseObject):
    def __init__(self, id=False, **kwargs):
        if "db" in kwargs:
            self._db = kwargs["db"]
        super(ServerObject, self).__init__(id, **kwargs)

    @property
    def db(self):
        if not hasattr(self, "_db"):
            logging.debug(f"{self} is opening DB connection")
            self._db = DB()
        return self._db

    def load(self, id):
        key = str(self.object_type_id) + "-" + str(id)
        try:
            cache_data = cache.load(key)
            if cache_data is not None:
                self.meta = json.loads(cache_data)
                return True
        except Exception:
            pass
        logging.debug(f"Loading {self.__class__.__name__} ID:{id} from DB")
        self.db.query(f"SELECT meta FROM {self.table_name} WHERE id = {id}")
        try:
            self.meta = self.db.fetchall()[0][0]
        except IndexError:
            logging.error(f"Unable to load {self.__class__.__name__} ID:{id}. Object does not exist")
            return False
        self.cache()

    def save(self, **kwargs):
        super(ServerObject, self).save(**kwargs)
        is_new = self.is_new
        if is_new:
            self._insert(**kwargs)
        else:
            self._update(**kwargs)
            self.invalidate()
        if self.text_changed or is_new:
            self.update_ft_index(is_new)
        if kwargs.get("commit", True):
            self.db.commit()
        self.cache()
        self.text_changed = self.meta_changed = False
        self.is_new = False
        if kwargs.get("notify", True):
            messaging.send("objects_changed", objects=[self.id], object_type=self.object_type)


    def _insert(self, **kwargs):
        meta = json.dumps(self.meta)
        cols = []
        vals = []
        if self.id:
            cols.append("id")
            vals.append(self.id)
        for col in self.db_cols:
            cols.append(col)
            vals.append(self[col])
        if self.id:
            cols.append("meta")
            vals.append(json.dumps(self.meta))

        if cols:
            query = "INSERT INTO {} ({}) VALUES ({}) RETURNING id".format(
                        self.table_name,
                        ", ".join(cols),
                        ", ".join(["%s"]*len(cols))
                    )
        else:
            query = f"INSERT INTO {self.table_name} DEFAULT VALUES RETURNING id"
        self.db.query(query, vals)

        if not self.id:
            self["id"] = self.db.fetchone()[0]
            self.db.query(
                    f"UPDATE {self.table_name} SET meta=%s WHERE id=%s",
                    [json.dumps(self.meta), self.id]
                )


    def _update(self, **kwargs):
        assert self.id > 0
        cols = ["meta"]
        vals = [json.dumps(self.meta)]

        for col in self.db_cols:
            cols.append(col)
            vals.append(self[col])

        query = "UPDATE {} SET {} WHERE id=%s".format(
                self.table_name,
                ", ".join([key+"=%s" for key in cols])
            )
        self.db.query(query, vals+[self.id])


    def update_ft_index(self, is_new=False):
        if not is_new:
            self.db.query("DELETE FROM ft WHERE object_type=%s AND id=%s", [self.object_type_id, self.id])
        ft = create_ft_index(self.meta)
        if not ft:
            return
        args = [(self.id, self.object_type_id, ft[word], word) for word in ft]
        tpls = ','.join(['%s'] * len(args))
        self.db.query(f"INSERT INTO ft (id, object_type, weight, value) VALUES {tpls}", args)


    @property
    def cache_key(self):
        if not self.id:
            return False
        return str(self.object_type_id) + "-" + str(self.id)

    def cache(self):
        """Save object to cache"""
        cache_key = self.cache_key
        if not cache_key:
            return False
        cache.save(cache_key, json.dumps(self.meta))

    def invalidate(self):
        """Invalidate all cache objects which references this one"""
        pass


    def delete_children(self):
        pass

    def delete(self):
        if not self.id:
            return
        logging.info(f"Deleting {self}")
        cache.delete(self.cache_key)
        self.delete_children()
        self.db.query("DELETE FROM {} WHERE id=%s".format(self.table_name), [self.id])
        self.db.query("DELETE FROM ft WHERE object_type=%s AND id=%s", [self.object_type_id, self.id])
        self.db.commit()

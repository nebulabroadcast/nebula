import time
from nebulacore import *

try:
    import psycopg2
    from psycopg2 import IntegrityError, DataError
except ImportError:
    log_traceback("Import error")
    critical_error("Unable to import psycopg2")

try:
    import pylibmc
except ImportError:
    log_traceback("Import error")
    critical_error("Unable to import pylibmc")

__all__ = ["DB", "cache", "Cache", "IntegrityError", "DataError"]

#
# Database
#

class DB(object):
    def __init__(self, **kwargs):
        self.pmap = {
                "host" : "db_host",
                "user" : "db_user",
                "password" : "db_pass",
                "database" : "db_name",
            }

        self.settings = {
                key : kwargs.get(self.pmap[key], config[self.pmap[key]]) for key in self.pmap
            }

        self.conn = psycopg2.connect(**self.settings)
        self.cur = self.conn.cursor()

    def lastid(self):
        self.query("SELECT LASTVAL()")
        return self.fetchall()[0][0]

    def query(self, query, *args):
        self.cur.execute(query, *args)

    def fetchone(self):
        return self.cur.fetchone()

    def fetchall(self):
        return self.cur.fetchall()

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()

    def __len__(self):
        return True

#
# Cache
#

class Cache():
    def __init__(self):
        if "cache_host" in config:
            self.configure()

    def configure(self):
        self.site = config["site_name"]
        self.host = config.get("cache_host", "localhost")
        self.port = config.get("cache_port", 11211)
        self.cstring = "{}:{}".format(self.host, self.port)
        self.pool = False
        self.connect()

    def connect(self):
        self.conn = pylibmc.Client([self.cstring])
        self.pool = False

    def load(self, key):
        if config.get("mc_thread_safe", False):
            return self.threaded_load(key)

        key = str(self.site + "-" + key)
        try:
            result = self.conn.get(key)
        except pylibmc.ConnectionError:
            self.connect()
            result = False
        except ValueError:
#            logging.warning("Unable to read key {} from cache".format(key))
            result = False
        return result

    def save(self, key, value):
        if config.get("mc_thread_safe", False):
            return self.threaded_save(key, value)

        key = self.site + "-" + key
        for i in range(2):
            try:
                self.conn.set(str(key), str(value))
                break
            except Exception:
                log_traceback("Cache save failed ({})".format(key))
                time.sleep(.1)
                self.connect()
        else:
            critical_error("Memcache save failed. This should never happen. Check MC server")
            sys.exit(-1)
        return True

    def delete(self,key):
        if config.get("mc_thread_safe", False):
            return self.threaded_delete(key)
        key = self.site + "-" + key
        for i in range(10):
            try:
                self.conn.delete(key)
                break
            except Exception:
                log_traceback("Cache delete failed ({})".format(key))
                time.sleep(.3)
                self.connect()
        else:
            critical_error("Memcache delete failed. This should never happen. Check MC server")
            sys.exit(-1)
        return True

    def threaded_load(self, key):
        if not self.pool:
            self.pool = pylibmc.ThreadMappedPool(self.conn)
        key = self.site + "-" + key
        result = False
        with self.pool.reserve() as mc:
            try:
                result = mc.get(key)
            except pylibmc.ConnectionError:
                self.connect()
                result = False
        self.pool.relinquish()
        return result

    def threaded_save(self, key, value):
        if not self.pool:
            self.pool = pylibmc.ThreadMappedPool(self.conn)
        key = self.site + "-" + key
        with self.pool.reserve() as mc:
            for i in range(10):
                try:
                    mc.set(str(key), str(value))
                    break
                except Exception:
                    log_traceback("Cache save failed ({})".format(key))
                    time.sleep(.3)
                    self.connect()
            else:
                critical_error("Memcache save failed. This should never happen. Check MC server")
                sys.exit(-1)
        self.pool.relinquish()
        return True

    def threaded_delete(self,key):
        if not self.pool:
            self.pool = pylibmc.ThreadMappedPool(self.conn)
        key = self.site + "-" + key
        with self.pool.reserve() as mc:
            for i in range(10):
                try:
                    mc.delete(key)
                    break
                except Exception:
                    log_traceback("Cache delete failed ({})".format(key))
                    time.sleep(.3)
                    self.connect()
            else:
                critical_error("Memcache delete failed. This should never happen. Check MC server")
                sys.exit(-1)
        self.pool.relinquish()
        return True

cache = Cache()

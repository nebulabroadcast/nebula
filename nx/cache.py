__all__ = ["cache", "Cache"]

import json
import time

from nebulacore import config
from nxtools import *

MAX_RETRIES = 5

try:
    import pylibmc
    has_pylibmc = True
except ModuleNotFoundError:
    has_pylibmc = False


class Cache():
    def __init__(self):
        if "cache_host" in config:
            self.configure()

    def configure(self):
        self.site = config["site_name"]
        self.host = config.get("cache_host", "localhost")
        self.port = config.get("cache_port", 11211)
        self.connect()

    def connect(self):
        if config.get("cache_mode", "memcached") == "redis":
            pass
        else:
            if not has_pylibmc:
                critical_error("'pylibmc' module is not installed")
            self.cstring = f"{self.host}:{self.port}"
            self.pool = False
            self.conn = pylibmc.Client([self.cstring])

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
            result = False
        return result

    def save(self, key, value):
        if config.get("mc_thread_safe", False):
            return self.threaded_save(key, value)

        key = self.site + "-" + key
        for i in range(MAX_RETRIES):
            try:
                self.conn.set(str(key), str(value))
                break
            except Exception:
                log_traceback(f"Cache save failed ({key})")
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
        for i in range(MAX_RETRIES):
            try:
                self.conn.delete(key)
                break
            except Exception:
                log_traceback(f"Cache delete failed ({key})")
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
            for i in range(MAX_RETRIES):
                try:
                    mc.set(str(key), str(value))
                    break
                except Exception:
                    log_traceback(f"Cache save failed ({key})")
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
            for i in range(MAX_RETRIES):
                try:
                    mc.delete(key)
                    break
                except Exception:
                    log_traceback(f"Cache delete failed ({key})")
                    time.sleep(.3)
                    self.connect()
            else:
                critical_error("Memcache delete failed. This should never happen. Check MC server")
                sys.exit(-1)
        self.pool.relinquish()
        return True

cache = Cache()

__all__ = ["DB"]

from nxtools import log_traceback, critical_error
from nx.core.common import config

try:
    import psycopg2
except ImportError:
    log_traceback("Import error")
    critical_error("Unable to import psycopg2")


class DB(object):
    def __init__(self, **kwargs):
        self.pmap = {
            "host": "db_host",
            "user": "db_user",
            "password": "db_pass",
            "database": "db_name",
        }

        self.settings = {
            key: kwargs.get(self.pmap[key], config[self.pmap[key]]) for key in self.pmap
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

#!/usr/bin/env python3

import os
import json
import time
import sqlite3

from pprint import pprint
from nebula import *

site_name = config["site_name"].replace("-dev", "")
data_url = "https://{}.nebulabroadcast.com/export/dump.db".format(site_name)
data_path = "/tmp/{}.db".format(site_name)

logging.user = "Import"

def do_download():
    os.system("curl {} -o {}".format(data_url, data_path))

if not os.path.exists(data_path) or os.path.getmtime(data_path) < time.time() - 3600:
    do_download()

#
# Lots of magic numbers were changed between v4 and v5. Sorry :-/
#

folder_map = {
        1 : 1,   # movie
        2 : 2,   # serie
        3 : 6,   # trailer
        4 : 7,   # jingle
        5 : 4,   # song
        6 : 3,   # story
        7 : 5,   # fill
        8 : 8,   # templates
        10 : 12, # incomming
        11 : 9,  # reklama
        12 : 10, # teleshopping
        13 : 3   # headline
    }

content_type_map = {
        2 : AUDIO,
        1 : VIDEO,
        3 : IMAGE,
        0 : TEXT,
    }

media_type_map = {
        1 : VIRTUAL,
        0 : FILE,
    }

def parse_rights(value):
    return value #TODO

meta_keys = {
    "id_bin"                    : lambda x: int(x),
    "id_asset"                  : lambda x: int(x),
    "is_optional"               : lambda x: int(x),
    "position"                  : lambda x: int(x),
    "item_role"                 : None,
    "run_mode"                  : lambda x: int(x),
    "bin_type"                  : lambda x: int(x),
    "id_channel"                : lambda x: int(x),
    "color"                     : lambda x: int(x.lstrip("#"), 16),
    "stop"                      : lambda x: int(x),
    "start"                     : lambda x: int(x),
    "dramatica/config"          : None,
    "id_magic"                  : lambda x: int(x),
    "is_optional"               : lambda x: int(x),
    "login"                     : None,
    "password"                  : None,
    "is_admin"                  : lambda x: {True : True, 1 : True, "true" : True}.get(x, False),
    "full_name"                 : None,
    "album"                     : None,
    "album/disc"                : lambda x: int(x),
    "album/track"               : lambda x: int(x),
#TODO    "contains/cg_text" : None,
#TODO    "contains/nudity" : None,
    "content_type"              : lambda x: content_type_map[x],
    "ctime"                     : lambda x: int(x),
    "description"               : None,
    "description/original"      : None,
    "director"                  : "role/director",
    "duration"                  : lambda x: float(x),
    "file/format"               : None,
    "file/mtime"                : None,
    "file/size"                 : None,
    "genre"                     : None,
    "genre/music" : -1,
    "has_thumbnail"             : lambda x: int(x),
    "id_folder"                 : lambda x: folder_map[x],
    "id_object"                 : "id",
    "id_storage"                : lambda x: int(x),
    "identifier/guid"           : "id/guid",
    "identifier/vimeo"          : "id/vimeo",
    "identifier/youtube"        : "id/youtube",
    "identifier/vod"            : "id/vod",
    "logo"                      : None,
    "mark_in"                   : None,
    "mark_out"                  : None,
    "media_type"                : lambda x: media_type_map[x],
    "mtime"                     : None,
    "path"                      : None,
    "promoted"                  : None,
    "qc/state"                  : None,
    "rights"                    : None,
    "role/composer"             : None,
    "role/director"             : None,
    "role/performer"            : None,
    "series/episode"            : "serie/episode",
    "series/season"             : "serie/season",
    "source"                    : None,
    "source/author"             : None,
    "source/url"                : None,
    "status"                    : None,
    "subject"                   : "keywords",
    "title"                     : None,
    "title/original"            : None,
    "title/subtitle"            : "subtitle",
    "version_of"                : lambda x: x or 0,

    "audio/bpm"                 : None,
    "audio/gain/mean"           : None,
    "audio/gain/peak"           : None,
    "audio/r128/i"              : None,
    "audio/r128/lra"            : None,
    "audio/r128/lra/l"          : None,
    "audio/r128/lra/r"          : None,
    "audio/r128/lra/t"          : None,
    "audio/r128/t"              : None,
    "video/aspect_ratio"        : None,
    "video/codec"               : None,
    "video/color_range"         : None,
    "video/color_space"         : None,
    "video/fps"                 : None,
    "video/height"              : None,
    "video/pixel_format"        : None,
    "video/width"               : None,
    "logo"                      : None,
    "notes"                     : "cue_sheet",


    "title/series"              : "serie",
    "identifier/main"           : "id/main",
    "date/valid"                : None,
    "subclips"                  : -1,
    "format"                    : "editorial_format",
    "commercials/client"        : "commercial/client",
    "meta_probed" : -1,
    "identifier/atmedia" : -1,
    "locked" : -1,
    "can/job_control" : parse_rights,
    "can/asset_edit" : parse_rights,
    "can/mcr" : parse_rights,
    "can/service_control" : parse_rights,
    "can/rundown_view" : parse_rights,
    "can/asset_create" :parse_rights,
    "can/cg" : parse_rights,
    "can/rundown_edit" : parse_rights,
    "can/scheduler_edit" : parse_rights,
    "can/scheduler_view" : parse_rights,
    "can/export" : parse_rights,
}


OBJECT_TYPES = [
        ["assets", Asset],
        ["bins", Bin],
        ["events", Event],
        ["items", Item],
        ["users", User]
    ]

class SourceDB(object):
    def __init__(self, db_path):
        self.connection = sqlite3.connect(db_path)
        self.cursor = self.connection.cursor()

    def query(self, *args):
        return self.cursor.execute(*args)

    def commit(self):
        self.connection.commit()

    def fetchall(self):
        return self.cursor.fetchall()


def check_keys():
    sdb = SourceDB(data_path)
    ignore = []
    for table_name, object_type in OBJECT_TYPES:
        sdb.query("select data from {}".format(table_name))
        for data, in sdb.fetchall():
            data = json.loads(data)
            for key in data.keys():
                if key in meta_keys or key in ignore:
                        continue
                logging.warning("Unknown key: {}".format(key))
                ignore.append(key)




class ImportObject(object):
    def __init__(self, object_type, meta):
        self.object_type = object_type
        self.meta = meta

    def __getitem__(self, key):
        return self.meta.get(key, False)

    def translate(self):
        if self["origin"] and self["origin"] != "Production":
            return False
        result = {}

        for key in meta_keys:
            conv = meta_keys[key]

            if self.object_type == "asset":
                if not key in self.meta:
                    if key in ["version_of", "status"]:
                        self.meta[key] = 0
                    elif key in ["media_type"]:
                        self.meta[key] = 0
                    else:
                        continue

            if callable(conv):
                result[key] = conv(self[key])
            elif type(conv) == str:
                result[conv] = self[key]
            elif conv is None:
                result[key] = self[key]
            else:
                continue

        return result


if __name__ == "__main__":
    db = DB()

    if "--full" in sys.argv:
        logging.info("Deleting old data")
        db.query("TRUNCATE TABLE jobs, asrun RESTART IDENTITY")
        db.commit()


    sdb = SourceDB(data_path)
    sdb.query("SELECT DISTINCT cs FROM cs")
    for cs, in sdb.fetchall():
        tcs = "urn:site:" + cs
        db.query("DELETE FROM cs WHERE cs = %s", [tcs])
    db.commit()

    sdb.query("SELECT cs, value, label FROM cs")
    for cs, value, label in sdb.fetchall():
        tcs = "urn:site:" + cs
        if not label or label == "None":
            settings = {}
        else:
            settings = {"aliases" : {"en" : label, "cz" : label}}
        db.query("INSERT INTO cs (cs, value, settings) VALUES (%s, %s, %s)", [tcs, value, json.dumps(settings)])
    db.commit()



    for table_name, ObjectClass in OBJECT_TYPES:
        if "--full" in sys.argv:
            logging.info("Truncating table {}".format(table_name))
            db.query("TRUNCATE TABLE {} RESTART IDENTITY CASCADE".format(table_name))
            db.commit()

        num_created = 0
        num_updated = 0



        db.query("SELECT meta->>'mtime' FROM {} ORDER BY meta->>'mtime' DESC LIMIT 1".format(table_name))
        try:
            last_mtime = db.fetchall()[0][0]
        except:
            last_mtime = 0

        i = 0
        sdb.query("SELECT id, data FROM {} WHERE mtime > ? ORDER BY mtime ASC".format(table_name), [last_mtime])
        for id, data in sdb.fetchall():
            src = ImportObject(table_name[:-1], json.loads(data))

            translated = src.translate()
            if not translated:
                continue

            obj = ObjectClass(meta=translated, db=db)
            obj.is_new = True
            obj.text_changed = True


            try:
                obj.save(commit=False, set_mtime=False)
            except IntegrityError:
                logging.debug("Integrity error. Updating existing object.")
                db.commit()
                obj.is_new = False
                try:
                    obj.save(set_mtime=False)
                except:
                    pass

                num_updated += 1
            except Exception:
                log_traceback()
                logging.error(str(translated))
                continue
            else:
                num_created += 1

            i += 1
            if i % 1000 == 0:
                logging.debug("{} {} imported".format(i, table_name))
                db.commit()

        db.commit()

        if num_created:
            db.query("""
                    SELECT setval(pg_get_serial_sequence('{}', 'id'),
                    coalesce(max(id),0) + 1, false)
                    FROM {};""".format(table_name, table_name)
                )
            logging.debug("Serial reset ({}): {}".format(table_name, db.fetchall()[0][0]))
            db.commit()
        logging.info("{} {} created, {} updated".format(num_created, table_name, num_updated))

    sys.exit(0)

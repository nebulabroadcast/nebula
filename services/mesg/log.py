import os
import time

from nxtools import *

def log_clean_up(log_dir, ttl=30):
    ttl_sec = ttl * 3600 * 24
    for f in get_files(log_dir, exts=["txt"]):
        if f.mtime < time.time() - ttl_sec:
            try:
                os.remove(f.path)
            except Exception:
                log_traceback(f"Unable to remove old log file {f.base_name}")
            else:
                logging.debug(f"Removed old log file {f.base_name}")



def format_log_message(message):
    try:
        log = "{}\t{}\t{}@{}\t{}\n".format(
                time.strftime("%H:%M:%S"),
                {
                    0 : "DEBUG    ",
                    1 : "INFO     ",
                    2 : "WARNING  ",
                    3 : "ERROR    ",
                    4 : "GOOD NEWS"
                }[message.data["message_type"]],
                message.data["user"],
                message.host,
                message.data["message"]
            )
    except Exception:
        log_traceback()
        return None
    return log


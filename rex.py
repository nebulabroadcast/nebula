from __future__ import print_function

__all__ = ["require"]

import os
import sys
import subprocess
import time
import json
import traceback

###

version_info = sys.version_info[:2]
PYTHON_VERSION = version_info[0] + float("." + str(version_info[1])) # TODO: make this nice

if PYTHON_VERSION >= 3:
    from urllib.request import urlopen

    decode_if_py3 = lambda x: x.decode("utf-8")
    encode_if_py3 = lambda x: bytes(x, "utf-8")
    string_type = str
else:
    from urllib2 import urlopen

    decode_if_py3 = lambda x: x
    encode_if_py3 = lambda x: x
    string_type = unicode

DEBUG, INFO, WARNING, ERROR, GOOD_NEWS = range(5)
PLATFORM = "windows" if sys.platform == "win32" else "unix"

def indent(src, l=4):
    return "\n".join(["{}{}".format(l*" ", s.rstrip()) for s in src.split("\n")])

class Logging():
    def __init__(self, user="REX"):
        self.user = user
        self.formats = {
            INFO      : "INFO       {0:<15} {1}",
            DEBUG     : "\033[34mDEBUG      {0:<15} {1}\033[0m",
            WARNING   : "\033[33mWARNING\033[0m    {0:<15} {1}",
            ERROR     : "\033[31mERROR\033[0m      {0:<15} {1}",
            GOOD_NEWS : "\033[32mGOOD NEWS\033[0m  {0:<15} {1}"
            }

        self.formats_win = {
            DEBUG     : "DEBUG      {0:<10} {1}",
            INFO      : "INFO       {0:<10} {1}",
            WARNING   : "WARNING    {0:<10} {1}",
            ERROR     : "ERROR      {0:<10} {1}",
            GOOD_NEWS : "GOOD NEWS  {0:<10} {1}"
            }

    def _send(self, msgtype, *args, **kwargs):
        message = " ".join([str(arg) for arg in args])
        user = kwargs.get("user", self.user)
        if PLATFORM == "unix":
            try:
                print (self.formats[msgtype].format(user, message), file=sys.stderr)
            except:
                print (message.encode("utf-8"),file=sys.stderr)
        else:
            try:
                print (self.formats_win[msgtype].format(user, message), file=sys.stderr)
            except:
                print (message.encode("utf-8"), file=sys.stderr)

    def debug(self, *args, **kwargs):
        self._send(DEBUG, *args, **kwargs)

    def info(self, *args, **kwargs):
        self._send(INFO, *args, **kwargs)

    def warning(self, *args, **kwargs):
        self._send(WARNING, *args, **kwargs)

    def error(self, *args, **kwargs):
        self._send(ERROR, *args, **kwargs)

    def goodnews(self, *args, **kwargs):
        self._send(GOOD_NEWS, *args, **kwargs)


logging = Logging()


def log_traceback(message="Exception!", **kwargs):
    tb = traceback.format_exc()
    msg = "{}\n\n{}".format(message, indent(tb))
    logging.error(msg, **kwargs)
    return msg


def critical_error(msg, **kwargs):
    logging.error(msg, **kwargs)
    logging.debug("Critical error. Terminating program.")
    sys.exit(1)


class Repository(object):
    def __init__(self, parent,  url, **kwargs):
        self.parent = parent
        self.url = url
        self.settings = kwargs
        self.base_name = os.path.basename(url)
        self.path = os.path.join(self.parent.vendor_dir, self.base_name)

    def __getitem__(self, key):
        return self.settings.get(key, None)

    def __repr__(self):
        return "vendor module '{}'".format(self.base_name)


class Rex(object):
    def __init__(self):
        self.app_dir = os.path.abspath(os.getcwd())
        self.vendor_dir =os.path.join(self.app_dir, "vendor")
        self.manifest_path = os.path.join(self.app_dir, "rex.json")
        self.self_update()
        self.main()

    @property
    def force_update(self):
        return "--rex-update" in sys.argv

    def chdir(self, path):
        os.chdir(path)

    @property
    def repos(self):
        if not hasattr(self, "_repos"):
            if not os.path.exists(self.manifest_path):
                self._repos = []
            else:
                try:
                    self.manifest = json.load(open(self.manifest_path))
                    if not self.manifest:
                        return []
                    self._repos = []
                    for repo_url in self.manifest.keys():
                        repo_settings = self.manifest[repo_url]
                        repo = Repository(self, repo_url, **repo_settings)
                        self._repos.append(repo)
                except Exception:
                    log_traceback()
                    critical_error("Unable to load rex manifest. Exiting")
                    self._repos = []
        return self._repos

    def self_update(self):
        if not self.force_update:
            return
        if os.path.exists(".rex_devel"):
            logging.debug("This is a development machine. Skipping rex auto update.")
            return
        response = urlopen("https://imm.cz/rex.py")
        new_rex = decode_if_py3(response.read())
        old_rex = open("rex.py").read()
        if new_rex != old_rex:
            logging.info("Updating REX core")
            with open("rex.py", "w") as f:
                f.write(new_rex)
        else:
            logging.info("REX is up to date")

    def main(self):
        for repo in self.repos:
            try:
                self.update(repo) and self.post_install(repo)
            except Exception:
                log_traceback()
        self.chdir(self.app_dir)
        if self.force_update:
            logging.goodnews("Vendor modules updated")
            sys.exit(0)

    def update(self, repo):
        if not os.path.exists(self.vendor_dir):
            os.makedirs(self.vendor_dir)

        if os.path.exists(repo.path):
            if self.force_update:
                logging.info("Updating {}".format(repo))
                self.chdir(repo.path)
                cmd = ["git", "pull"]
                if repo["branch"]:
                    cmd.extend(["origin", repo["branch"]])
            else:
                return True
        else:
            logging.info("Downloading {}".format(repo))
            self.chdir(self.vendor_dir)
            cmd = ["git", "clone", repo.url]

        p = subprocess.Popen(cmd)
        while p.poll() == None:
            time.sleep(.1)
        if p.returncode:
            critical_error("Unable to update {}".format(repo))
        if repo["branch"]:
            self.chdir(repo.path)
            cmd = ["git", "checkout", repo["branch"]]
            p = subprocess.Popen(cmd)
            while p.poll() == None:
                time.sleep(.1)
        return True

    def post_install(self, repo):
        if (repo["python-path"] or repo["python_path"]) and not repo.path in sys.path:
            sys.path.insert(0, repo.path)

rex = Rex()

def require(url, **kwargs):
    if not "python_path" in kwargs:
        kwargs["python_path"] = True
    repo = Repository(rex, url, **kwargs)
    return rex.update(repo) and rex.post_install(repo)

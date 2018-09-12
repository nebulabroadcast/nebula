from nebula import *

import subprocess
import os
import signal

from .common import *

class NebulaFFMPEG(BaseEncoder):
    def configure(self):
        self.files = {}
        self.ffparams = ["ffmpeg", "-y"]
        self.ffparams.extend(["-i", self.asset.file_path])
        asset = self.asset

        for p in self.task:
            if p.tag == "param":
                value = str(eval(p.text)) if p.text else ""
                if p.attrib["name"] == "ss":
                    self.ffparams.insert(2, "-ss")
                    self.ffparams.insert(3, value)
                else:
                    self.ffparams.append("-{}".format(p.attrib["name"]))
                    if value:
                        self.ffparams.append(value)

            elif p.tag == "script":
                try:
                    exec(p.text)
                except Exception:
                    log_traceback()
                    return NebulaResponse(500, message="Error in task 'pre' script.")

            elif p.tag == "paramset" and eval(p.attrib["condition"]):
                for pp in p.findall("param"):
                    value = str(eval(pp.text)) if pp.text else ""
                    self.ffparams.append("-{}".format(pp.attrib["name"]))
                    if value:
                        self.ffparams.append(value)

            elif p.tag == "output":
                id_storage = int(eval(p.attrib["storage"]))
                if not storages[id_storage]:
                    return NebulaResponse(
                            500,
                            message="Target storage {} is not mounted".format(id_storage)
                            )

                target_rel_path = eval(p.text)
                target_path = os.path.join(storages[id_storage].local_path, target_rel_path)
                target_dir  = os.path.split(target_path)[0]

                temp_ext = os.path.splitext(target_path)[1].lstrip(".")
                temp_path = temp_file(id_storage, temp_ext)

                if not temp_path:
                    return NebulaResponse(
                            500,
                            message="Unable to create temp directory"
                            )

                if not os.path.isdir(target_dir):
                    try:
                        os.makedirs(target_dir)
                    except Exception:
                        log_traceback()
                        return NebulaResponse(500, message="Unable to create output directory {}".format(target_dir))

                self.files[temp_path] = target_path
                self.ffparams.append(temp_path)

        return NebulaResponse(200, message="Job configured")


    def start(self):
        logging.debug("Executing {}".format(" ".join(self.ffparams)))
        self.proc = subprocess.Popen(
                self.ffparams,
                stderr=subprocess.PIPE,
                universal_newlines=True
            )

    def stop(self):
        if not self.proc:
            return
        pid = self.proc.pid
        os.kill(pid, signal.SIGINT)

    @property
    def is_running(self):
        if not self.proc or self.proc.poll() == None:
            return True
        return False


    def work(self):
        if not self.proc:
            self.progress = 0
            self.message = "Starting"
            return

        try:
            ln = self.proc.stderr.readline().split(" ")
        except:
            pass
        else:
            for k in ln:
                if k.startswith("time="):
                    try:
                        PZ = self.asset["duration"]
                        hh, mm, ss = k.replace("time=","").split(":")
                        PC = (int(hh)*3600) + (int(mm)*60) + float(ss)
                        self.progress = (PC / PZ) * 100
                        self.message = "Encoding " + k
                    except:
                        pass


    def finalize(self):
        if self.proc is None:
            return NebulaResponse(500, message="Encoding failed (proc is none)")

        if self.proc.poll() > 0:
            logging.error(self.proc.stderr.read())
            return NebulaResponse(500, message="Encoding failed (return code {})".format(self.proc.returncode))

        for temp_path in self.files:
            target_path = self.files[temp_path]
            try:
                logging.debug("Moving {} to {}".format(temp_path, target_path))
                os.rename(temp_path, target_path)
            except IOError:
                return NebulaResponse(500, message="Unable to move output file {} to target destination {}".format(temp_path, target_path))

        return NebulaResponse(200, message="Task finished")

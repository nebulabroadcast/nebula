import os

from nxtools import log_traceback, logging
from nxtools.media import FFMPEG

from nx.core.common import storages, NebulaResponse

from .common import BaseEncoder, temp_file


class NebulaFFMPEG(BaseEncoder):
    def configure(self):
        self.files = {}
        self.ffparams = ["-y"]
        self.ffparams.extend(["-i", self.asset.file_path])
        asset = self.asset  # noqa

        for p in self.task:
            if p.tag == "param":
                value = str(eval(p.text)) if p.text else ""
                if p.attrib["name"] == "ss":
                    self.ffparams.insert(1, "-ss")
                    self.ffparams.insert(2, value)
                else:
                    self.ffparams.append("-" + p.attrib["name"])
                    if value:
                        self.ffparams.append(value)

            elif p.tag == "script":
                if p.text:
                    try:
                        exec(p.text)
                    except Exception:
                        log_traceback()
                        return NebulaResponse(
                            500, message="Error in task 'pre' script."
                        )

            elif p.tag == "paramset" and eval(p.attrib["condition"]):
                for pp in p.findall("param"):
                    value = str(eval(pp.text)) if pp.text else ""
                    self.ffparams.append("-" + pp.attrib["name"])
                    if value:
                        self.ffparams.append(value)

            elif p.tag == "output":
                id_storage = int(eval(p.attrib["storage"]))
                if not storages[id_storage]:
                    return NebulaResponse(
                        500, message=f"Target storage {id_storage} is not mounted"
                    )

                target_rel_path = eval(p.text)
                target_path = os.path.join(
                    storages[id_storage].local_path, target_rel_path
                )
                target_dir = os.path.split(target_path)[0]

                temp_ext = os.path.splitext(target_path)[1].lstrip(".")
                temp_path = temp_file(id_storage, temp_ext)

                if not temp_path:
                    return NebulaResponse(
                        500, message="Unable to create temp directory"
                    )

                if not os.path.isdir(target_dir):
                    try:
                        os.makedirs(target_dir)
                    except Exception:
                        log_traceback()
                        return NebulaResponse(
                            500,
                            message=f"Unable to create output directory {target_dir}",  # noqa
                        )

                if not p.attrib.get("direct", False):
                    self.files[temp_path] = target_path
                    self.ffparams.append(temp_path)
                else:
                    self.ffparams.append(target_path)

        return NebulaResponse(200, message="Job configured")

    @property
    def is_running(self):
        return self.proc and self.proc.is_running

    def start(self):
        self.proc = FFMPEG(*self.ffparams)
        self.proc.start()

    def stop(self):
        if not self.is_running:
            return
        self.proc.stop()

    def wait(self, progress_handler):
        self.proc.wait(progress_handler)

    def finalize(self):
        if self.proc.return_code > 0:
            logging.error(self.proc.stderr.read())
            return NebulaResponse(
                500, message=f"Encoding failed\n{self.proc.error_log}"
            )

        for temp_path in self.files:
            target_path = self.files[temp_path]
            try:
                logging.debug(f"Moving {temp_path} to {target_path}")
                os.rename(temp_path, target_path)
            except IOError:
                return NebulaResponse(
                    500,
                    message=f"""Unable to move output file
    Source: {temp_path}
    Target: {target_path}""",
                )

        return NebulaResponse(200, message="Task finished")

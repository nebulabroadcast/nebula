import os

from nxtools import logging, FileObject
from nxtools.media import ffprobe, ffmpeg

from .output import ThemisOutput
from .utils import guess_aspect, cuvid_decoders, has_nvidia


class Themis(object):
    def __init__(self, *args, **kwargs):
        self.settings = {
            "expand_tv_levels": False,
            "deinterlace": False,
            "drop_second_field": True,
            "loudnorm": -23,
            "fps": False,  # Use fps of the first video source by default
            "overlay": False,
            "use_temp_file": True,  # Encode to temporary file first
            "temp_dir": False,  # If false, use same directory as target
            "temp_prefix": ".creating.",
            "debug": False,
            "use_cuvid": True,
            "mark_in": 0,
            "mark_out": 0,
        }

        self.settings.update(kwargs)
        self.outputs = []
        self.input_files = []
        self.video_tracks = []
        self.audio_tracks = []

        for input_file in args:
            if isinstance(input_file, FileObject):
                self.input_files.append(input_file)
            elif type(input_file) is str:
                self.input_files.append(FileObject(input_file))
            else:
                raise TypeError("{} must be string of FileObject type")

        for i, input_file in enumerate(self.input_files):
            if not (input_file.exists and input_file.size):
                raise IOError("{} is not a valid file".format(input_file))
            input_file.probe_result = ffprobe(input_file)
            input_file.input_args = []
            if not input_file.probe_result:
                raise IOError("Unable to open media file {}".format(input_file))

            for stream in input_file.probe_result["streams"]:
                if stream["codec_type"] == "video":
                    width = stream["width"]
                    height = stream["height"]

                    fps = stream["r_frame_rate"]

                    if not self["fps"]:
                        self["fps"] = fps

                    try:
                        dar_n, dar_d = [
                            float(e) for e in stream["display_aspect_ratio"].split(":")
                        ]
                        if not (dar_n and dar_d):
                            raise Exception
                    except Exception:
                        dar_n, dar_d = float(stream["width"]), float(stream["height"])
                    aspect = dar_n / dar_d
                    aspect = guess_aspect(dar_n, dar_d)

                    # HW decoding of video track
                    if has_nvidia and self["use_cuvid"]:
                        if stream["codec_name"] in cuvid_decoders:
                            input_file.input_args.extend(
                                ["-c:v", cuvid_decoders[stream["codec_name"]]]
                            )
                            if self["deinterlace"]:
                                input_file.input_args.extend(["-deint", "adaptive"])
                            if self["drop_second_field"]:
                                input_file.input_args.extend(
                                    ["-drop_second_field", "1"]
                                )

                    self.video_tracks.append(
                        {
                            "faucet": "{}:{}".format(i, stream["index"]),
                            "index": len(self.video_tracks),
                            "input_file_index": i,
                            "width": width,
                            "height": height,
                            "fps": fps,
                            "aspect": aspect,
                        }
                    )

                elif stream["codec_type"] == "audio":
                    self.audio_tracks.append(
                        {
                            "faucet": "{}:{}".format(i, stream["index"]),
                            "index": len(self.audio_tracks),
                            "input_file_index": i,
                            "language": stream.get("tags", {}).get("language", "eng"),
                            "channels": stream["channels"],
                        }
                    )

        logging.debug("Themis transcoder initialized")

    @property
    def fps_f(self):
        try:
            fps_f = float(self["fps"])
        except ValueError:
            fps_n, fps_d = [float(e) for e in self["fps"].split("/")]
            fps_f = fps_n / fps_d
        return fps_f

    def __getitem__(self, key):
        return self.settings.get(key, None)

    def __setitem__(self, key, value):
        self.settings[key] = value

    def add_output(self, output_path, **kwargs):
        self.outputs.append(ThemisOutput(self, output_path, **kwargs))

    @property
    def filter_chain(self):
        filters = []

        voutputs = [output.index for output in self.outputs if output.has_video]
        aoutputs = [output.index for output in self.outputs if output.has_audio]

        if self["overlay"] and os.path.exists(str(self["overlay"])):
            splitter = "".join(["[overlay{}]".format(i) for i in voutputs])
            filters.append(
                "movie={},split={}{}".format(self["overlay"], len(voutputs), splitter)
            )

        for i, output in enumerate(self.outputs):
            if output.has_video:
                track = self.video_tracks[output["video_index"]]

                link_filters = []

                if not has_nvidia and self["deinterlace"]:
                    link_filters.append("yadif")

                if track["aspect"] != output.aspect_ratio:
                    w, h = output["width"], output["height"]
                    if output.aspect_ratio > track["aspect"]:  # pillarbox
                        ph = h
                        pw = int(h * track["aspect"])
                        y = 0
                        x = int((w - pw) / 2.0)
                    else:  # letterbox
                        pw = w
                        ph = int(w * (1 / track["aspect"]))
                        x = 0
                        y = int((h - ph) / 2.0)

                    link_filters.append("scale={}:{}".format(pw, ph))
                    link_filters.append("pad={}:{}:{}:{}:black".format(w, h, x, y))

                elif (
                    output["width"] != track["width"]
                    or output["height"] != track["height"]
                ):
                    link_filters.append(
                        "scale={}:{}".format(output["width"], output["height"])
                    )

                link = "[{}]".format(track["faucet"])
                link += ",".join(link_filters or ["null"])
                link += "[outv{}]".format(i)
                filters.append(link)

                # TODO: per output overlay
                if self["overlay"]:
                    # TODO: if overlay needs to be scaled
                    filters.append(
                        "[overlay{}]scale={}:{}[overlay{}]".format(
                            i, output["width"], output["height"], i
                        )
                    )
                    filters.append("[outv{i}][overlay{i}]overlay[outv{i}]".format(i=i))

            if type(output["audio_index"]) == int:
                audio_indices = [output["audio_index"]]
            elif output["audio_index"] == "all":
                audio_indices = [track["index"] for track in self.audio_tracks]
            elif type(output["audio_index"]) == list:
                audio_indices = output["audio_index"]
            else:
                audio_indices = []
            audio_indices.sort()
            audio_tracks = []
            for track in self.audio_tracks:
                for idx in audio_indices:
                    if idx == track["index"]:
                        audio_tracks.append(track)
                        break

            if output.has_audio and audio_tracks:

                split = ""
                link = ""
                if output["audio_mode"] == "smca":
                    if len(audio_tracks) == 1:
                        output.audio_sinks.append(track["faucet"])
                    else:
                        channel_count = 0
                        for track in audio_tracks:
                            channel_count += track["channels"]

                            if track["channels"] == 1:
                                link += "[{}]".format(track["faucet"])
                            else:
                                for c in range(track["channels"]):
                                    isink = "i{}_{}".format(track["index"], c)
                                    split += "[{}]pan=1c|c0=c{}".format(
                                        track["faucet"], c
                                    )
                                    split += "[{}];".format(isink)
                                    link += "[{}]".format(isink)

                        link += "amerge=inputs={}".format(channel_count)
                        link += "[outa{}]".format(i)
                        output.audio_sinks.append("[outa{}]".format(i))
                        filters.append(split + link)

                else:
                    for track in audio_tracks:
                        output.audio_sinks.append(track["faucet"])

        #                if self["loudnorm"]:
        #                    filters.append("[outa{}]loudnorm=i={}[outa{}]".format(i,self["loudnorm"],i))

        return ";".join(filters)

    def start(self, **kwargs):
        progress_handler = kwargs.get("progress_handler", None)

        if not self.input_files:
            logging.error("Unable to start transcoding. No input file specified.")
            return False

        if not self.outputs:
            logging.error("Unable to start transcoding. No output profile specified.")
            return False

        cmd = ["-y"]

        for input_file in self.input_files:
            if input_file.input_args:
                cmd.extend(input_file.input_args)
            if self["mark_in"]:
                cmd.extend(["-ss", str(self["mark_in"])])
            cmd.extend(["-i", input_file.path])

        filter_chain = self.filter_chain
        cmd.extend(["-filter_complex", filter_chain])

        for i, output in enumerate(self.outputs):
            if output.has_video:
                cmd.extend(["-map", "[outv{}]".format(i)])

            for sink in output.audio_sinks:
                cmd.extend(["-map", sink])

            if output.has_video:
                cmd.extend(["-r", self["fps"]])
            if self["mark_out"]:
                cmd.extend(["-to", str(self["mark_out"])])

            cmd.extend(output.build())

        is_success = ffmpeg(
            *cmd, debug=self["debug"], progress_handler=progress_handler
        )

        if self["use_temp_file"]:
            if is_success:
                for output in self.outputs:
                    os.rename(output.temp_path, output.output_path)
            else:
                for output in self.outputs:
                    try:
                        os.remove(output.temp_path)
                    except Exception:
                        pass
        return is_success

import os

from nxtools import *
from nxtools.media import *
from nebulacore import *

__all__ = ["mediaprobe"]


class AudioTrack(dict):
    @property
    def id(self):
        return self["index"]

    def __repr__(self):
        return f"Audio track ({self.get('channel_layout', 'Unknown layout')})"


def parse_audio_track(**kwargs):
    result = {}
    for key in [
                "channels",
                "channel_layout",
                "bit_rate",
                "bits_per_sample",
                "duration",
                "index",
                "sample_fmt",
                "sample_rate",
                "start_pts",
                "start_time",
                "time_base"
            ]:
        if kwargs.get(key):
            result[key] = kwargs[key]

    if kwargs.get("codec_name"):
        result["codec"] = kwargs["codec_name"]
    result["language"] = kwargs.get("tags", {}).get("language", "eng")
    for r in kwargs.get("disposition", []):
        if kwargs["disposition"][r]:
            result["disposition"] = r
            break
    return result


def guess_aspect (w, h):
    if 0 in [w, h]:
        return 0
    valid_aspects = [
            (9, 16),    # Blasphemy
            (3, 4),
            (4, 5),
            (2, 3),
            (1, 1),     # Weird but OK I guess
            (6, 5),     # A.K.A. 1.2:1, Fox movietone
            (5, 4),
            (4, 3),
            (11, 8),    # Academy standard film ratio
            (1.43, 1),  # IMAX
            (3, 2),
            (14, 9),
            (16, 10),
            (5, 3),
            (16, 9),
            (1.85, 1),
            (2.35, 1),
            (2.39, 1),
            (2.4, 1),
            (21, 9),
            (2.76, 1),
        ]
    ratio = float(w) / float(h)
    return "{}/{}".format(
            *min(
                valid_aspects,
                key=lambda x:abs((float(x[0])/x[1])-ratio)
                )
        )


def find_start_timecode(dump):
    tc_places = [
            dump["format"].get("tags", {}).get("timecode", "00:00:00:00"),
            dump["format"].get("timecode", "00:00:00:00"),
        ]
    tc = "00:00:00:00"
    for i, tcp in enumerate(tc_places):
        if tcp != "00:00:00:00":
            tc = tcp
            break
    return tc



def mediaprobe(source_file):
    source_file = str(source_file)
    if not os.path.exists(source_file):
        return {}

    probe_result = ffprobe(source_file)
    if not probe_result:
        return {}

    meta = {"audio_tracks" : []}

    format_info = probe_result["format"]
    source_vdur = 0
    source_adur = 0

    # Track information

    for stream in probe_result["streams"]:
        if stream["codec_type"] == "video":
            if "video/index" in meta and source_vdur:
                # We already have a video track with a duration
                continue

            if stream["disposition"].get("attached_pic", 0) == 1:
                meta["thumbnail_track"] = stream["index"]
                continue

            # Frame rate detection
            fps_n, fps_d = [float(e) for e in stream["r_frame_rate"].split("/")]
            meta["video/fps_f"] = fps_n / fps_d
            meta["video/fps"] = "{}/{}".format(int(fps_n), int(fps_d))

            # Aspect ratio detection
            try:
                dar_n, dar_d = [float(e) for e in stream["display_aspect_ratio"].split(":")]
                if not (dar_n and dar_d):
                    raise Exception
            except Exception:
                dar_n, dar_d = float(stream["width"]), float(stream["height"])

            meta["video/aspect_ratio_f"] = float(dar_n) / dar_d
            meta["video/aspect_ratio"] = guess_aspect(dar_n, dar_d)

            try:
                source_vdur = float(stream["duration"])
            except Exception:
                source_vdur = 0

            meta["video/codec"] = stream["codec_name"]
            meta["video/pixel_format"] = stream["pix_fmt"]
            meta["video/width"] = stream["width"]
            meta["video/height"] = stream["height"]
            meta["video/index"] = stream["index"]
            meta["video/color_range"] = stream.get("color_range", "")
            meta["video/color_space"] = stream.get("color_space", "")

        elif stream["codec_type"] == "audio":
            meta["audio_tracks"].append(parse_audio_track(**stream))
            try:
                source_adur = max(source_adur, float(stream["duration"]))
            except Exception:
                pass

    # Duration

    meta["duration"] = float(format_info.get("duration", 0)) or source_vdur or source_adur
    try:
        meta["num_frames"] = meta["duration"] * meta["video/fps_f"]
    except:
        pass

    # Start timecode

    tc = find_start_timecode(probe_result)
    if tc != "00:00:00:00":
        meta["start_timecode"] = tc2s(tc) #TODO: fps

    # Content type

    if meta.get("duration"):
        if meta.get("num_frames") == 1:
            meta["content_type"] = 3 # IMAGE
        elif "video/index" in meta:
            meta["content_type"] = 2 # VIDEO
        elif meta["audio_tracks"]:
            meta["content_type"] = 1 # AUDIO


    # Descriptive metadata

    if "tags" in format_info:
        tag_map = {
            "title" : ("title", None),
            "artist" : ("role/performer", None),
            "composer" : ("role/composer", None),
            "album" : ("album", None),
            "genre" : ("genre", None),
            "comment" : ("notes", None),
            "date" : ("year", lambda x: int(x) if len(str(x)) == 4 else 0)
        }

        for tag, value in format_info["tags"].items():
            if tag.lower() in tag_map:
                target_tag, transform = tag_map[tag.lower()]
                if transform == None:
                    transform = lambda x: x
                meta[target_tag] = transform(value)

            #TODO: genre, disc, track



    # Clean-up

    keys = list(meta.keys())
    for k in keys:
        if meta[k] is None:
            del(meta[k])

    return meta

from nxtools import *
from nxtools.media import *

__all__ = ["mediaprobe"]


class AudioTrack(dict):
    @property
    def id(self):
        return self["index"]

    def __repr__(self):
        return "Audio track ({})".format(self.get("channel_layout", "Unknown layout"))


def guess_aspect (w, h):
    if 0 in [w, h]:
        return 0
    valid_aspects = [
            (1, 1),
            (5, 4),
            (16, 9),
            (4, 3),
            (2.35, 1)
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
    meta = {
            "audio_tracks" : []
        }

    dump = ffprobe(source_file)
    if not dump:
        return {}

    format_info = dump["format"]
    source_vdur = 0
    source_adur = 0

    for stream in dump["streams"]:
        if stream["codec_type"] == "video":
            # Frame rate detection
            fps_n, fps_d = [float(e) for e in stream["r_frame_rate"].split("/")]
            meta["video/fps_f"] = fps_n / fps_d
            meta["video/fps"] = "{}/{}".format(int(fps_n), int(fps_d))

            # Aspect ratio detection
            try:
                dar_n, dar_d = [
                    float(e) for e in stream["display_aspect_ratio"].split(":")
                ]
                if not (dar_n and dar_d):
                    raise Exception
            except Exception:
                dar_n = float(stream["width"])
                dar_d = float(stream["height"])

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
            meta["video/color_range"] = stream.get("color_range", None)
            meta["video/color_space"] = stream.get("color_space", None)

        elif stream["codec_type"] == "audio":
            meta["audio_tracks"].append(AudioTrack(**stream))
            try:
                source_adur = max(source_adur, float(stream["duration"]))
            except Exception:
                pass

    meta["duration"] = float(format_info.get("duration", 0)) or source_vdur or source_adur

    try:
        meta["num_frames"] = meta["duration"] * meta["video/fps_f"]
    except:
        pass

    tc = find_start_timecode(dump)
    if tc != "00:00:00:00":
        meta["start_timecode"] = tc2s(tc, meta["video/fps_f"])

    #TODO: if video_index and video track is not album art, set content_type to video, else audio
    #TODO: Tags exctraction

    keys = list(meta.keys())
    for k in keys:
        if meta[k] is None:
            del(meta[k])

    return meta

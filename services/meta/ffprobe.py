from nx import *

from nxtools import *
from nxtools.media import *

from .common import Probe


class AudioTrack():
    def __init__(self, **kwargs):
        self.data = kwargs

    def __getitem__(self, key):
        return self.data[key]

    def __repr__(self):
        return "Audio track ({})".format(self.data["channel_layout"])

    def get(self, key, default=False):
        return self.data.get(key, default)

    @property
    def id(self):
        return self["index"]


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
            (6, 5),     #A.K.A. 1.2:1, Fox movietone
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
    valid_aspects.extend([(h,w) for w,h in valid_aspects ])
    valid_aspects.append((1,1))
    ratio = float(w) / float(h)
    return "{}/{}".format(*min(valid_aspects, key=lambda x:abs((float(x[0])/x[1])-ratio)))


def find_start_timecode(probe_result):
    tc_places = [
            probe_result["format"].get("tags", {}).get("timecode", "00:00:00:00"),
            probe_result["format"].get("timecode", "00:00:00:00"),
        ]
    tc = "00:00:00:00"
    for i, tcp in enumerate(tc_places):
        if tcp != "00:00:00:00":
            tc = tcp
            break
    return tc



class FFProbe(Probe):
    title = "FFProbe"

    def accepts(self, asset):
        return asset["content_type"] in [VIDEO, AUDIO, IMAGE]

    def __call__(self, asset):
        old_meta = asset.meta
        meta = {"audio_tracks" : []}

        probe_result = ffprobe(asset.file_path)
        if not probe_result:
            return False

        format_info = probe_result["format"]
        source_vdur = 0
        source_adur = 0

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


        meta["duration"] = float(format_info.get("duration", 0)) or source_vdur or source_adur
        try:
            meta["num_frames"] = meta["duration"] * meta["video/fps_f"]
        except:
            pass

        tc = find_start_timecode(probe_result)
        if tc != "00:00:00:00":
            meta["start_timecode"] = tc2s(tc) #TODO: fps

        #TODO: if video_index and video track is not album art, set content_type to video, else audio
        #TODO: Tags exctraction

        for key in meta:
            asset[key] = meta[key]

        return asset


#
# Legacy ffprobe code
#

class FFProbe2(Probe):

    def __call__(self, asset):
        old_meta = asset.meta
        fname = asset.file_path
        try:
            probe_result = ffprobe(fname)
        except Exception:
            logging.error("Unable to parse media metadata of {}".format(asset))
            asset["meta_probed"] = 1
            return asset

        asset["file/format"]   = format.get("format_name", "")
        asset["duration"] = format.get("duration", 0)

        ## Streams

        at_atrack  = 1         # Audio track identifier (A1, A2...)

        for stream in streams:
            if stream["codec_type"] == "video" and asset["content_type"] in [VIDEO, IMAGE]: # ignore mp3 album art etc.

                asset["video/fps"]          = stream.get("r_frame_rate","")
                asset["video/codec"]        = stream.get("codec_name","")
                asset["video/pixel_format"] = stream.get("pix_fmt", "")
                asset["video/color_range"] = stream.get("color_range", "")
                asset["video/color_space"] = stream.get("color_space", "")

        #
        # Descriptive metadata (tags)
        #

        content_type = asset["content_type"]
        if "tags" in format.keys() and not "meta_probed" in asset.meta:
            if content_type == AUDIO:
                tag_mapping = {
                                "title"   : "title",
                                "artist"  : "role/performer",
                                "composer": "role/composer",
                                "album"   : "album",
                              }
            else:
                tag_mapping = {
                                "title" : "title"
                                }
            for tag in format["tags"]:
                value = format["tags"][tag]
                if tag in tag_mapping:
                    if not tag_mapping[tag] in asset.meta or tag == "title": # Only title should be overwriten if exists. There is a reason
                        asset[tag_mapping[tag]] = value
                elif tag in ["track","disc"] and content_type == AUDIO:
                    if not "album/%s"%tag in asset.meta:
                        asset["album/%s"%tag] = value.split("/")[0]
                elif tag == "genre" and content_type == AUDIO:
                    # Ultra mindfuck
                    NX_MUSIC_GENRES = [
                                        "Alt Rock",
                                        "Electronic",
                                        "Punk Rock",
                                        "Pop",
                                        "Rock",
                                        "Metal",
                                        "Hip Hop",
                                        "Demoscene",
                                        "Emo"
                                        ]

                    for genre in NX_MUSIC_GENRES:
                        genre_parts = genre.lower().split()
                        for g in genre_parts:
                            if value.lower().find(g) > -1:
                                continue
                            break
                        else:
                            if not "genre/music" in asset.meta:
                                asset["genre/music"] = genre
                            break
                    else:
                        if not "genre/music" in asset.meta:
                            asset["genre/music"] = value
            asset["meta_probed"] = 1
        return asset

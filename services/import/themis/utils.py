import os

cuvid_decoders = {
    "h264": "h264_cuvid",
    "hevc": "hevc_cuvid",
    "mjpeg": "mjpeg_cuvid",
    "mpeg4": "mpeg4_cuvid",
    "vc1": "vc1_cuvid",
    "vp8": "vp8_cuvid",
    "vp9": "vp9_cuvid",
}


def guess_aspect(w, h):
    if 0 in [w, h]:
        return 0
    valid_aspects = [(16, 9), (4, 3), (2.35, 1), (5, 4), (1, 1)]
    ratio = float(w) / float(h)
    n, d = min(valid_aspects, key=lambda x: abs((float(x[0]) / x[1]) - ratio))
    return float(n) / d


class ThemisProgress(dict):
    pass


def get_has_nvidia():
    return not bool(os.system("nvidia-smi > /dev/null 2>&1"))


has_nvidia = get_has_nvidia()

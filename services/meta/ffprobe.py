import difflib

from nxtools import slugify, logging, get_base_name

from nx.mediaprobe import mediaprobe
from nx.core.enum import MetaClass
from nx.core.metadata import meta_types


def string2cs(key, value):
    """Return a CS best matching for the given string."""
    logging.info(f"Parsing {key} value {value}")
    cs = meta_types[key].cs
    vslug = slugify(value, separator=" ")
    best_match = None
    max_ratio = 0
    for ckey in cs.data:
        cval = cs.alias(ckey, "en")
        reflist = [v.strip() for v in cval.split("/")]
        for m in reflist:
            mslug = slugify(m, separator=" ")
            r = difflib.SequenceMatcher(None, vslug, mslug).ratio()
            if r < max_ratio:
                continue
            best_match = ckey
            max_ratio = r

    if max_ratio < 0.85:
        return None
    return best_match


def ffprobe_asset(asset):
    meta = mediaprobe(asset.file_path)
    if not meta:
        return False

    for key, value in meta.items():

        # Only update auto-generated title
        if key == "title":
            if value == get_base_name(asset.file_path):
                continue

        # Do not update descriptive metadata
        elif meta_types[key]["ns"] == "m" and asset[key]:
            continue

        if key == "genre" and meta_types["genre"]["class"] == MetaClass.SELECT:
            new_val = string2cs("genre", value)
            if new_val is None:
                continue
            asset["genre/original"] = value
            value = new_val

        asset[key] = value

    return asset

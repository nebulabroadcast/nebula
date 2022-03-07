import re


def shorten(instr, nlen):
    line = instr.split("\n")[0]
    if len(line) < 100:
        return line
    return line[:nlen] + "..."


def filter_match(f, r):
    """Match filter with OR."""
    if type(f) in [list, tuple]:
        for fl in f:
            if re.match(fl, r):
                return True
        return False
    else:
        return re.match(f, r)


def tree_indent(data):
    has_children = False
    for i, row in enumerate(data):
        value = row["value"]
        parentindex = None
        for j in range(i - 1, -1, -1):
            if value.startswith(data[j]["value"] + "."):
                parentindex = j
                data[j]["has_children"] = True
                break
        if parentindex is None:
            data[i]["indent"] = 0
            continue
        has_children = True
        data[i]["indent"] = data[parentindex]["indent"] + 1

    for i, row in enumerate(data):
        role = row.get("role", "option")
        if role in ["label", "hidden"]:
            continue
        elif has_children and row.get("has_children"):
            data[i]["role"] = "header"
        else:
            data[i]["role"] = "option"


#
# CS Caching
#


class CachedObject(type):
    _cache = None

    @classmethod
    def clear_cache(cls):
        cls._cache = None

    def __call__(cls, *args):
        if cls._cache is None:
            cls._cache = {}
        key = tuple(args)
        if key not in cls._cache:
            cls._cache[key] = super().__call__(*args)
        return cls._cache[key]


# Moved to metadata, but this stub needs to live here so older firefly
# doesn't break.
def clear_cs_cache():
    from . import metadata

    metadata.clear_cs_cache()

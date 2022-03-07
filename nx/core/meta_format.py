from nxtools import format_filesize, format_time, s2time, unaccent, logging

from .common import config, storages
from .enum import MetaClass, ContentType, ObjectStatus, MediaType
from .meta_utils import shorten, tree_indent

#
# Formating helpers
#


def format_text(meta_type, value, **kwargs):
    result = kwargs.get("result", "alias")
    if result == "brief":
        return {"value": shorten(value, 100)}
    if result == "full":
        return {"value": value}
    if kwargs.get("shorten"):  # TODO: deprecated. remove
        return shorten(value, kwargs["shorten"])
    return value


def format_integer(meta_type, value, **kwargs):
    result = kwargs.get("result", "alias")
    value = int(value)

    if (not value) and meta_type.settings.get("hide_null", False):
        alias = ""

    elif meta_type.key == "file/size":
        alias = format_filesize(value)

    elif meta_type.key == "id_folder":
        alias = config["folders"].get(value, {}).get("title", "")

    elif meta_type.key == "status":
        alias = ObjectStatus(value).name

    elif meta_type.key == "content_type":
        alias = ContentType(value).name

    elif meta_type.key == "media_type":
        alias = MediaType(value).name

    elif meta_type.key == "id_storage":
        alias = storages[value].__repr__().lstrip("storage ")

    else:
        alias = str(value)

    if result in ["brief", "full"]:
        return {"value": value, "alias": alias}
    return alias


def format_numeric(meta_type, value, **kwargs):
    if type(value) not in [int, float]:
        try:
            value = float(value)
        except ValueError:
            value = 0
    result = kwargs.get("result", "alias")
    alias = "{:.03f}".format(value)
    if result in ["brief", "full"]:
        return {"value": value, "alias": alias}
    return alias


def format_boolean(meta_type, value, **kwargs):
    value = int(value)
    result = kwargs.get("result", "alias")
    alias = ["no", "yes"][bool(value)]
    if result in ["brief", "full"]:
        return {"value": value, "alias": alias}
    return alias


def format_datetime(meta_type, value, **kwargs):
    result = kwargs.get("result", "alias")
    time_format = meta_type.settings.get("format", False) or kwargs.get(
        "format", "%Y-%m-%d %H:%M"
    )
    alias = format_time(
        value, time_format, never_placeholder=kwargs.get("never_placeholder", "never")
    )
    if result in ["brief", "full"]:
        return {"value": value, "alias": alias}
    return alias


def format_timecode(meta_type, value, **kwargs):
    result = kwargs.get("result", "alias")
    alias = s2time(value)
    if result in ["brief", "full"]:
        return {"value": value, "alias": alias}
    return alias


def format_regions(meta_type, value, **kwargs):
    result = kwargs.get("result", "alias")
    alias = "{} regions".format(len(value))
    if result in ["brief", "full"]:
        return {"value": value, "alias": alias}
    return alias


def format_fract(meta_type, value, **kwargs):
    result = kwargs.get("result", "alias")
    alias = value  # TODO
    if result in ["brief", "full"]:
        return {"value": value, "alias": alias}
    return alias


def format_select(meta_type, value, **kwargs):
    value = str(value)
    lang = kwargs.get("language", config.get("language", "en"))
    result = kwargs.get("result", "alias")

    cs = meta_type.cs

    if result == "brief":
        return {"value": value, "alias": cs.alias(value, lang)}

    elif result == "full":
        result = []
        has_zero = has_selected = False
        if (value not in cs.data) and (value in cs.csdata):
            adkey = [value]
        else:
            adkey = []
        for csval in cs.data + adkey:
            if csval == "0":
                has_zero = True
            if value == csval:
                has_selected = True
            role = cs.role(csval)
            if role == "hidden":
                continue
            result.append(
                {
                    "value": csval,
                    "alias": cs.alias(csval, lang),
                    "description": cs.description(csval, lang),
                    "selected": value == csval,
                    "role": role,
                    "indent": 0,
                }
            )
        if meta_type.get("mode") == "tree":

            def sort_mode(x):
                return "".join([n.zfill(5) for n in x["value"].split(".")])

            result.sort(key=sort_mode)
            tree_indent(result)
        else:
            if meta_type.get("order") == "alias":

                def sort_mode(x):
                    return unaccent(str(x["alias"]))

            else:

                def sort_mode(x):
                    return unaccent(str(x["value"]))

            result.sort(key=sort_mode)
        if not has_selected:
            if has_zero:
                result[0]["selected"] = True
            else:
                result.insert(
                    0, {"value": "", "alias": "", "selected": True, "role": "option"}
                )
        return result

    elif result == "description":
        return cs.description(value, lang)

    else:  # alias
        return cs.alias(value, lang)


def format_list(meta_type, value, **kwargs):
    if type(value) == str:
        value = [value]
    elif type(value) != list:
        logging.warning("Unknown value {} for key {}".format(value, meta_type))
        value = []

    value = [str(v) for v in value]
    lang = kwargs.get("language", config.get("language", "en"))
    result = kwargs.get("result", "alias")

    cs = meta_type.cs

    if result == "brief":
        return {
            "value": value,
            "alias": ", ".join(cs.aliases(lang)),
        }

    elif result == "full":
        result = []
        adkey = []
        for v in value:
            if (v not in cs.data) and (v in cs.csdata):
                adkey.append(v)

        for csval in cs.data + adkey:
            role = cs.role(csval)
            if role == "hidden":
                continue
            result.append(
                {
                    "value": csval,
                    "alias": cs.alias(csval, lang),
                    "description": cs.description(csval, lang),
                    "selected": csval in value,
                    "role": role,
                    "indent": 0,
                }
            )
        if meta_type.get("mode") == "tree":

            def sort_mode(x):
                return "".join([n.zfill(3) for n in x["value"].split(".")])

            result.sort(key=sort_mode)
            tree_indent(result)
        else:
            if meta_type.get("order") == "alias":

                def sort_mode(x):
                    return unaccent(str(x["alias"]))

            else:

                def sort_mode(x):
                    return unaccent(str(x["value"]))

            result.sort(key=sort_mode)
        return result

    elif result == "description":
        if len(value):
            return cs.description(value[0], lang)
        return ""

    else:  # alias
        return ", ".join(cs.aliases(lang))


def format_color(meta_type, value, **kwargs):
    result = kwargs.get("result", "alias")
    alias = "#{0:06X}".format(value)
    if result in ["brief", "full"]:
        return {"value": value, "alias": alias}
    return alias


humanizers = {
    -1: None,
    MetaClass.STRING: format_text,
    MetaClass.TEXT: format_text,
    MetaClass.INTEGER: format_integer,
    MetaClass.NUMERIC: format_numeric,
    MetaClass.BOOLEAN: format_boolean,
    MetaClass.DATETIME: format_datetime,
    MetaClass.TIMECODE: format_timecode,
    MetaClass.OBJECT: format_regions,
    MetaClass.FRACTION: format_fract,
    MetaClass.SELECT: format_select,
    MetaClass.LIST: format_list,
    MetaClass.COLOR: format_color,
}

import re
from collections import defaultdict
from functools import lru_cache
from typing import Any, DefaultDict

from nxtools import unaccent

from nebula.settings import settings
from nebula.settings.common import LanguageCode


@lru_cache(maxsize=512)
def filter_match(filter_string: str, value: str) -> bool:
    """Match filter with OR."""
    if filter_string is None:
        return True
    if type(filter_string) in [list, tuple]:
        return any(re.match(fl, value) for fl in filter_string)
    else:
        return bool(re.match(filter_string, value))


@lru_cache(maxsize=512)
def get_meta_title(name: str, lang: LanguageCode = "en") -> str:
    """Return a localized title for a given meta type."""
    meta_type = settings.metatypes[name]
    if not (lall := meta_type.aliases.get(lang)):
        return name
    return lall.title


@lru_cache(maxsize=512)
def get_meta_description(name: str, lang: LanguageCode = "en") -> str | None:
    """Return a localized description for a given meta type."""
    meta_type = settings.metatypes[name]
    if not (lall := meta_type.aliases.get(lang)):
        return name
    return lall.description


@lru_cache(maxsize=512)
def get_meta_header(name: str, lang: LanguageCode = "en") -> str | None:
    """Return a localized column header for a given meta type."""
    meta_type = settings.metatypes[name]
    if not (lall := meta_type.aliases.get(lang)):
        return name
    return lall.header


@lru_cache(maxsize=512)
def get_cs_titles(urn: str, values: tuple[str], lang: LanguageCode = "en") -> list[str]:
    """Return a list of localized titles for a given classification scheme values."""
    result: list[str] = []
    if (schema := settings.cs.get(urn)) is None:
        result = list(values)
    else:
        for value in values:
            if (csval := schema.get(value)) is None:
                result.append(str(value))
            else:
                if (alias := csval.aliases.get(lang)) is not None or (
                    alias := csval.aliases.get("en")
                ) is not None:
                    result.append(alias.title)
                else:
                    result.append(value)
    return result


@lru_cache(maxsize=512)
def make_cs_tree(
    urn: str,
    lang: LanguageCode = "en",
    order: str | None = None,
    filter: str | None = None,
) -> list[dict[str, Any]]:
    """Build a tree of classification scheme values for a given URN."""
    if order is None:
        order = "value"

    if (scheme := settings.cs.get(urn)) is None:
        return []
    items = [
        {"value": value, "title": get_cs_titles(urn, (value,), lang)[0]}
        for value, _ in scheme.items()
    ]
    if order == "value":
        items.sort(key=lambda x: x["value"])
    elif order in ["title", "alias"]:
        items.sort(key=lambda x: unaccent(x["title"]))

    parents: DefaultDict[str, list[Any]] = defaultdict(list[Any])

    for item in items:
        path = item["value"].split(".")
        parent_id = ".".join(path[:-1])
        if parent_id not in [i["value"] for i in items]:
            parent_id = ""
        parents[parent_id].append(item)

    def build_tree(parents: dict[str, Any], parent: str = "") -> list[dict[str, Any]]:
        items = []
        for child in parents.get(parent, []):
            if not child:
                continue
            has_children = child["value"] in parents
            if not filter_match(filter, child["value"]):
                continue
            items.append(child)
            if has_children and (d := build_tree(parents, child["value"])):
                items[-1]["children"] = d
        return items

    return build_tree(parents, "")

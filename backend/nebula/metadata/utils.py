import re
from functools import lru_cache

from nebula.settings import settings
from nebula.settings.common import LanguageCode


@lru_cache(maxsize=512)
def filter_match(filter_string: str, value: str) -> bool:
    """Match filter with OR."""
    if filter_string is None:
        # just in case
        return True
    if type(filter_string) in [list, tuple]:
        return any(re.match(fl, value) for fl in filter_string)
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
            elif (alias := csval.aliases.get(lang)) is not None or (
                alias := csval.aliases.get("en")
            ) is not None:
                result.append(alias.title)
            else:
                result.append(value)
    return result

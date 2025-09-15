__all__ = [
    "camelize",
    "format_filesize",
    "get_base_name",
    "indent",
    "obscure",
    "slugify",
    "parse_access_token",
    "parse_api_key",
    "string2color",
    "fract2float",
    "unaccent",
]

import functools
import os
import string
import textwrap
from typing import Literal, overload

import unidecode

SLUG_WHITELIST = string.ascii_letters + string.digits
SLUG_SEPARATORS = " ,./\\;:!|*^#@~+-_="


def camelize(src: str) -> str:
    """Convert snake_case to camelCase."""
    components = src.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


def get_base_name(file_path: str) -> str:
    return os.path.splitext(os.path.basename(file_path))[0]


def unaccent(string: str) -> str:
    """Remove accents and/or transliterate non-ascii characters."""
    return unidecode.unidecode(string)


def string2color(string: str) -> str:
    """Generate more or less unique color for a given string."""
    h = 0
    for char in string:
        h = ord(char) + ((h << 5) - h)
    return hex(h & 0x00FFFFFF)


def fract2float(fract: str) -> float:
    """Convert a fraction string to float."""
    nd = fract.split("/")
    try:
        if len(nd) == 1 or nd[1] == "1":
            return float(nd[0])
        return float(nd[0]) / float(nd[1])
    except (IndexError, ValueError):
        return 1


def format_filesize(size: int) -> str:
    """Format a file size in bytes to a human-readable string."""
    if size < 1024:
        return f"{size} B"
    elif size < 1024**2:
        return f"{size / 1024:.2f} KB"
    elif size < 1024**3:
        return f"{size / 1024**2:.2f} MB"
    elif size < 1024**4:
        return f"{size / 1024**3:.2f} GB"
    else:
        return f"{size / 1024**4:.2f} TB"


def indent(text: str, amount: int = 4) -> str:
    """Indent a multi-line text."""
    return textwrap.indent(text, " " * amount)


@functools.lru_cache(maxsize=128)
def obscure(text: str) -> str:
    """obscure all characters in the text except spaces."""
    return "".join("*" if c != " " else c for c in text)


def parse_access_token(authorization: str) -> str | None:
    """Parse an authorization header value.

    Get a TOKEN from "Bearer TOKEN" and return a token
    string or None if the input value does not match
    the expected format (64 bytes string)
    """
    if (not authorization) or not isinstance(authorization, str):
        return None
    try:
        # ttype is not a ttypo :)
        ttype, token = authorization.split()
    except ValueError:
        return None
    if ttype.lower() != "bearer":
        return None
    if len(token) != 64:
        return None
    return token


def parse_api_key(authorization: str) -> str | None:
    if (not authorization) or not isinstance(authorization, str):
        return None
    try:
        ttype, token = authorization.split()
    except ValueError:
        return None
    if ttype.lower() != "apikey":
        return None
    return token


@overload
def slugify(
    input_string: str,
    *,
    separator: str = "-",
    lower: bool = True,
    make_set: Literal[False] = False,
    min_length: int = 1,
    slug_whitelist: str = SLUG_WHITELIST,
    split_chars: str = SLUG_SEPARATORS,
) -> str: ...


@overload
def slugify(
    input_string: str,
    *,
    separator: str = "-",
    lower: bool = True,
    make_set: Literal[True] = True,
    min_length: int = 1,
    slug_whitelist: str = SLUG_WHITELIST,
    split_chars: str = SLUG_SEPARATORS,
) -> set[str]: ...


def slugify(
    input_string: str,
    *,
    separator: str = "-",
    lower: bool = True,
    make_set: bool = False,
    min_length: int = 1,
    slug_whitelist: str = SLUG_WHITELIST,
    split_chars: str = SLUG_SEPARATORS,
) -> str | set[str]:
    """Slugify a text string.

    This function removes transliterates input string to ASCII,
    removes special characters and use join resulting elements
    using specified separator.

    Args:
        input_string (str):
            Input string to slugify

        separator (str):
            A string used to separate returned elements (default: "-")

        lower (bool):
            Convert to lower-case (default: True)

        make_set (bool):
            Return "set" object instead of string

        min_length (int):
            Minimal length of an element (word)

        slug_whitelist (str):
            Characters allowed in the output
            (default: ascii letters, digits and the separator)

        split_chars (str):
            Set of characters used for word splitting (there is a sane default)

    """
    input_string = unidecode.unidecode(input_string)
    if lower:
        input_string = input_string.lower()
    input_string = "".join(
        [ch if ch not in split_chars else " " for ch in input_string]
    )
    input_string = "".join(
        [ch if ch in slug_whitelist + " " else "" for ch in input_string]
    )
    elements = [
        elm.strip() for elm in input_string.split(" ") if len(elm.strip()) >= min_length
    ]
    return set(elements) if make_set else separator.join(elements)

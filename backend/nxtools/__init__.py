# This file provides backward compatibility for the nxtools package, that has been
# removed. This module re-exports selected functions from the nx.utils module.
# This allows existing code that imports from nxtools to continue working
# without modification, but this is deprecated and will be removed in Nebula 6.2

__all__ = [
    "hash_data",
    "create_hash",
    "create_uuid",
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
    "datestr2ts",
    "tc2s",
    "s2time",
    "f2tc",
    "s2tc",
    "s2words",
    "format_time",
    "xml",
]


from nx.utils import (
    camelize,
    create_hash,
    create_uuid,
    datestr2ts,
    f2tc,
    format_filesize,
    format_time,
    fract2float,
    get_base_name,
    hash_data,
    indent,
    obscure,
    parse_access_token,
    parse_api_key,
    s2tc,
    s2time,
    s2words,
    slugify,
    string2color,
    tc2s,
    unaccent,
    xml,
)

from .enum import MetaClass


class NebulaInvalidValueError(Exception):
    pass


#
# Validators
#


def validate_default(meta_type, value):
    if type(value) in [str, float, int, list, dict]:
        return value
    return str(value)


def validate_string(meta_type, value):
    return str(value).strip()


def validate_text(meta_type, value):
    return str(value).strip()


def validate_integer(meta_type, value):
    if not value:
        return 0
    try:
        value = int(value)
    except ValueError:
        raise NebulaInvalidValueError
    return value


def validate_numeric(meta_type, value):
    if type(value) in [int, float]:
        return value
    try:
        return float(value)
    except ValueError:
        raise NebulaInvalidValueError


def validate_boolean(meta_type, value):
    if value:
        return True
    return False


def validate_datetime(meta_type, value):
    return validate_numeric(meta_type, value)


def validate_timecode(meta_type, value):
    return validate_numeric(meta_type, value)


def validate_regions(meta_type, value):
    return value


def validate_fract(meta_type, value):
    value = value.replace(":", "/")
    split = value.split("/")
    assert (
        len(split) == 2
        and split[0].replace(".", "", 1).isdigit()
        and split[1].isdigit()
    ), "Bad fract: {}".format(value)
    return value


def validate_select(meta_type, value):
    return str(value)


def validate_list(meta_type, value):
    return [str(v) for v in value] if type(value) == list else [str(value)]


def validate_color(meta_type, value):
    if not value:
        return 0
    if type(value) == int:
        return value
    if type(value) != str:
        return 0
    if value.startswith("#"):
        base = 16
        value = value.lstrip("#")
    else:
        base = 10
    try:
        value = int(value, base)
    except ValueError:
        raise NebulaInvalidValueError
    return value


validators = {
    -1: validate_default,
    MetaClass.STRING: validate_string,
    MetaClass.TEXT: validate_text,
    MetaClass.INTEGER: validate_integer,
    MetaClass.NUMERIC: validate_numeric,
    MetaClass.BOOLEAN: validate_boolean,
    MetaClass.DATETIME: validate_datetime,
    MetaClass.TIMECODE: validate_timecode,
    MetaClass.OBJECT: validate_regions,
    MetaClass.FRACTION: validate_fract,
    MetaClass.SELECT: validate_select,
    MetaClass.LIST: validate_list,
    MetaClass.COLOR: validate_color,
}

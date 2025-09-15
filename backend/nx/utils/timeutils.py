__all__ = [
    "datestr2ts",
    "tc2s",
    "s2time",
    "f2tc",
    "s2tc",
    "s2words",
    "format_time",
]


import datetime
import time


def datestr2ts(datestr: str, hh: int = 0, mm: int = 0, ss: int = 0) -> int:
    """Convert a `YYYY-MM-DD` string to an unix timestamp.

    By default, start of the day (midnight) is returned.
    """
    split = datestr.split("-")
    if len(split) != 3:
        raise ValueError("Invalid date string")
    if not all(e.isdigit() for e in split):
        raise ValueError("Invalid date string")
    dt = datetime.datetime(
        int(split[0]),
        int(split[1].lstrip("0")),
        int(split[2].lstrip("0")),
    )
    offset = datetime.timedelta(hours=hh, minutes=mm, seconds=ss)
    tstamp = int(time.mktime((dt + offset).timetuple()))
    return tstamp


def tc2s(tc: str, base: float = 25) -> float:
    """Convert an SMPTE timecode (HH:MM:SS:FF) to number of seconds."""
    tc = tc.replace(";", ":")
    hh, mm, ss, ff = (int(e) for e in tc.split(":"))
    res: float
    res = hh * 3600
    res += mm * 60
    res += ss
    res += ff / float(base)
    return res


def s2time(secs: float, show_secs: bool = True, show_fracs: bool = True) -> str:
    """Convert seconds to time.

    Args:
        secs (float):

        show_secs (bool):
            Show seconds (default: True)

        show_fracs (bool):
            Show centiseconds (default: True)

    Returns:
        str:
            `HH:MM` / `HH:MM:SS` / `HH:MM:SS.CS` string
    """
    try:
        secs = max(0, float(secs))
    except ValueError:
        placeholder = "--:--"
        if show_secs:
            placeholder += ":--"
            if show_fracs:
                placeholder += ".--"
        return placeholder
    wholesecs = int(secs)
    centisecs = int((secs - wholesecs) * 100)
    hh = int(wholesecs / 3600)
    hd = int(hh % 24)
    mm = int((wholesecs / 60) - (hh * 60))
    ss = int(wholesecs - (hh * 3600) - (mm * 60))
    r = f"{hd:02d}:{mm:02d}"
    if show_secs:
        r += f":{ss:02d}"
        if show_fracs:
            r += f".{centisecs:02d}"
    return r


def f2tc(frames: int, base: float = 25) -> str:
    """Convert frames to an SMPTE timecode.

    Args:
        frames (int):
            Frame count

        base (float):
            Frame rate (default: 25)

    Returns:
        str:
            SMPTE timecode (`HH:MM:SS:FF`)
    """
    try:
        f = max(0, int(frames))
    except ValueError:
        return "--:--:--:--"
    hh = int((f / base) / 3600)
    mm = int(((f / base) / 60) - (hh * 60))
    ss = int((f / base) - (hh * 3600) - (mm * 60))
    ff = int(f - (hh * 3600 * base) - (mm * 60 * base) - (ss * base))
    return f"{hh:02d}:{mm:02d}:{ss:02d}:{ff:02d}"


def s2tc(secs: float, base: float = 25) -> str:
    """Convert seconds to an SMPTE timecode.

    Args:
        secs (float):
            Number of seconds

        base (float):
            Frame rate (default: 25)

    Returns:
        str:
            SMPTE timecode (`HH:MM:SS:FF`)
    """
    try:
        f = max(0, int(secs * base))
    except ValueError:
        return "--:--:--:--"
    hh = int((f / base) / 3600)
    hd = int(hh % 24)
    mm = int(((f / base) / 60) - (hh * 60))
    ss = int((f / base) - (hh * 3600) - (mm * 60))
    ff = int(f - (hh * 3600 * base) - (mm * 60 * base) - (ss * base))
    return f"{hd:02d}:{mm:02d}:{ss:02d}:{ff:02d}"


def s2words(secs: int) -> str:
    """Create a textual (english) representation of given number of seconds.

    This function is useful for showing estimated time of a process.

    Args:
        secs (int):
            Number of seconds

    Returns:
        str:
            Textual information
    """
    s = int(secs)
    if s < 60:
        return f"{s} seconds".format(s)
    elif s < 120:
        return f"1 minute {int(s-60)} seconds"
    elif s < 7200:
        return f"{int(s/60)} minutes"
    else:
        return f"{int(s/3600)} hours"


def format_time(
    timestamp: float | None = None,
    time_format: str = "%Y-%m-%d %H:%M:%S",
    never_placeholder: str = "never",
    gmt: bool = False,
) -> str:
    """Format an Unix timestamp as a local or GMT time.

    Args:
        timestamp (int):
            input unix timestamp

        time_format (str):
            strftime specification
            (default: "%Y-%m-%d %H:%M:%S" - the correct one)

        never_placeholder (str):
            text used when timestamp is not specified (default: "never")

        gmt (bool):
            Use GMT time instead of local time (default: False)

    Returns:
        str:
            Formatted time
    """
    if not timestamp:
        return never_placeholder
    tstruct = time.gmtime(timestamp) if gmt else time.localtime(timestamp)
    return time.strftime(time_format, tstruct)

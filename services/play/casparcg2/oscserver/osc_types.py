"""Functions to get OSC types from datagrams"""

__all__ = [
    "OSCParseError",
    "IMMEDIATELY",
    "get_string",
    "get_int",
    "get_uint64",
    "get_timetag",
    "get_float",
    "get_double",
    "get_blob",
    "get_date",
    "get_rgba",
    "get_midi"
]

import struct

from . import ntp
from datetime import datetime, timedelta, date

from typing import Union, Tuple


class OSCParseError(Exception):
    """Base exception for when a datagram parsing error occurs."""

# Constant for special ntp datagram sequences that represent an immediate time.
IMMEDIATELY = 0

# Datagram length in bytes for types that have a fixed size.
_INT_DGRAM_LEN = 4
_UINT64_DGRAM_LEN = 8
_FLOAT_DGRAM_LEN = 4
_DOUBLE_DGRAM_LEN = 8
_TIMETAG_DGRAM_LEN = 8
# Strings and blob dgram length is always a multiple of 4 bytes.
_STRING_DGRAM_PAD = 4
_BLOB_DGRAM_PAD = 4
_EMPTY_STR_DGRAM = b'\x00\x00\x00\x00'


def get_string(dgram: bytes, start_index: int) -> Tuple[str, int]:
    """Get a python string from the datagram, starting at pos start_index.

    According to the specifications, a string is:
    "A sequence of non-null ASCII characters followed by a null,
    followed by 0-3 additional null characters to make the total number
    of bits a multiple of 32".

    Args:
      dgram: A datagram packet.
      start_index: An index where the string starts in the datagram.

    Returns:
      A tuple containing the string and the new end index.

    Raises:
      ParseError if the datagram could not be parsed.
    """
    if start_index < 0:
        raise ParseError('start_index < 0')
    offset = 0
    try:
        if (len(dgram) > start_index + _STRING_DGRAM_PAD
                and dgram[start_index + _STRING_DGRAM_PAD] == _EMPTY_STR_DGRAM):
            return '', start_index + _STRING_DGRAM_PAD
        while dgram[start_index + offset] != 0:
            offset += 1
        # Align to a byte word.
        if (offset) % _STRING_DGRAM_PAD == 0:
            offset += _STRING_DGRAM_PAD
        else:
            offset += (-offset % _STRING_DGRAM_PAD)
        # Python slices do not raise an IndexError past the last index,
        # do it ourselves.
        if offset > len(dgram[start_index:]):
            raise ParseError('Datagram is too short')
        data_str = dgram[start_index:start_index + offset]
        return data_str.replace(b'\x00', b'').decode('utf-8'), start_index + offset
    except IndexError as ie:
        raise ParseError('Could not parse datagram %s' % ie)
    except TypeError as te:
        raise ParseError('Could not parse datagram %s' % te)


def get_int(dgram: bytes, start_index: int) -> Tuple[int, int]:
    """Get a 32-bit big-endian two's complement integer from the datagram.

    Args:
      dgram: A datagram packet.
      start_index: An index where the integer starts in the datagram.

    Returns:
      A tuple containing the integer and the new end index.

    Raises:
      ParseError if the datagram could not be parsed.
    """
    try:
        if len(dgram[start_index:]) < _INT_DGRAM_LEN:
            raise ParseError('Datagram is too short')
        return (
            struct.unpack('>i',
                          dgram[start_index:start_index + _INT_DGRAM_LEN])[0],
            start_index + _INT_DGRAM_LEN)
    except (struct.error, TypeError) as e:
        raise ParseError('Could not parse datagram %s' % e)


def get_uint64(dgram: bytes, start_index: int) -> Tuple[int, int]:
    """Get a 64-bit big-endian unsigned integer from the datagram.

    Args:
      dgram: A datagram packet.
      start_index: An index where the integer starts in the datagram.

    Returns:
      A tuple containing the integer and the new end index.

    Raises:
      ParseError if the datagram could not be parsed.
    """
    try:
        if len(dgram[start_index:]) < _UINT64_DGRAM_LEN:
            raise ParseError('Datagram is too short')
        return (
            struct.unpack('>Q',
                          dgram[start_index:start_index + _UINT64_DGRAM_LEN])[0],
            start_index + _UINT64_DGRAM_LEN)
    except (struct.error, TypeError) as e:
        raise ParseError('Could not parse datagram %s' % e)


def get_timetag(dgram: bytes, start_index: int) -> Tuple[datetime, int]:
    """Get a 64-bit OSC time tag from the datagram.

    Args:
      dgram: A datagram packet.
      start_index: An index where the osc time tag starts in the datagram.

    Returns:
      A tuple containing the tuple of time of sending in utc as datetime and the
      fraction of the current second and the new end index.

    Raises:
      ParseError if the datagram could not be parsed.
    """
    try:
        if len(dgram[start_index:]) < _TIMETAG_DGRAM_LEN:
            raise ParseError('Datagram is too short')

        timetag, _ = get_uint64(dgram, start_index)
        seconds, fraction = ntp.parse_timestamp(timetag)

        hours, seconds = seconds // 3600, seconds % 3600
        minutes, seconds = seconds // 60, seconds % 60

        utc = (datetime.combine(ntp._NTP_EPOCH, datetime.min.time()) +
               timedelta(hours=hours, minutes=minutes, seconds=seconds))

        return (utc, fraction), start_index + _TIMETAG_DGRAM_LEN
    except (struct.error, TypeError) as e:
        raise ParseError('Could not parse datagram %s' % e)



def get_float(dgram: bytes, start_index: int) -> Tuple[float, int]:
    """Get a 32-bit big-endian IEEE 754 floating point number from the datagram.

    Args:
      dgram: A datagram packet.
      start_index: An index where the float starts in the datagram.

    Returns:
      A tuple containing the float and the new end index.

    Raises:
      ParseError if the datagram could not be parsed.
    """
    try:
        if len(dgram[start_index:]) < _FLOAT_DGRAM_LEN:
            # Noticed that Reaktor doesn't send the last bunch of \x00 needed to make
            # the float representation complete in some cases, thus we pad here to
            # account for that.
            dgram = dgram + b'\x00' * (_FLOAT_DGRAM_LEN - len(dgram[start_index:]))
        return (
            struct.unpack('>f',
                          dgram[start_index:start_index + _FLOAT_DGRAM_LEN])[0],
            start_index + _FLOAT_DGRAM_LEN)
    except (struct.error, TypeError) as e:
        raise ParseError('Could not parse datagram %s' % e)



def get_double(dgram: bytes, start_index: int) -> Tuple[float, int]:
    """Get a 64-bit big-endian IEEE 754 floating point number from the datagram.

    Args:
      dgram: A datagram packet.
      start_index: An index where the double starts in the datagram.

    Returns:
      A tuple containing the double and the new end index.

    Raises:
      ParseError if the datagram could not be parsed.
    """
    try:
        if len(dgram[start_index:]) < _DOUBLE_DGRAM_LEN:
            raise ParseError('Datagram is too short')
        return (
            struct.unpack('>d',
                          dgram[start_index:start_index + _DOUBLE_DGRAM_LEN])[0],
            start_index + _DOUBLE_DGRAM_LEN)
    except (struct.error, TypeError) as e:
        raise ParseError('Could not parse datagram {}'.format(e))


def get_blob(dgram: bytes, start_index: int) -> Tuple[bytes, int]:
    """ Get a blob from the datagram.

    According to the specifications, a blob is made of
    "an int32 size count, followed by that many 8-bit bytes of arbitrary
    binary data, followed by 0-3 additional zero bytes to make the total
    number of bits a multiple of 32".

    Args:
      dgram: A datagram packet.
      start_index: An index where the float starts in the datagram.

    Returns:
      A tuple containing the blob and the new end index.

    Raises:
      ParseError if the datagram could not be parsed.
    """
    size, int_offset = get_int(dgram, start_index)
    # Make the size a multiple of 32 bits.
    total_size = size + (-size % _BLOB_DGRAM_PAD)
    end_index = int_offset + size
    if end_index - start_index > len(dgram[start_index:]):
        raise ParseError('Datagram is too short.')
    return dgram[int_offset:int_offset + size], int_offset + total_size



def get_date(dgram: bytes, start_index: int) -> Tuple[float, int]:
    """Get a 64-bit big-endian fixed-point time tag as a date from the datagram.

    According to the specifications, a date is represented as is:
    "the first 32 bits specify the number of seconds since midnight on
    January 1, 1900, and the last 32 bits specify fractional parts of a second
    to a precision of about 200 picoseconds".

    Args:
      dgram: A datagram packet.
      start_index: An index where the date starts in the datagram.

    Returns:
      A tuple containing the system date and the new end index.
      returns osc_immediately (0) if the corresponding OSC sequence was found.

    Raises:
      ParseError if the datagram could not be parsed.
    """
    # Check for the special case first.
    if dgram[start_index:start_index + _TIMETAG_DGRAM_LEN] == ntp.IMMEDIATELY:
        return IMMEDIATELY, start_index + _TIMETAG_DGRAM_LEN
    if len(dgram[start_index:]) < _TIMETAG_DGRAM_LEN:
        raise ParseError('Datagram is too short')
    timetag, start_index = get_uint64(dgram, start_index)
    seconds = timetag * ntp._NTP_TIMESTAMP_TO_SECONDS
    return ntp.ntp_time_to_system_epoch(seconds), start_index


def get_rgba(dgram: bytes, start_index: int) -> Tuple[bytes, int]:
    """Get an rgba32 integer from the datagram.

    Args:
      dgram: A datagram packet.
      start_index: An index where the integer starts in the datagram.

    Returns:
      A tuple containing the integer and the new end index.

    Raises:
      ParseError if the datagram could not be parsed.
    """
    try:
        if len(dgram[start_index:]) < _INT_DGRAM_LEN:
            raise ParseError('Datagram is too short')
        return (
            struct.unpack('>I',
                          dgram[start_index:start_index + _INT_DGRAM_LEN])[0],
            start_index + _INT_DGRAM_LEN)
    except (struct.error, TypeError) as e:
        raise ParseError('Could not parse datagram %s' % e)


def get_midi(dgram: bytes, start_index: int) -> Tuple[Tuple[int, int, int, int], int]:
    """Get a MIDI message (port id, status byte, data1, data2) from the datagram.

    Args:
      dgram: A datagram packet.
      start_index: An index where the MIDI message starts in the datagram.

    Returns:
      A tuple containing the MIDI message and the new end index.

    Raises:
      ParseError if the datagram could not be parsed.
    """
    try:
        if len(dgram[start_index:]) < _INT_DGRAM_LEN:
            raise ParseError('Datagram is too short')
        val = struct.unpack('>I',
                            dgram[start_index:start_index + _INT_DGRAM_LEN])[0]
        midi_msg = tuple((val & 0xFF << 8 * i) >> 8 * i for i in range(3, -1, -1))
        return (midi_msg, start_index + _INT_DGRAM_LEN)
    except (struct.error, TypeError) as e:
        raise ParseError('Could not parse datagram %s' % e)

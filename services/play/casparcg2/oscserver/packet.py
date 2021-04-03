"""Use OSC packets to parse incoming UDP packets into messages or bundles.

It lets you access easily to OscMessage and OscBundle instances in the packet.
"""

import time
import collections

from typing import Union, List

from .osc_types import *
from .bundle import OSCBundle
from .message import OSCMessage


# A namedtuple as returned my the _timed_msg_of_bundle function.
# 1) the system time at which the message should be executed
#    in seconds since the epoch.
# 2) the actual message.
TimedMessage = collections.namedtuple(
    typename='TimedMessage',
    field_names=('time', 'message'))


def _timed_msg_of_bundle(bundle: OSCBundle, now: float) -> List[TimedMessage]:
    """Returns messages contained in nested bundles as a list of TimedMessage."""
    msgs = []
    for content in bundle:
        if type(content) is OSCMessage:
            if (bundle.timestamp == IMMEDIATELY or bundle.timestamp < now):
                msgs.append(TimedMessage(now, content))
            else:
                msgs.append(TimedMessage(bundle.timestamp, content))
        else:
            msgs.extend(_timed_msg_of_bundle(content, now))
    return msgs



class OSCPacket(object):
    """Unit of transmission of the OSC protocol.

    Any application that sends OSC Packets is an OSC Client.
    Any application that receives OSC Packets is an OSC Server.
    """

    def __init__(self, dgram: bytes) -> None:
        """Initialize an OdpPacket with the given UDP datagram.

        Args:
          - dgram: the raw UDP datagram holding the OSC packet.

        Raises:
          - ParseError if the datagram could not be parsed.
        """
        now = time.time()
        try:
            if OSCBundle.dgram_is_bundle(dgram):
                self._messages = sorted(
                    _timed_msg_of_bundle(OSCBundle(dgram), now),
                    key=lambda x: x.time)
            elif OSCMessage.dgram_is_message(dgram):
                self._messages = [TimedMessage(now, OscMessage(dgram))]
            else:
                raise OSCParseError(
                    'OSC Packet should at least contain an OscMessage or an OscBundle.')
        except (OSCParseError) as pe:
            raise ParseError(f'Could not parse packet {pe}')

    @property
    def messages(self) -> List[TimedMessage]:
        """Returns asc-time-sorted TimedMessages of the messages in this packet."""
        return self._messages

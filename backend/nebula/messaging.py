import json
import socket
import time
from typing import Any

from nx.redis import redis

from nebula.config import config
from nebula.context import current_initiator


async def msg(topic: str, **data: Any) -> None:
    data.setdefault("initiator", current_initiator())
    await redis.publish(
        json.dumps(
            [
                time.time(),
                config.site_name,
                socket.gethostname(),
                topic,
                data,
            ]
        )
    )

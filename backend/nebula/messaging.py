import json
import socket
import time
from typing import Any

from nebula.config import config
from nebula.redis import Redis


async def msg(topic: str, **data: Any) -> None:
    await Redis.publish(
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

import json
import socket
import time
from typing import Any

from nx.db import db
from nx.redis import redis

from nebula.config import config
from nebula.context import current_initiator


async def msg(topic: str, **data: Any) -> None:
    """Publish a message to the site's channel (and so to websocket clients).

    Inside a transaction the message is sent after it commits, and not at
    all when it rolls back: clients react to a message by reading the data,
    which isn't there before the commit. Outside a transaction it is sent
    at once.
    """
    data.setdefault("initiator", current_initiator())
    payload = json.dumps(
        [
            time.time(),
            config.site_name,
            socket.gethostname(),
            topic,
            data,
        ]
    )
    await db.on_commit(lambda: redis.publish(payload))

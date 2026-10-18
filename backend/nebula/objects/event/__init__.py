from nx.db import db

from nebula.objects.base import BaseObject


class Event(BaseObject):
    object_type: str = "event"
    db_columns: list[str] = [
        "id_channel",
        "start",
        "stop",
        "id_magic",
    ]

    defaults = {
        "start": 0,
        "stop": 0,
        "id_magic": None,
    }

    async def delete_children(self) -> None:
        # Delete the event's bin. Its items are removed by ON DELETE CASCADE,
        # aired items (referenced from asrun) make this fail on purpose.
        if id_bin := self["id_magic"]:
            await db.execute("DELETE FROM bins WHERE id = $1", id_bin)

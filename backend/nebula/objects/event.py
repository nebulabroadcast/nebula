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
        assert self.connection is not None
        assert hasattr(self.connection, "execute")
        assert self.id
        await self.connection.execute("DELETE FROM bins WHERE id_magic = $1", self.id)

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

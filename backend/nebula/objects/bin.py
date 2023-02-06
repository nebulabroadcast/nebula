from nebula.objects.base import BaseObject


class Bin(BaseObject):
    object_type: str = "bin"
    db_columns: list[str] = [
        "bin_type",
    ]

    defaults = {
        "bin_type": 0,
    }

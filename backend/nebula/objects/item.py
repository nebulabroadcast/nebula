from nebula.objects.base import BaseObject


class Item(BaseObject):
    object_type: str = "item"
    db_columns: list[str] = [
        "id_asset",
        "id_bin",
        "position",
    ]

    defaults = {
        "position": 0,
        "id_asset": None,  # TODO: In V6, should be None, Make sure to update the DB
    }

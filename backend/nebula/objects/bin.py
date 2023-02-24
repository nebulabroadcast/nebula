from nebula.db import db
from nebula.objects.base import BaseObject
from nebula.objects.item import Item
from nebula.objects.asset import Asset


class Bin(BaseObject):
    object_type: str = "bin"
    db_columns: list[str] = [
        "bin_type",
    ]

    defaults = {
        "bin_type": 0,
    }

    _items: list[Item] | None = None

    async def get_items(self) -> list[Item]:
        if self._items is None:
            self._items = []
            res = await db.fetch(
                """
                SELECT i.meta as imeta, a.meta as ameta
                FROM items i LEFT JOIN assets a
                ON i.id_asset = a.id
                WHERE i.id_bin = $1 ORDER BY i.position ASC
                """,
                self.id,
            )
            for row in res:
                item = Item.from_meta(row["imeta"])
                if row["ameta"]:
                    asset = Asset.from_meta(row["ameta"])
                    item.asset = asset
                self._items.append(item)
        return self._items

    @property
    def items(self) -> list[Item]:
        assert self._items is not None, "Items not loaded"
        return self._items

    @property
    def duration(self) -> float:
        if "duration" in self.meta:
            return self.meta["duration"]
        assert self._items is not None, "Items not loaded"
        duration = 0
        for item in self._items:
            duration += item.duration
        self["duration"] = duration
        return duration

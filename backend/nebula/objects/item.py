from typing import Any

from nebula.objects.asset import Asset
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
        "id_asset": None,
    }

    _asset: Asset | None = None

    def __getitem__(self, key: str) -> Any:
        # item has its own value
        if key in self.meta:
            return super().__getitem__(key)
        if self._asset and (key not in ["mark_in", "mark_out"]):
            # we have asset loaded, so return its value
            return self._asset[key]
        # we don't have asset loaded, so return default value
        # TODO: consider raising an exception here
        return super().__getitem__(key)

    async def get_asset(self) -> Asset | None:
        if not self["id_asset"]:
            return None
        if self._asset is None:
            self._asset = await Asset.load(self["id_asset"])
        return self._asset

    @property
    def asset(self) -> Asset | None:
        if not self["id_asset"]:
            return None
        assert self._asset is not None, "Asset not loaded"
        return self._asset

    @asset.setter
    def asset(self, asset: Asset) -> None:
        assert isinstance(asset, Asset), "Asset must be an instance of Asset"
        if self["id_asset"] is None:
            self["id_asset"] = asset.id
        assert (
            asset.id == self["id_asset"]
        ), f"Asset id must match item id_asset: {asset.id} != {self['id_asset']}"
        self._asset = asset

        # BIG NO-NO - if needed, do that manually!!!
        # if not self.meta.get("mark_in") and self._asset["mark_in"]:
        #     self["mark_in"] = self._asset["mark_in"]
        # if not self.meta.get("mark_out") and self._asset["mark_out"]:
        #     self["mark_out"] = self._asset["mark_out"]

    @property
    def duration(self) -> float:
        if not self["id_asset"]:
            return self["duration"]

        if self.meta.get("mark_out"):
            return (self.meta.get("mark_out") or 0) - (self.meta.get("mark_in") or 0)

        # Item does not have explicit duration so we use raw asset duration instead
        # do not use marked (asset.duration) duration here.
        # marks from items must be used

        assert self._asset is not None, "Asset not loaded"
        return self._asset["duration"]

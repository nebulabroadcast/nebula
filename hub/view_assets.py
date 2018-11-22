import math

from nebula import *
from cherryadmin import CherryAdminView


class ViewAssets(CherryAdminView):
    def build(self, *args, **kwargs):
        self["name"] = "assets"
        self["title"] = "Assets"
        self["js"] = ["/static/js/assets.js"]

        #
        # Query params
        #

        query = kwargs.get("q", "")

        try:
            id_view = int(kwargs["v"])
            view = config["views"][id_view]
        except (KeyError, ValueError):
            id_view = min(config["views"])
            view = config["views"][id_view]

        try:
            current_page = int(kwargs["p"])
        except (KeyError, ValueError, TypeError):
            current_page = 1

        if kwargs.get("lv", False) != kwargs.get("v", False) or kwargs.get("lq", False) != kwargs.get("q", False):
            current_page = 1

        #
        # Build view
        #

        records_per_page = 100

        assets = api_get(
                user = self["user"],
                id_view = id_view,
                fulltext=query or False,
                count=True,
                order="ctime DESC",
                limit=records_per_page,
                offset=(current_page - 1)*records_per_page
            )

        page_count = int(math.ceil(assets["count"] / records_per_page)) + 1

        if current_page > page_count:
            current_page = 1

        self["id_view"] = id_view
        self["query"] = query
        self["current_page"] = current_page
        self["page_count"] = page_count
        self["columns"] = view["columns"]
        self["assets"] = [Asset(meta=meta) for meta in assets["data"]]

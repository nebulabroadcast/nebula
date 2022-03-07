import copy

from cherryadmin import CherryAdminView

from nx.api import api_get
from nx.core.common import config
from nx.objects import Asset


RECORDS_PER_PAGE = 100


class ViewAssets(CherryAdminView):
    def build(self, *args, **kwargs):

        # Query params

        query = kwargs.get("q", "")
        order_key = kwargs.get("o", "id")
        order_trend = kwargs.get("ot", "desc")
        if order_trend != "asc":
            order_trend = "desc"

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

        # Build view

        assets = api_get(
            user=self["user"],
            id_view=id_view,
            fulltext=query or False,
            count=False,
            order="{} {}".format(order_key, order_trend),
            limit=RECORDS_PER_PAGE + 1,
            offset=(current_page - 1) * RECORDS_PER_PAGE,
        )

        if len(assets["data"]) > RECORDS_PER_PAGE:
            page_count = current_page + 1
        elif len(assets["data"]) == 0:
            page_count = max(1, current_page - 1)
        else:
            page_count = current_page

        if current_page > page_count:
            current_page = page_count

        def get_params(**override):
            data = copy.copy(kwargs)
            for key in override:
                if not override[key] and key in data:
                    del data[key]
                else:
                    data[key] = override[key]
            return "&".join(["{}={}".format(k, data[k]) for k in data])

        self["show_jobs"] = config.get("hub_browser_jobs_column", True)
        self["name"] = "assets"
        self["title"] = config["views"][id_view]["title"]
        self["js"] = ["/static/js/assets.js"]
        self["id_view"] = id_view
        self["query"] = query
        self["current_page"] = current_page
        self["page_count"] = page_count
        self["columns"] = view["columns"]
        self["assets"] = [Asset(meta=meta) for meta in assets["data"]]
        self["order_key"] = order_key
        self["order_trend"] = order_trend
        self["get_params"] = get_params
        self["view_list"] = sorted(
            list(config["views"].keys()), key=lambda x: config["views"][x]["position"]
        )

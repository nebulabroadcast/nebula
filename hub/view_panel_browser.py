import math

from nebula import *
from cherryadmin import CherryAdminView

from .tool_paginate import *


class ViewPanelBrowser(CherryAdminView):
    def build(self, *args, **kwargs):
        self["name"] = "browser"

        records_per_page = 500

        # args

        try:
            id_view = int(kwargs.get("v"))
            if not id_view in config["views"].keys():
                raise KeyError
        except (KeyError, ValueError, TypeError):
            id_view = min(config["views"].keys())

        try:
            current_page = int(kwargs["p"])
        except (KeyError, ValueError, TypeError):
            current_page = 1

        search_query = kwargs.get("q", "")
        order = "id DESC"
        print(kwargs)

        if kwargs.get("o", "") and kwargs["o"] in meta_types:
            order = "meta->'{}'".format(kwargs["o"])
            if kwargs.get("u", ""):
                order += " DESC"

        # View settings

        view_config = config["views"][id_view]
        columns = view_config["columns"]

        #
        # get data
        #

        assets = api_get(
                user = self["user"],
                id_view = id_view,
                fulltext=search_query or False,
                count=True,
                order=order,
                limit=records_per_page,
                offset=(current_page - 1)*records_per_page
            )

        #
        # page context
        #

        # helper for pagination
        fargs = []
        if id_view != 1:
            fargs.append("v="+str(id_view))
        if search_query:
            fargs.append("q="+search_query)
        self["filter_args"] = "?" + "&amp;".join(fargs) if fargs else ""

        page_count = int(math.ceil(assets["count"] / records_per_page))

        self["current_page"] = current_page
        self["page_count"] = page_count
        self["pagination"] = make_pagination(current_page, page_count)

        # the rest
        self["id_view"] = id_view
        self["search_query"] = search_query

        self["columns"] = columns
        self["assets"] = [Asset(meta=meta) for meta in assets["data"]]

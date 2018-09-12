from nebula import *
from cherryadmin import CherryAdminView


class ViewMAM(CherryAdminView):
    def build(self, *args, **kwargs):
        self["name"] = "mam"
        self["title"] = "MAM"
        self["js"] = [
                "/static/js/mam.js"
            ]


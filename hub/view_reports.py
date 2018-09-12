from nebula import *
from cherryadmin import CherryAdminView


class ViewReports(CherryAdminView):
    def build(self, *args, **kwargs):
        self["name"] = "reports"
        self["title"] = "Reports"
        self["js"] = [
                "/static/js/reports.js"
            ]


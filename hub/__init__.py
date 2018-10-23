from cherryadmin import CherryAdmin

from nebula import *

from .view_dashboard import ViewDashboard
from .view_mam import ViewMAM
from .view_jobs import ViewJobs
from .view_reports import ViewReports

from .view_panel_browser import ViewPanelBrowser
from .view_panel_detail import ViewPanelDetail

from .view_system import *


logging.user = "hub"


__all__ = [
        "CherryAdmin",
        "hub_config",
    ]


def login_helper(login, password):
    user = get_user(login, password)
    if not user:
        return False
    return user.meta


class SiteContext(object):
    context = {
            "name" : config["site_name"],
            "js" : [
                    "/static/js/vendor.min.js",
                    "/static/js/main.js"
                ],
            "css" : ["/static/css/main.css"],
            "system_pages" : [
                    ["system_services", "Services"],
                    ["system_views", "Views"],
                    ["system_actions", "Actions"],
                    ["system_folders", "Folders"],
                    ["system_channels", "Channels"],
                    ["system_storages", "Storages"],
                    ["system_settings", "Settings"],
                    ["system_users", "Users"],
                ],
            "meta_types" : meta_types,
        }

    def __getitem__(self, key):
        if key in self.context:
            return self.context[key]
        return config[key]


def site_context_helper():
    return SiteContext()


def page_context_helper():
    return {}


hub_config = {
        "host" : config.get("hub_host", "0.0.0.0"),
        "port" : config.get("hub_port", 8080),
        "static_dir" : config.get("hub_static_dir", "/opt/nebula-frontend/dist/static"),
        "templates_dir" : config.get("hub_templates_dir", "/opt/nebula-frontend/dist/templates"),
        "login_helper" : login_helper,
        "site_context_helper" : site_context_helper,
        "page_context_helper" : page_context_helper,
        "sessions_dir" : os.path.join("/tmp", config["site_name"] + "-sessions"),
        "blocking" : True,
        "views" : {
                "index" : ViewDashboard,
                "mam" : ViewMAM,
                "jobs" : ViewJobs,
                "reports" : ViewReports,
                "panel_browser" : ViewPanelBrowser,
                "panel_detail" : ViewPanelDetail,
                "system_settings" : ViewSystemSettings,
                "system_storages" : ViewSystemStorages,
                "system_folders" : ViewSystemFolders,
                "system_views" : ViewSystemViews,
                "system_channels" : ViewSystemChannels,
                "system_actions" : ViewSystemActions,
                "system_users" : ViewSystemUsers,
                "system_services" : ViewSystemServices,
            },

        "api_methods" : {
                "get" : api_get,
                "set" : api_set,
                "delete" : api_delete,
                "settings" : api_settings,
                "rundown" : api_rundown,
                "order" : api_order,
                "schedule" : api_schedule,
                "jobs" : api_jobs,
                "playout" : api_playout,
                "actions" : api_actions,
                "send" : api_send,
                "solve" : api_solve,
                "system" : api_system,
            }
    }


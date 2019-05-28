__all__ = [
        "CherryAdmin",
        "hub_config",
    ]

from nebula import *

logging.user = "hub"

from cherryadmin import CherryAdmin

from .webtools import webtools
from .view_dashboard import ViewDashboard
from .view_assets import ViewAssets
from .view_detail import ViewDetail
from .view_jobs import ViewJobs
from .view_tool import ViewTool
from .view_services import ViewServices
from .view_passreset import ViewPassReset
from .view_profile import ViewProfile



SITE_CSS = [
        "https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css",

        "https://cdnjs.cloudflare.com/ajax/libs/gijgo/1.9.13/combined/css/gijgo.min.css",
        "https://use.fontawesome.com/releases/v5.8.1/css/solid.css",
        "https://use.fontawesome.com/releases/v5.8.1/css/regular.css",
        "https://use.fontawesome.com/releases/v5.8.1/css/fontawesome.css",
        "https://fonts.googleapis.com/css?family=Roboto:400,500,700&amp;subset=latin-ext",

        "/static/css/switch.css",
        "/static/css/style.css",
    ]

SITE_JS = [
        "https://code.jquery.com/jquery-3.3.1.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js",
        "https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/gijgo/1.9.13/combined/js/gijgo.min.js",

        "/static/js/jquery.inputmask.js",
        "/static/js/common.js",
    ]



def login_helper(login, password):
    user = get_user(login, password)
    if not user:
        return False
    return user.meta


class SiteContext(object):
    context = {
        "name" : config["site_name"],
        "meta_types" : meta_types,
        "webtools" : webtools,
        "css" : SITE_CSS,
        "js" : SITE_JS
    }

    def __getitem__(self, key):
        if key in self.context:
            return self.context[key]
        return config[key]


def site_context_helper():
    return SiteContext()

def page_context_helper():
    return {}

def user_context_helper(meta):
    return User(meta=meta or {})


static_dir = config.get(
        "hub_static_dir",
        os.path.join(config["nebula_root"], "hub", "static")
    )
templates_dir = config.get(
        "hub_templates_dir",
        os.path.join(config["nebula_root"], "hub", "templates")
    )

hub_config = {
        "host" : config.get("hub_host", "0.0.0.0"),
        "port" : config.get("hub_port", 8080),
        "static_dir" : static_dir,
        "templates_dir" : templates_dir,
        "login_helper" : login_helper,
        "site_context_helper" : site_context_helper,
        "page_context_helper" : page_context_helper,
        "user_context_helper" : user_context_helper,
        "sessions_dir" : os.path.join("/tmp", config["site_name"] + "-sessions"),
        "sessions_timeout" : 60*24*120,
        "blocking" : True,
        "minify_html" : True,
        "log_screen" : False,
        "views" : {
                "index"    : ViewDashboard,
                "assets"   : ViewAssets,
                "detail"   : ViewDetail,
                "jobs"     : ViewJobs,
                "tool"     : ViewTool,
                "services" : ViewServices,
                "passreset" : ViewPassReset,
                "profile"   : ViewProfile,
            },

        "api_methods" : {
                "get"      : api_get,
                "set"      : api_set,
                "delete"   : api_delete,
                "settings" : api_settings,
                "rundown"  : api_rundown,
                "order"    : api_order,
                "schedule" : api_schedule,
                "jobs"     : api_jobs,
                "playout"  : api_playout,
                "actions"  : api_actions,
                "send"     : api_send,
                "solve"    : api_solve,
                "system"   : api_system,
            }
    }

__all__ = [
        "CherryAdmin",
        "hub_config",
    ]

from nebula import *

logging.user = "hub"

from cherryadmin import CherryAdmin

from .webtools import webtools
from .apimethods import api_methods
from .view_dashboard import ViewDashboard
from .view_assets import ViewAssets
from .view_detail import ViewDetail
from .view_jobs import ViewJobs
from .view_tool import ViewTool
from .view_services import ViewServices
from .view_passreset import ViewPassReset
from .view_profile import ViewProfile



SITE_CSS = [
        "https://static.nebulabroadcast.com/nebula/css/nebula.css",
    ]

SITE_JS = [
        "https://static.nebulabroadcast.com/nebula/js/vendor/jquery.min.js",
        "https://static.nebulabroadcast.com/nebula/js/vendor/popper.min.js",
        "https://static.nebulabroadcast.com/nebula/js/vendor/bootstrap.min.js",
        "https://static.nebulabroadcast.com/nebula/js/vendor/bootstrap-select.min.js",
        "https://static.nebulabroadcast.com/nebula/js/vendor/gijgo.min.js",
        "https://static.nebulabroadcast.com/nebula/js/vendor/inputmask.min.js",
        "/static/js/common.js"
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
        "language" : config.get("language", "en"),
        "webtools" : webtools,
        "css" : config.get("hub_css", SITE_CSS),
        "js" : config.get("hub_js", SITE_JS)
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

        "api_methods" : api_methods
    }

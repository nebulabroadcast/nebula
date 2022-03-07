__all__ = ["CherryAdmin", "hub_config"]

import os

from nxtools import logging
from cherryadmin import CherryAdmin

from nx.core.common import config
from nx.core.metadata import meta_types
from nx.helpers import get_user
from nx.objects import User

from hub.webtools import webtools
from hub.apimethods import api_methods
from hub.view_dashboard import ViewDashboard
from hub.view_assets import ViewAssets
from hub.view_detail import ViewDetail
from hub.view_jobs import ViewJobs
from hub.view_metrics import ViewMetrics
from hub.view_tool import ViewTool
from hub.view_services import ViewServices
from hub.view_settings import ViewSettings
from hub.view_passreset import ViewPassReset
from hub.view_profile import ViewProfile


logging.user = "hub"
config["mc_thread_safe"] = True


SITE_CSS = [
    "/static/css/nebula.css",
    "/static/css/gijgo-core.css",
    "/static/css/gijgo-datepicker.css",
]


SITE_JS = [
    "/static/js/vendor/jquery.min.js",
    "/static/js/vendor/bootstrap.bundle.min.js",
    "/static/js/vendor/bootstrap-select.min.js",
    "/static/js/vendor/gijgo-core.js",
    "/static/js/vendor/gijgo-datepicker.js",
    "/static/js/vendor/jquery.inputmask.min.js",
    "/static/js/common.js",
]


def login_helper(login, password):
    user = get_user(login, password)
    if not user:
        return False
    meta = user.meta
    if "password" in meta:
        del meta["password"]
    return meta


class SiteContext(object):
    context = {
        "name": config["site_name"],
        "meta_types": meta_types,
        "language": config.get("language", "en"),
        "webtools": webtools,
        "css": config.get("hub_css", SITE_CSS),
        "js": config.get("hub_js", SITE_JS),
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
    os.path.join(config["nebula_root"], "hub", "static"),
)


templates_dir = config.get(
    "hub_templates_dir",
    os.path.join(config["nebula_root"], "hub", "templates"),
)


default_sessions_dir = os.path.join("/tmp", config["site_name"] + "-sessions")


hub_config = {
    "host": config.get("hub_host", "0.0.0.0"),
    "port": config.get("hub_port", 8080),
    "static_dir": static_dir,
    "templates_dir": templates_dir,
    "login_helper": login_helper,
    "site_context_helper": site_context_helper,
    "page_context_helper": page_context_helper,
    "user_context_helper": user_context_helper,
    "sessions_dir": config.get("hub_sessions_dir", default_sessions_dir),
    "sessions_timeout": 60 * 24 * 120,
    "hash_salt": config.get("hash_salt", "nebulaissalty"),
    "blocking": True,
    "minify_html": True,
    "log_screen": False,
    "views": {
        "index": ViewDashboard,
        "assets": ViewAssets,
        "detail": ViewDetail,
        "jobs": ViewJobs,
        "metrics": ViewMetrics,
        "tool": ViewTool,
        "services": ViewServices,
        "settings": ViewSettings,
        "passreset": ViewPassReset,
        "profile": ViewProfile,
    },
    "api_methods": api_methods,
}

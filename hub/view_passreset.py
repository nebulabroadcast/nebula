import re
import time

from nxtools import EMAIL_REGEXP, GUID_REGEXP, log_traceback, get_guid
from cherryadmin import CherryAdminView

from nx.db import DB
from nx.core.common import config
from nx.objects import User
from nx.helpers import send_mail


MAIL_BODY = """

Dear {name},

You received this email because your Nebula password has been reset.
To change your password, please go to:

{hub_url}/passreset?token={token}

Thank you for using Nebula, and if you have any questions,
please contact your system administrator.

Sincerely,

The Nebula Broadcast Team

"""


class ViewPassReset(CherryAdminView):
    def auth(self):
        return True

    def build(self, *args, **kwargs):
        self["name"] = "passreset"
        self["title"] = "Password reset"
        self["mode"] = "email-entry"

        #
        # REQUEST EMAIL
        #

        if "email" in kwargs:
            email = kwargs["email"].strip()

            if not re.match(EMAIL_REGEXP, email):
                self.context.message("Invalid e-mail address specified", "error")
                return

            db = DB()
            db.query(
                """
                SELECT meta
                FROM users where LOWER(meta->>'email') = LOWER(%s)
                """,
                [email],
            )
            try:
                user = User(meta=db.fetchall()[0][0], db=db)
            except IndexError:
                self.context.message("No such user", "error")
                return

            if time.time() - user.meta.get("pass_reset_time", 0) < 3600:
                self.context.message(
                    "Only one password reset request per hour is allowed", "error"
                )
                return

            token = get_guid()

            user["pass_reset_time"] = time.time()
            user["pass_reset_code"] = token

            mailvars = {
                "name": user["full_name"] or user["login"],
                "site_name": config["site_name"],
                "hub_url": config.get(
                    "hub_url", f"https://{config['site_name']}.nbla.cloud"
                ),
                "token": token,
            }

            body = MAIL_BODY.format(**mailvars)

            try:
                send_mail(email, "Nebula password reset", body)
            except Exception:
                log_traceback()
                self.context.message(
                    """Unable to send password reset email.
                Please contact your system administrator""",
                    "error",
                )
                return

            user.save()

            self["mode"] = "mail-sent"
            return

        #
        # GOT TOKEN
        #

        elif "token" in kwargs:
            token = kwargs["token"].strip()
            self["mode"] = False
            self["token"] = token

            if not re.match(GUID_REGEXP, token):
                self.context.message("Invalid token specified", "error")
                return

            db = DB()
            db.query(
                "SELECT meta FROM users WHERE meta->>'pass_reset_code' = %s", [token]
            )
            try:
                user = User(meta=db.fetchall()[0][0], db=db)
            except IndexError:
                self.context.message("No such token", "error")
                return

            if user["pass_reset_time"] < time.time() - 3600:
                self.context.message("Token expired.", "error")
                self["mode"] = "email-entry"
                return

            pass1 = kwargs.get("pass1", False)
            pass2 = kwargs.get("pass2", False)
            if pass1 and pass2:
                if pass1 != pass2:
                    self["mode"] = "pass-entry"
                    self.context.message("Passwords don't match", "error")
                    return

                if len(pass1) < 8:
                    self["mode"] = "pass-entry"
                    self.context.message(
                        "The password is weak. Must be at least 8 characters", "error"
                    )
                    return

                user.set_password(pass1)
                del user.meta["pass_reset_code"]
                del user.meta["pass_reset_time"]
                user.save()

                self["mode"] = "finished"
                return

            self["mode"] = "pass-entry"
            return

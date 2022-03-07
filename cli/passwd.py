import sys
from nxtools import logging, critical_error
from nx.db import DB
from nx.objects import User


def passwd(*args):
    print()
    try:
        login = input("Login: ").strip()
        password = input("Password (will be echoed): ").strip()
        is_admin = input("Admin (yes/no): ").strip()
    except KeyboardInterrupt:
        print()
        logging.warning("Interrupted by user")
        sys.exit(0)

    db = DB()
    db.query("SELECT id FROM users WHERE login=%s", [login])
    res = db.fetchall()
    if not res:
        critical_error("Unable to set password: no such user")

    u = User(res[0][0], db=db)
    if login:
        u["login"] = u["full_name"] = login
    u["is_admin"] = 1 if is_admin == "yes" else 0
    u.set_password(password)
    u.save()
    print()
    logging.goodnews("Password changed")

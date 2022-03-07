import sys

from nxtools import logging
from nx.objects import User


def adduser(*args):
    print()
    try:
        login = input("Login: ").strip()
        password = input("Password (will be echoed): ").strip()
        is_admin = input("Admin (yes/no): ").strip()
        full_name = input(f"Full name (default: {login}): ").strip() or login
        email = input("Email: ").strip()
    except KeyboardInterrupt:
        print()
        logging.warning("Interrupted by user")
        sys.exit(0)
    user = User()
    user["login"] = login
    user["full_name"] = full_name
    user["email"] = email
    user["is_admin"] = 1 if is_admin == "yes" else 0
    user.set_password(password)
    user.save()
    print()
    logging.goodnews("User created")

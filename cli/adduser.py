from .common import *

def adduser(*args):
    print ()
    try:
        login = input("Login: ").strip()
        password = input("Password: ").strip()
        full_name = input("Full name (default: {}): ".format(login)).strip() or login
        email = input("Email: ").strip()
        is_admin = input("Admin (yes/no): ").strip()
    except KeyboardInterrupt:
        print ()
        logging.warning("Interrupted by user")
        sys.exit(0)
    u = User()
    u["login"] = login
    u["full_name"] = full_name
    u["email"] = email
    u["is_admin"] = 1 if is_admin == "yes" else 0
    u.set_password(password)
    u.save()
    print ()
    logging.goodnews("User created")

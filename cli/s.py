from .common import *

def format_state(state):
    return {
            STOPPED  : colored.format(31, "STOPPED"),
            STARTED  : colored.format(32, "STARTED"),
            STARTING : colored.format(33, "STARTING"),
            STOPPING : colored.format(33, "STOPPING"),
            KILL     : colored.format(33, "KILL"),
        }[state]

def show_services(db):
    db.query("SELECT id, service_type, host, title, autostart, state, last_seen FROM services ORDER BY id")
    print()
    print("ID  Type        Title               Host           Auto  State")
    print()
    for id, stype, host, title, auto, state, last_seen in db.fetchall():
        last_seen_age = time.time() - last_seen
        data = {
                "id" : id,
                "type" : stype,
                "host" : host,
                "title" : title,
                "auto" : "AUTO" if auto else "",
                "state" : format_state(state),
                "warning": "NOT RESPONDING FOR {}".format(s2words(last_seen_age)) if last_seen_age > 60 else ""
            }
        print ("{id:<4}{type:<12}{title:<20}{host:<15}{auto:<6}{state} {warning}".format(**data))


def s(*args):
    print
    db = DB()

    if len(args) >= 2:
        try:
            services = tuple([int(i.strip()) for i in args[1:]])
        except ValueError:
            critical_error("Wrong service ID")

        if args[0] == "start":
            db.query("UPDATE services SET state=2 WHERE id IN %s AND state=0", [services])
            db.commit()
        elif args[0] == "stop":
            db.query("UPDATE services SET state=3 WHERE id IN %s AND state=1", [services])
            db.commit()
        elif args[0] == "kill":
            db.query("UPDATE services SET state=4 WHERE id IN %s AND state IN (1,3)", [services])
            db.commit()
        elif args[0] == "auto":
            db.query("UPDATE services SET autostart=TRUE WHERE id IN %s", [services])
            db.commit()
        elif args[0] == "noauto":
            db.query("UPDATE services SET autostart=FALSE WHERE id IN %s", [services])
            db.commit()
        else:
            critical_error("Unsupported command: {}".format(args[0]))
        time.sleep(1)

    show_services(db)

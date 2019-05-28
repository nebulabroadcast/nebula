from .common import *

def run(*args):
    id_service = args[0]

    if id_service == "hub":
        import hub
        try:
            hub_instance = hub.CherryAdmin(**hub.hub_config)
        except Exception:
            log_traceback()
            critical_error("Unhandled exception in Hub")
        return

    try:
        id_service = int(id_service)
    except ValueError:
        critical_error("Service ID must be integer")

    db = DB()
    db.query("SELECT service_type, title, host, loop_delay, settings FROM services WHERE id=%s", [id_service])
    try:
        agent, title, host, loop_delay, settings = db.fetchall()[0]
    except IndexError:
        critical_error("Unable to start service {}. No such service".format(id_service))

    config["user"] = logging.user = title

    if host != config["host"]:
        critical_error("This service should not run here.")

    if settings:
        try:
            settings = xml(settings)
        except Exception:
            log_traceback()
            logging.error("Malformed settings XML:\n", settings)
            db.query("UPDATE services SET autostart=0 WHERE id=%s", [id_service])
            db.commit()
            critical_error("Unable to start service")

    _module = __import__("services." + agent, globals(), locals(), ["Service"])
    Service = _module.Service
    service = Service(id_service, settings)

    while True:
        try:
            service.on_main()
            last_run = time.time()
            while True:
                time.sleep(min(loop_delay, 2))
                service.heartbeat()
                if time.time() - last_run >= loop_delay:
                    break
        except (KeyboardInterrupt):
            logging.warning("Keyboard interrupt")
            break
        except (SystemExit):
            break
        except:
            log_traceback()
            time.sleep(2)
            sys.exit(1)

        try:
            if sys.argv[1] == "once":
                break
        except IndexError:
            pass


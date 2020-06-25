import time
import socket
import requests

try:
    import thread
except ImportError:
    import _thread as thread

from nebula import *

logging.handlers = []


def log_clean_up(log_dir, ttl=30):
    ttl_sec = ttl * 3600 * 24
    for f in get_files(log_dir, exts=["txt"]):
        if f.mtime < time.time() - ttl_sec:
            try:
                os.remove(f.path)
            except Exception:
                log_traceback("Unable to remove old log file")
            else:
                logging.debug("Removed old log file {}".format(f.base_name))


def format_log_message(message):
    try:
        log = "{}\t{}\t{}@{}\t{}\n".format(
                time.strftime("%H:%M:%S"),
                {
                    0 : "DEBUG    ",
                    1 : "INFO     ",
                    2 : "WARNING  ",
                    3 : "ERROR    ",
                    4 : "GOOD NEWS"
                }[message.data["message_type"]],
                message.data["user"],
                message.host,
                message.data["message"]
            )
    except Exception:
        log_traceback()
        return None
    return log


class SeismicMessage():
    def __init__(self, packet):
        self.timestamp, self.site_name, self.host, self.method, self.data = packet

    @property
    def json(self):
        return json.dumps([
                self.timestamp,
                self.site_name,
                self.host,
                self.method,
                self.data
            ])


class Service(BaseService):
    def on_init(self):
        self.site_name = config["site_name"]
        self.queue = []
        self.last_message = 0


        #
        # Message relays
        #

        self.relays = []
        for relay in self.settings.findall("relay"):
            if relay is None or not relay.text:
                continue
            url = relay.text.rstrip("/")
            logging.info("Adding message relay: {}".format(url))
            url += "/msg_publish?id=" + config["site_name"]
            self.relays.append(url)

        #
        # Logging
        #

        log_dir = self.settings.find("log_dir")
        if log_dir is None or not log_dir.text:
            self.log_dir = None
        else:
            self.log_dir = log_dir.text
            if not os.path.exists(self.log_dir):
                try:
                    os.makedirs(self.log_dir)
                except Exception:
                    log_traceback()
                    self.log_dir = None
            if not os.path.isdir(self.log_dir):
                logging.error("{} is not a directory. Logs will not be saved".format(log_dir))
                self.log_dir = None

        log_ttl = self.settings.find("log_ttl")
        if log_ttl is None or not log_ttl.text:
            self.log_ttl = None
        else:
            try:
                self.log_ttl = int(log_ttl.text)
            except ValueError:
                log_traceback()
                self.log_ttl = None

        self.session = requests.Session()

        thread.start_new_thread(self.listen, ())
        thread.start_new_thread(self.process, ())


    def shutdown(self, *args, **kwargs):
        self.session.close()
        super().shutdown(*args, **kwargs)

    def on_main(self):
        if len(self.queue) > 100:
            logging.warning("Truncating message queue")
            self.queue = self.queue[80:]

        if self.log_dir and self.log_ttl:
           log_clean_up(self.log_dir, self.log_ttl)


    def listen(self):
        self.sock = socket.socket(
                socket.AF_INET,
                socket.SOCK_DGRAM,
                socket.IPPROTO_UDP
            )
        self.sock.setsockopt(
                socket.SOL_SOCKET,
                socket.SO_REUSEADDR,
                1
            )

        try:
            firstoctet = int(config["seismic_addr"].split(".")[0])
            is_multicast = firstoctet >= 224
        except ValueError:
            is_multicast = False


        if is_multicast:
            logging.info("Starting multicast listener {}:{}".format(config["seismic_addr"], config["seismic_port"]))
            self.sock.bind(("0.0.0.0", int(config["seismic_port"])))
            self.sock.setsockopt(
                    socket.IPPROTO_IP,
                    socket.IP_MULTICAST_TTL,
                    255
                )
            self.sock.setsockopt(
                    socket.IPPROTO_IP,
                    socket.IP_ADD_MEMBERSHIP,
                    socket.inet_aton(config["seismic_addr"]) + socket.inet_aton("0.0.0.0")
                )
        else:
            logging.info("Starting unicast listener {}:{}".format(config["seismic_addr"], config["seismic_port"]))
            self.sock.bind((config["seismic_addr"], int(config["seismic_port"])))

        self.sock.settimeout(1)

        while True:
            try:
                data, addr = self.sock.recvfrom(4092)
            except (socket.error):
                continue

            try:
                message = SeismicMessage(json.loads(decode_if_py3(data)))
            except Exception:
                logging.warning("Malformed seismic message detected", handlers=False)
                print("\n")
                print(data)
                print("\n")
                continue

            if message.site_name != config["site_name"]:
                continue
            self.queue.append(message)


    def process(self):
        while True:
            if not self.queue:
                time.sleep(.01)
                if time.time() - self.last_message > 3:
                    logging.debug("Heartbeat")
                    messaging.send("heartbeat")
                    self.last_message = time.time()
                continue

            message = self.queue.pop(0)
            self.last_message = time.time()

            if message.method != "log":
                self.relay_message(message.json)

            elif self.log_dir:
                log = format_log_message(message)
                if not log:
                    continue

                log_path = os.path.join(self.log_dir, time.strftime("%Y-%m-%d.txt"))
                with open(log_path, "a") as f:
                    f.write(log)


    def relay_message(self, message):
        message = message.replace("\n", "") + "\n" # one message per line
        for relay in self.relays:
            try:
                result = self.session.post(relay, message.encode("ascii"), timeout=.5)
            except:
                logging.error("Unable to send message to relay", relay)
                continue
            if result.status_code >= 400:
                logging.warning("Error {}: Unable to relay message to {}".format(result.status_code, relay))
                continue

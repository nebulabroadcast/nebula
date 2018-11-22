import time
import socket
import requests

try:
    import thread
except ImportError:
    import _thread as thread

from nebula import *

logging.handlers = []

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
        self.sock.settimeout(1)

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


        thread.start_new_thread(self.listen, ())
        thread.start_new_thread(self.process, ())


    def on_main(self):
        if len(self.queue) > 100:
            logging.warning("Truncating message queue")
            self.queue = self.queue[80:]


    def listen(self):
        while True:
            try:
                data, addr = self.sock.recvfrom(4092)
            except (socket.error):
                continue

            try:
                message = SeismicMessage(json.loads(decode_if_py3(data)))
            except Exception:
                log_traceback(handlers=False)
                logging.warning("Malformed seismic message detected", handlers=False)
                print (message)
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
                continue

            message = self.queue.pop(0)
            self.last_message = time.time()

            if message.method != "log":
                self.relay_message(message.json)

            if self.log_dir and message.method == "log":
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
                result = requests.post(relay, message.encode("ascii"), timeout=.5)
            except:
                logging.error("Unable to send message to relay", relay)
                continue
            if result.status_code != 200:
                logging.warning("Error {}: Unable to relay message to {}".format(result.status_code, relay))

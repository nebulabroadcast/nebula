import time
import socket
import threading
import requests

from nebula import *

from .loki import LokiLogger
from .log import log_clean_up, format_log_message


logging.handlers = []


class Message():
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
            logging.info(f"Adding message relay: {url}")
            url += "/msg_publish?id=" + config["site_name"]
            self.relays.append(url)

        self.session = requests.Session()

        #
        # Logging
        #

        # Loki

        self.loki = None
        for loki in self.settings.findall("loki"):
            port = int(loki.attrib.get("port", 3100))
            self.loki = LokiLogger(loki.text, port)
            break

        # Log to file

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
                logging.error(f"{log_dir} is not a directory. Logs will not be saved")
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

        #
        # Listener
        #

        if config.get("messaging") == "rabbitmq":
            listener = self.listen_rabbit
        else:
            listener = self.listen_udp


        listen_thread = threading.Thread(target=listener, daemon=True)
        listen_thread.start()

        process_thread = threading.Thread(target=self.process, daemon=True)
        process_thread.start()


    def shutdown(self, *args, **kwargs):
        self.session.close()
        super().shutdown(*args, **kwargs)

    def on_main(self):
        if len(self.queue) > 50:
            logging.warning(f"Truncating message queue ({len(self.queue)} messages)", handlers=[])
            self.queue = []

        if self.log_dir and self.log_ttl:
           log_clean_up(self.log_dir, self.log_ttl)


    def handle_data(self, data):
        try:
            message = Message(json.loads(decode_if_py3(data)))
        except Exception:
            logging.warning("Malformed message detected", handlers=False)
            print("\n")
            print(data)
            print("\n")
            return
        if message.site_name != config["site_name"]:
            return
        self.queue.append(message)


    def listen_rabbit(self):
        try:
            import pika
        except ModuleNotFoundError:
            critical_error("'pika' module is not installed")

        host = config.get("rabbitmq_host", "rabbitmq")
        conparams = pika.ConnectionParameters(host=host)

        while True:
            try:
                connection = pika.BlockingConnection(conparams)
                channel = connection.channel()

                result = channel.queue_declare(
                    queue=config["site_name"],
                    arguments={'x-message-ttl' : 1000}
                )
                queue_name = result.method.queue

                logging.info("Listening on", queue_name)

                channel.basic_consume(
                    queue=queue_name,
                    on_message_callback=lambda ch, method, properties, body: self.handle_data(body),
                    auto_ack=True
                )

                channel.start_consuming()
            except pika.exceptions.AMQPConnectionError:
                logging.error("RabbitMQ connection error", handlers=[])
            except Exception:
                log_traceback()
            time.sleep(2)


    def listen_udp(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

        addr = config.get("seismic_addr", "224.168.1.1")
        port = config.get("seismic_port", 42005)

        try:
            firstoctet = int(addr.split(".")[0])
            is_multicast = firstoctet >= 224
        except ValueError:
            is_multicast = False

        if is_multicast:
            logging.info(f"Starting multicast listener {addr}:{port}")
            self.sock.bind(("0.0.0.0", int(port)))
            self.sock.setsockopt(
                    socket.IPPROTO_IP,
                    socket.IP_MULTICAST_TTL,
                    255
                )
            self.sock.setsockopt(
                    socket.IPPROTO_IP,
                    socket.IP_ADD_MEMBERSHIP,
                    socket.inet_aton(addr) + socket.inet_aton("0.0.0.0")
                )
        else:
            logging.info(f"Starting unicast listener {addr}:{port}")
            self.sock.bind((addr, int(port)))

        self.sock.settimeout(1)

        while True:
            try:
                data, _ = self.sock.recvfrom(4092)
            except (socket.error):
                continue
            self.handle_data(data)


    def process(self):
        while True:
            try:
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
                    self.relay_message(message)

                else:
                    if self.log_dir:
                        log = format_log_message(message)
                        if not log:
                            continue

                        log_path = os.path.join(self.log_dir, time.strftime("%Y-%m-%d.txt"))
                        with open(log_path, "a") as f:
                            f.write(log)

                    if self.loki:
                        self.loki(message)
            except Exception:
                log_traceback("Unhandled exception occured during message processing")



    def relay_message(self, message):
        mjson = message.json.replace("\n", "") + "\n" # one message per line
        for relay in self.relays:
            try:
                result = self.session.post(relay, mjson.encode("ascii"), timeout=.3)
            except:
                logging.error(f"Exception: Unable to relay message to {relay}", handlers=[])
                continue
            if result.status_code >= 400:
                logging.warning(f"Error {result.status_code}: Unable to relay message to {relay}", handlers=[])
                continue

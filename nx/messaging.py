__all__ = ["messaging"]

import time
import json
import socket
import queue
import threading

try:
    import pika
    has_pika = True
except ModuleNotFoundError:
    has_pika = False

from nxtools import logging, log_traceback, critical_error
from nebulacore import config


class RabbitSender():
    def __init__(self):
        self.connection = None
        self.channel = None
        self.queue = queue.Queue()
        self.lock = threading.Lock()
        if not has_pika:
            critical_error("'pika' module is not installed")

    def connect(self):
        host = config.get("rabbitmq_host", "rabbitmq")
        conparams = pika.ConnectionParameters(host=host)
        try:
            self.connection = pika.BlockingConnection(conparams)
        except Exception:
            self.connection = None
            logging.error(f"Unable to connect RabbitMQ broker at {host}", handlers=[])
            return

        self.channel = self.connection.channel()
        self.channel.queue_declare(
            queue=config["site_name"],
            arguments={'x-message-ttl' : 1000}
        )
        return True

    def __call__(self, method, **data):
        self.queue.put([method, data])
        self.lock.acquire()
        while not self.queue.empty():
            qm, qd = self.queue.get()
            self.send_message(qm, **qd)
        self.lock.release()



    def send_message(self, method, **data):
        if not (self.connection and self.channel):
            if not self.connect():
                time.sleep(1)
                return

        message = json.dumps([
            time.time(),
            config["site_name"],
            config["host"],
            method,
            data
        ])

        try:
            self.channel.basic_publish(
                exchange='',
                routing_key=config["site_name"],
                body=message
            )
        except pika.exceptions.ChannelWrongStateError:
            logging.warning("RabbitMQ: nobody's listening", handlers=[])
            return
        except pika.exceptions.StreamLostError:
            logging.error("RabbitMQ connection lost", handlers=[])
            self.connection = self.channel = None
        except:
            log_traceback("RabbitMQ error", handlers=[])
            logging.debug("Unable to send message" , message, handlers=[])
            self.connection = self.channel = None

    def __del__(self):
        if self.connection:
            self.connection.close()


class UDPSender():
    def __init__(self):
        self.addr = config.get("seismic_addr", "224.168.1.1")
        self.port = int(config.get("seismic_port", 42005))
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        self.sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 255)

    def __call__(self, method, **data):
        self.sock.sendto(
            bytes(
                json.dumps([
                    time.time(),
                    config["site_name"],
                    config["host"],
                    method,
                    data
                ]),
                "utf-8"
            ),
            (self.addr, self.port)
        )

    def __del__(self):
        self.sock.close()


class Messaging():
    def __init__(self):
        self.sender = None

    def configure(self):
        if config.get("messaging") == "rabbitmq":
            self.sender = RabbitSender()
        else:
            self.sender = UDPSender()

    def send(self, method, **data):
        if not self.sender:
            return
        try:
            self.sender(method, **data)
        except Exception:
            log_traceback(handlers=False)


messaging = Messaging()

import json
import requests


class LokiLogger():
    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.url = f"http://{host}:{port}/loki/api/v1/push"
        self.session = requests.Session()

    def __call__(self, message):
        tstamp = int(message.timestamp * 1000000000)
        tags = {
            "user" : message.data["user"],
            "site_name" : message.site_name,
            "level" : {
                0 : "debug",
                1 : "info",
                2 : "warning",
                3 : "error",
                4 : "info"
            }[message.data["message_type"]],
        }
        data = {
            "streams" : [{
                "stream" : tags,
                "values" : [[f"{tstamp}", message.data["message"]]]
            }]
        }
        try:
            response = self.session.post(
                self.url,
                data=json.dumps(data),
                headers={"Content-Type" : "application/json"},
                timeout=.2
            )
        except Exception:
            logging.error("Unable to send log message to Loki")


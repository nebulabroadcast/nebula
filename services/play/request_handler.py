__all__ = ["PlayoutRequestHandler", "HTTPServer"]

import json
import urllib.parse

from http.server import BaseHTTPRequestHandler, HTTPServer
from nxtools import logging, log_traceback

from nx.core.common import NebulaResponse


class PlayoutRequestHandler(BaseHTTPRequestHandler):
    def log_request(self, code="-", size="-"):
        pass

    def _do_headers(self, mime="application/json", response=200, headers=[]):
        self.send_response(response)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        for h in headers:
            self.send_header(h[0], h[1])
        self.send_header("Content-type", mime)
        self.end_headers()

    def _echo(self, istring):
        self.wfile.write(bytes(istring, "utf-8"))

    def result(self, data):
        self._do_headers()
        self._echo(json.dumps(data))

    def error(self, response, message=""):
        self._do_headers()  # return 200 anyway
        self._echo(json.dumps({"response": response, "message": message}))

    def do_GET(self):
        pass

    def do_POST(self):
        ctype = self.headers.get("content-type")
        if ctype != "application/x-www-form-urlencoded":
            self.error(400, "Play service received a bad request.")
            return

        length = int(self.headers.get("content-length"))
        postvars = urllib.parse.parse_qs(self.rfile.read(length), keep_blank_values=1)

        method = self.path.lstrip("/").split("/")[0]
        params = {}
        for key in postvars:
            params[key.decode("utf-8")] = postvars[key][0].decode("utf-8")

        if method not in self.server.methods:
            self.error(501)
            return

        try:
            result = self.server.methods[method](**params)
            if result.is_error:
                logging.error(result.message)
            elif result["message"]:
                logging.info(result.message)
            self.result(result.dict)
        except Exception:
            msg = log_traceback()
            self.result(NebulaResponse(500, msg).dict)

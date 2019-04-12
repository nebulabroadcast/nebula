__all__ = ["PlayoutRequestHandler", "HTTPServer"]

import sys
import cgi
import json

try:
    from http.server import BaseHTTPRequestHandler, HTTPServer
except ImportError:
    from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer

from nebula import *


class PlayoutRequestHandler(BaseHTTPRequestHandler):
    def log_request(self, code='-', size='-'):
        pass

    def _do_headers(self,mime="application/json",response=200,headers=[]):
        self.send_response(response)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        for h in headers:
            handler.send_header(h[0],h[1])
        self.send_header('Content-type', mime)
        self.end_headers()

    def _echo(self, istring):
        self.wfile.write(encode_if_py3(istring))

    def result(self, data):
        self._do_headers()
        self._echo(json.dumps(data))

    def error(self, response, message=""):
        self._do_headers() # return 200 anyway
        self._echo(json.dumps({
                "response" : response,
                "message" : message
            }))

    def do_GET(self):
        pass

    def do_POST(self):
        service = self.server.service
        ctype, pdict = cgi.parse_header(self.headers.get('content-type'))

        if ctype == 'multipart/form-data':
            postvars = cgi.parse_multipart(self.rfile, pdict)
        elif ctype == 'application/x-www-form-urlencoded':
            length = int(self.headers.get('content-length'))
            postvars = cgi.parse_qs(self.rfile.read(length), keep_blank_values=1)
        else:
            logging.debug("No post data")
            self.error(400)
            return


        method = self.path.lstrip("/").split("/")[0]
        params = {}
        for key in postvars:
            params[decode_if_py3(key)] = decode_if_py3(postvars[key][0])

        if not method in self.server.methods:
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

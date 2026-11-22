#!/usr/bin/env python3
"""Static preview server for dist/, on 0.0.0.0, that is never cached.

The site is buildless and its asset names carry no version, so a browser that
has cached app.js / motion-studio.js keeps serving the old copy after a change
— which is how a feature that had just been removed still looked present.
Every response therefore asks for revalidation, and documents are no-store.

    python3 .tooling/serve.py [port]      # default 4321
"""
import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4321
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dist"))


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".webp": "image/webp",
        ".json": "application/json",
        ".mjs": "text/javascript",
        ".otf": "font/otf",
        ".woff2": "font/woff2",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with Server(("0.0.0.0", PORT), Handler) as httpd:
        print(f"serving {ROOT} on http://0.0.0.0:{PORT} (no-store)", flush=True)
        httpd.serve_forever()

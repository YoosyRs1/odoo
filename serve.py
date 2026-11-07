#!/usr/bin/env python3
"""Servidor estático mínimo para Auralia (la página de música).

Sirve music-player/ en el puerto $PORT, escuchando en 0.0.0.0 y con cabeceras
de seguridad básicas. No necesita dependencias externas.
"""
import os
import posixpath
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(BASE_DIR, "music-player")
PORT = int(os.environ.get("PORT", "3000"))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def translate_path(self, path):
        # Normaliza y confina todas las rutas dentro de ROOT (sin escapes con ..).
        path = urlparse(path).path
        path = posixpath.normpath(unquote(path))
        parts = [part for part in path.split("/") if part and part not in (".", "..")]
        return os.path.join(ROOT, *parts)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header(
            "Cache-Control",
            "no-cache" if self.path.endswith((".html", "/")) else "public, max-age=3600",
        )
        super().end_headers()

    def log_message(self, fmt, *args):  # registros concisos en stdout
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)


def main():
    with ThreadingHTTPServer(("0.0.0.0", PORT), Handler) as httpd:
        print("Auralia escuchando en http://0.0.0.0:%d" % PORT, flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Serve a built site locally while preserving its custom 404 response."""

import argparse
import functools
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class SiteRequestHandler(SimpleHTTPRequestHandler):
    """Static-file handler that serves the built 404 page with status 404."""

    def __init__(self, *args, error_document, **kwargs):
        self.error_document = Path(error_document)
        super().__init__(*args, **kwargs)

    def send_error(self, code, message=None, explain=None):
        if code != HTTPStatus.NOT_FOUND:
            return super().send_error(code, message, explain)

        try:
            body = self.error_document.read_bytes()
        except OSError:
            return super().send_error(code, message, explain)

        self.send_response(HTTPStatus.NOT_FOUND)
        self.send_header("Content-Type", self.guess_type(str(self.error_document)))
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)


def validate_site(site):
    site_root = Path(site).resolve()
    if not site_root.is_dir():
        raise ValueError(f"Site directory does not exist: {site_root}")

    error_document = site_root / "404.html"
    if not error_document.is_file():
        raise ValueError(f"Custom 404.html is missing: {error_document}")
    try:
        with error_document.open("rb"):
            pass
    except OSError as error:
        raise ValueError(f"Custom 404.html is not readable: {error_document}") from error

    return site_root, error_document


def create_server(site, bind="127.0.0.1", port=0):
    """Create a local preview server without starting its request loop."""
    if bind != "127.0.0.1":
        raise ValueError("Preview server must bind to 127.0.0.1")
    if not 0 <= port <= 65535:
        raise ValueError("Port must be between 0 and 65535")

    site_root, error_document = validate_site(site)
    handler = functools.partial(
        SiteRequestHandler,
        directory=str(site_root),
        error_document=error_document,
    )
    return ThreadingHTTPServer((bind, port), handler)


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Serve a built Jekyll site with its custom 404 semantics.",
    )
    parser.add_argument("--site", required=True, help="Built site directory")
    parser.add_argument(
        "--bind",
        default="127.0.0.1",
        choices=("127.0.0.1",),
        help="Loopback address (default: 127.0.0.1)",
    )
    parser.add_argument("--port", type=int, default=0, help="TCP port (default: 0)")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    try:
        server = create_server(site=args.site, bind=args.bind, port=args.port)
    except ValueError as error:
        raise SystemExit(str(error)) from error

    host, port = server.server_address
    print(f"Serving {Path(args.site).resolve()} at http://{host}:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

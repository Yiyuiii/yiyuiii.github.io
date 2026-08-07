#!/usr/bin/env python3
"""Serve a built site locally while preserving its custom 404 response."""

import argparse
import functools
import os
import sys
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


EXPECTED_CLIENT_DISCONNECTS = (
    BrokenPipeError,
    ConnectionAbortedError,
    ConnectionResetError,
)


class SiteThreadingHTTPServer(ThreadingHTTPServer):
    """Preview server that can silence expected browser disconnects."""

    # Chromium opens many short-lived connections when Playwright files run in
    # parallel. The stdlib default backlog of five can refuse bursts even
    # though request handling itself is threaded.
    request_queue_size = 128

    def __init__(self, *args, quiet=False, **kwargs):
        self.quiet = quiet
        super().__init__(*args, **kwargs)

    def handle_error(self, request, client_address):
        error_type = sys.exc_info()[0]
        if (
            self.quiet
            and error_type
            and issubclass(error_type, EXPECTED_CLIENT_DISCONNECTS)
        ):
            return
        super().handle_error(request, client_address)


class SiteRequestHandler(SimpleHTTPRequestHandler):
    """Static-file handler that serves the built 404 page with status 404."""

    def __init__(self, *args, error_document, quiet=False, **kwargs):
        self.error_document = Path(error_document)
        self.quiet = quiet
        super().__init__(*args, **kwargs)

    def log_message(self, format, *args):
        if not self.quiet:
            super().log_message(format, *args)

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
    if not error_document.exists():
        raise ValueError(f"Custom 404.html is missing: {error_document}")
    if not error_document.is_file():
        raise ValueError(
            f"Custom 404.html must be a readable regular file: {error_document}"
        )
    try:
        with error_document.open("rb"):
            pass
    except OSError as error:
        raise ValueError(
            f"Custom 404.html must be a readable regular file: {error_document}"
        ) from error

    return site_root, error_document


def create_server(site, bind="127.0.0.1", port=0, quiet=False):
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
        quiet=quiet,
    )
    return SiteThreadingHTTPServer((bind, port), handler, quiet=quiet)


def port_number(value):
    try:
        port = int(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("port must be an integer") from error
    if not 0 <= port <= 65535:
        raise argparse.ArgumentTypeError("port must be between 0 and 65535")
    return port


def resolve_site(site=None, environ=None):
    environment = os.environ if environ is None else environ
    candidate = site or environment.get("SITE_PREVIEW_ROOT")
    if not candidate:
        raise ValueError("Provide --site or set SITE_PREVIEW_ROOT")
    return Path(candidate).resolve()


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Serve a built Jekyll site with its custom 404 semantics.",
    )
    parser.add_argument(
        "--site",
        help="Built site directory (defaults to SITE_PREVIEW_ROOT)",
    )
    parser.add_argument(
        "--bind",
        default="127.0.0.1",
        choices=("127.0.0.1",),
        help="Loopback address (default: 127.0.0.1)",
    )
    parser.add_argument(
        "--port",
        type=port_number,
        default=0,
        help="TCP port from 0 to 65535 (default: 0)",
    )
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    try:
        site = resolve_site(args.site)
        server = create_server(site=site, bind=args.bind, port=args.port)
    except ValueError as error:
        raise SystemExit(str(error)) from error

    host, port = server.server_address
    print(f"Serving {site} at http://{host}:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

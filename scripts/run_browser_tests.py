#!/usr/bin/env python3
"""Run the browser regression against one freshly built local site."""

import argparse
import os
import shutil
import subprocess
import sys
import threading
from pathlib import Path

try:
    from .serve_site import create_server
except ImportError:  # pragma: no cover - direct script execution
    from serve_site import create_server


def resolve_npm(which=shutil.which):
    executable = which("npm")
    if not executable:
        raise ValueError("npm is required to run the browser regression")
    return executable


def browser_command(npm, browser_args=()):
    command = [npm, "run", "test:browser"]
    if browser_args:
        command.extend(["--", *browser_args])
    return command


def run_browser_tests(
    site,
    repo_root,
    browser_args=(),
    environ=None,
    runner=subprocess.run,
    which=shutil.which,
):
    repo = Path(repo_root).resolve()
    if not repo.is_dir():
        raise ValueError(f"Repository root does not exist: {repo}")

    site_path = Path(site)
    if not site_path.is_absolute():
        site_path = repo / site_path

    npm = resolve_npm(which=which)
    server = create_server(site=site_path, bind="127.0.0.1", port=0, quiet=True)
    thread = threading.Thread(
        target=server.serve_forever,
        name="site-browser-preview",
    )
    thread.start()
    host, port = server.server_address
    child_environment = dict(os.environ if environ is None else environ)
    child_environment["SITE_URL"] = f"http://{host}:{port}"
    command = browser_command(npm, browser_args)

    print(
        f"Running browser regression against {child_environment['SITE_URL']}",
        flush=True,
    )
    try:
        completed = runner(
            command,
            cwd=repo,
            env=child_environment,
            check=False,
        )
        return completed.returncode
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)
        if thread.is_alive():
            raise RuntimeError("Local browser preview server did not stop")


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Serve a built site and run its Playwright regression.",
    )
    parser.add_argument(
        "--site",
        default="_site",
        help="Built site directory (default: _site)",
    )
    parser.add_argument(
        "--repo-root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Repository containing package.json",
    )
    parser.add_argument(
        "browser_args",
        nargs=argparse.REMAINDER,
        help="Optional arguments passed to Playwright after --",
    )
    args = parser.parse_args(argv)
    if args.browser_args[:1] == ["--"]:
        args.browser_args = args.browser_args[1:]
    return args


def main(argv=None):
    args = parse_args(argv)
    try:
        return run_browser_tests(
            site=args.site,
            repo_root=args.repo_root,
            browser_args=args.browser_args,
        )
    except ValueError as error:
        print(error, file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

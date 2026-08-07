#!/usr/bin/env python3
"""Serve a production build and run the explicit toy experience audit."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import threading
from pathlib import Path

try:
    from .serve_site import create_server
except ImportError:  # pragma: no cover - direct script execution
    from serve_site import create_server


def run_audit(site: Path, output: Path, *, runner=subprocess.run) -> int:
    repo = Path(__file__).resolve().parents[1]
    resolved_output = output.resolve()
    if resolved_output == repo or repo in resolved_output.parents:
        raise ValueError("toy audit output must stay outside the repository")
    node = shutil.which("node")
    if not node:
        raise ValueError("node is required to run the toy experience audit")
    server = create_server(site=site, bind="127.0.0.1", port=0, quiet=True)
    thread = threading.Thread(target=server.serve_forever, name="toy-audit-preview")
    thread.start()
    host, port = server.server_address
    command = [
        node,
        str(repo / "tests" / "tools" / "audit-toy-experience.mjs"),
        "--base-url",
        f"http://{host}:{port}",
        "--out-dir",
        str(resolved_output),
    ]
    try:
        completed = runner(command, cwd=repo, check=False)
        return completed.returncode
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=10)
        if thread.is_alive():
            raise RuntimeError("Toy audit preview server did not stop")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", default="_site", type=Path)
    parser.add_argument(
        "--output",
        required=True,
        type=Path,
        help="repository-external directory for JSON, screenshots, and review HTML",
    )
    args = parser.parse_args(argv)
    try:
        return run_audit(args.site.resolve(), args.output)
    except ValueError as error:
        print(error)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

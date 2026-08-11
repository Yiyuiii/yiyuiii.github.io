#!/usr/bin/env python3
"""Download the verified GitHub preview artifact and serve it on loopback."""

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = "deploy.yml"
PREVIEW_BRANCH = "preview/review"
ARTIFACT = "site-preview"
SERVE_SCRIPT = ROOT / "scripts" / "serve_site.py"
RUN_DISCOVERY_TIMEOUT = 120
RUN_DISCOVERY_INTERVAL = 3


class NoPreviewRun(RuntimeError):
    """Raised while GitHub has not registered a preview push yet."""


def run_command(command, *, capture_output=False):
    try:
        return subprocess.run(
            command,
            cwd=ROOT,
            check=True,
            text=True,
            capture_output=capture_output,
        )
    except FileNotFoundError as error:
        raise RuntimeError(f"Required command is unavailable: {command[0]}") from error
    except subprocess.CalledProcessError as error:
        detail = (error.stderr or error.stdout or "").strip()
        message = f"Command failed: {' '.join(command)}"
        if detail:
            message = f"{message}\n{detail}"
        raise RuntimeError(message) from error


def remote_preview_sha():
    result = run_command(
        [
            "git",
            "ls-remote",
            "--exit-code",
            "origin",
            f"refs/heads/{PREVIEW_BRANCH}",
        ],
        capture_output=True,
    )
    fields = result.stdout.split()
    if not fields:
        raise RuntimeError(f"Remote branch origin/{PREVIEW_BRANCH} does not exist")
    return fields[0].lower()


def parse_latest_run(payload):
    try:
        runs = json.loads(payload)
    except json.JSONDecodeError as error:
        raise RuntimeError("GitHub CLI returned invalid workflow metadata") from error
    if not isinstance(runs, list) or not runs:
        raise NoPreviewRun(
            f"No push workflow run exists for origin/{PREVIEW_BRANCH}; push a candidate first"
        )

    run = runs[0]
    required = {"databaseId", "headSha", "status", "conclusion", "url"}
    if not isinstance(run, dict) or not required.issubset(run):
        raise RuntimeError("GitHub CLI returned incomplete workflow metadata")
    return run


def latest_preview_run():
    result = run_command(
        [
            "gh",
            "run",
            "list",
            "--workflow",
            WORKFLOW,
            "--branch",
            PREVIEW_BRANCH,
            "--event",
            "push",
            "--limit",
            "1",
            "--json",
            "databaseId,headSha,status,conclusion,url",
        ],
        capture_output=True,
    )
    return parse_latest_run(result.stdout)


def assert_current_run(run, remote_sha):
    run_sha = str(run["headSha"]).lower()
    if run_sha != remote_sha:
        raise RuntimeError(
            "The latest workflow run does not verify the current preview branch: "
            f"run={run_sha}, origin/{PREVIEW_BRANCH}={remote_sha}"
        )


def wait_for_current_run(remote_sha):
    deadline = time.monotonic() + RUN_DISCOVERY_TIMEOUT
    announced = False
    while True:
        try:
            run = latest_preview_run()
        except NoPreviewRun:
            run = None

        if run and str(run["headSha"]).lower() == remote_sha:
            return run

        if time.monotonic() >= deadline:
            found = str(run["headSha"]).lower() if run else "none"
            raise RuntimeError(
                "GitHub Actions did not create a run for the current preview branch "
                f"within {RUN_DISCOVERY_TIMEOUT} seconds: run={found}, "
                f"origin/{PREVIEW_BRANCH}={remote_sha}"
            )
        if not announced:
            print("Waiting for GitHub Actions to register the preview push...", flush=True)
            announced = True
        time.sleep(RUN_DISCOVERY_INTERVAL)


def preview_run(run_id):
    result = run_command(
        [
            "gh",
            "run",
            "view",
            str(run_id),
            "--json",
            "databaseId,headSha,status,conclusion,url",
        ],
        capture_output=True,
    )
    try:
        run = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError("GitHub CLI returned invalid workflow metadata") from error
    required = {"databaseId", "headSha", "status", "conclusion", "url"}
    if not isinstance(run, dict) or not required.issubset(run):
        raise RuntimeError("GitHub CLI returned incomplete workflow metadata")
    return run


def wait_for_success(run):
    if run["status"] != "completed":
        print(f"Waiting for GitHub Actions: {run['url']}", flush=True)
        run_command(
            ["gh", "run", "watch", str(run["databaseId"]), "--exit-status"]
        )
        run = preview_run(run["databaseId"])

    if run["status"] != "completed" or run["conclusion"] != "success":
        raise RuntimeError(
            f"GitHub Actions did not succeed ({run['status']}/{run['conclusion']}): "
            f"{run['url']}"
        )
    return run


def locate_preview_root(download_root, expected_sha):
    markers = list(Path(download_root).rglob("preview-source-sha.txt"))
    if len(markers) != 1:
        raise RuntimeError(
            "The preview artifact must contain exactly one preview-source-sha.txt"
        )

    marker = markers[0]
    actual_sha = marker.read_text(encoding="utf-8").strip().lower()
    if actual_sha != expected_sha.lower():
        raise RuntimeError(
            f"Preview artifact source mismatch: artifact={actual_sha}, expected={expected_sha}"
        )

    site_root = marker.parent
    for required in ("index.html", "404.html"):
        if not (site_root / required).is_file():
            raise RuntimeError(f"Preview artifact is missing {required}")
    return site_root


def port_number(value):
    try:
        port = int(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("port must be an integer") from error
    if not 0 <= port <= 65535:
        raise argparse.ArgumentTypeError("port must be between 0 and 65535")
    return port


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description=(
            "Wait for the current GitHub preview run, download its verified artifact, "
            "and serve it only on 127.0.0.1."
        )
    )
    parser.add_argument(
        "--port",
        type=port_number,
        default=9241,
        help="loopback port from 0 to 65535 (default: 9241; use 0 for a random port)",
    )
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    if shutil.which("gh") is None:
        raise SystemExit("GitHub CLI (gh) is required")

    try:
        remote_sha = remote_preview_sha()
        run = wait_for_current_run(remote_sha)
        run = wait_for_success(run)
        current_remote_sha = remote_preview_sha()
        assert_current_run(run, current_remote_sha)

        with tempfile.TemporaryDirectory(prefix="yiyuiii-site-preview-") as directory:
            print(f"Downloading verified artifact from {run['url']}", flush=True)
            run_command(
                [
                    "gh",
                    "run",
                    "download",
                    str(run["databaseId"]),
                    "--name",
                    ARTIFACT,
                    "--dir",
                    directory,
                ]
            )
            current_remote_sha = remote_preview_sha()
            assert_current_run(run, current_remote_sha)
            site_root = locate_preview_root(directory, current_remote_sha)
            print(f"Verified preview source: {current_remote_sha}", flush=True)
            run_command(
                [
                    sys.executable,
                    str(SERVE_SCRIPT),
                    "--site",
                    str(site_root),
                    "--port",
                    str(args.port),
                ]
            )
    except RuntimeError as error:
        raise SystemExit(str(error)) from error


if __name__ == "__main__":
    main()

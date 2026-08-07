#!/usr/bin/env python3
"""Run the repository's production validation gates through one entrypoint."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Mapping, Sequence


ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class ValidationStep:
    label: str
    command: tuple[str, ...]
    environment: Mapping[str, str] = field(default_factory=dict)


def build_steps(
    *,
    python: str,
    npm: str,
    bundle: str,
    include_browser: bool,
    skip_project_sync: bool,
    browser_args: Sequence[str] = (),
) -> list[ValidationStep]:
    """Return the ordered validation plan without executing it."""

    steps = [
        ValidationStep("Python source and data tests", (python, "-m", "pytest", "-q")),
        ValidationStep("JavaScript logic tests", (npm, "run", "test:unit")),
    ]
    if not skip_project_sync:
        steps.append(
            ValidationStep(
                "Public repository verification",
                (python, "scripts/sync_projects.py"),
            )
        )
    steps.extend(
        [
            ValidationStep(
                "Bilingual content verification",
                (python, "scripts/translation_guard.py", "--check", "--production"),
            ),
            ValidationStep(
                "Committed thumbnail verification",
                (python, "scripts/generate_post_thumbnails.py", "--check"),
            ),
            ValidationStep(
                "Article image derivative verification",
                (python, "scripts/generate_article_images.py", "--check"),
            ),
            ValidationStep(
                "Production Jekyll build",
                (bundle, "exec", "jekyll", "build", "--trace"),
                {"JEKYLL_ENV": "production"},
            ),
            ValidationStep(
                "Built-site contracts",
                (python, "scripts/check_site.py", "--site", "_site"),
            ),
            ValidationStep(
                "Legacy URL contracts",
                (python, "scripts/check_legacy_urls.py", "--site", "_site"),
            ),
        ]
    )
    if include_browser:
        browser_command = [
            python,
            "scripts/run_browser_tests.py",
            "--site",
            "_site",
        ]
        if browser_args:
            browser_command.extend(("--", *browser_args))
        steps.append(ValidationStep("Browser regression", tuple(browser_command)))
    return steps


def run_validation(
    steps: Sequence[ValidationStep],
    *,
    repo_root: Path | str = ROOT,
    environ: Mapping[str, str] | None = None,
    runner=subprocess.run,
) -> int:
    """Run each step in order and return the first failing exit code."""

    repo = Path(repo_root).resolve()
    if not repo.is_dir():
        raise ValueError(f"Repository root does not exist: {repo}")

    base_environment = dict(os.environ if environ is None else environ)
    for index, step in enumerate(steps, start=1):
        child_environment = dict(base_environment)
        child_environment.update(step.environment)
        print(f"[{index}/{len(steps)}] {step.label}", flush=True)
        completed = runner(
            step.command,
            cwd=repo,
            env=child_environment,
            check=False,
        )
        if completed.returncode:
            print(
                f"Validation stopped: {step.label} exited with "
                f"{completed.returncode}.",
                file=sys.stderr,
            )
            return completed.returncode
    print(f"Validation passed ({len(steps)} steps).", flush=True)
    return 0


def resolve_executable(name: str, *, which=shutil.which) -> str:
    executable = which(name)
    if not executable:
        raise ValueError(f"{name} is required to run repository validation")
    return executable


def parse_args(argv: Sequence[str] | None = None):
    parser = argparse.ArgumentParser(
        description="Run source, content, production-build, and optional browser checks.",
    )
    parser.add_argument(
        "--browser",
        action="store_true",
        help="also run the complete Playwright regression against the fresh build",
    )
    parser.add_argument(
        "--skip-project-sync",
        action="store_true",
        help="skip the live GitHub repository check for an offline local run",
    )
    parser.add_argument(
        "browser_args",
        nargs=argparse.REMAINDER,
        help="optional Playwright arguments after -- (requires --browser)",
    )
    args = parser.parse_args(argv)
    if args.browser_args[:1] == ["--"]:
        args.browser_args = args.browser_args[1:]
    if args.browser_args and not args.browser:
        parser.error("browser arguments require --browser")
    return args


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        steps = build_steps(
            python=sys.executable,
            npm=resolve_executable("npm"),
            bundle=resolve_executable("bundle"),
            include_browser=args.browser,
            skip_project_sync=args.skip_project_sync,
            browser_args=args.browser_args,
        )
        return run_validation(steps)
    except ValueError as error:
        print(error, file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

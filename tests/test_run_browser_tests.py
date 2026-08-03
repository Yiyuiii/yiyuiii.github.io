from pathlib import Path
from types import SimpleNamespace

import pytest

from scripts.run_browser_tests import (
    browser_command,
    parse_args,
    resolve_npm,
    run_browser_tests,
)


def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def make_site(tmp_path):
    site = tmp_path / "site"
    write(site / "index.html", "<h1>Home</h1>")
    write(site / "404.html", "<h1>Not found</h1>")
    return site


def test_browser_command_forwards_optional_playwright_arguments():
    assert browser_command("npm", ()) == ["npm", "run", "test:browser"]
    assert browser_command("npm", ("tests/browser/site.spec.mjs",)) == [
        "npm",
        "run",
        "test:browser",
        "--",
        "tests/browser/site.spec.mjs",
    ]


def test_resolve_npm_rejects_a_missing_runtime():
    with pytest.raises(ValueError, match="npm is required"):
        resolve_npm(which=lambda name: None)


def test_runner_uses_an_ephemeral_loopback_url_without_mutating_parent_env(tmp_path):
    site = make_site(tmp_path)
    repo = tmp_path / "repo"
    repo.mkdir()
    observed = {}
    parent_environment = {"EXISTING": "kept", "SITE_URL": "https://parent.invalid"}

    def fake_runner(command, cwd, env, check):
        observed.update(command=command, cwd=cwd, env=env, check=check)
        return SimpleNamespace(returncode=7)

    result = run_browser_tests(
        site=site,
        repo_root=repo,
        browser_args=("tests/browser/site.spec.mjs",),
        environ=parent_environment,
        runner=fake_runner,
        which=lambda name: "npm.cmd",
    )

    assert result == 7
    assert observed["command"][-1] == "tests/browser/site.spec.mjs"
    assert observed["cwd"] == Path(repo).resolve()
    assert observed["check"] is False
    assert observed["env"]["EXISTING"] == "kept"
    assert observed["env"]["SITE_URL"].startswith("http://127.0.0.1:")
    assert parent_environment["SITE_URL"] == "https://parent.invalid"


def test_relative_site_is_resolved_from_repo_root(tmp_path, monkeypatch):
    repo = tmp_path / "repo"
    repo.mkdir()
    make_site(repo)
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    monkeypatch.chdir(elsewhere)

    result = run_browser_tests(
        site="site",
        repo_root=repo,
        runner=lambda *args, **kwargs: SimpleNamespace(returncode=0),
        which=lambda name: "npm.cmd",
    )

    assert result == 0


def test_parse_args_strips_the_separator_before_browser_arguments():
    args = parse_args(
        [
            "--site",
            "built",
            "--repo-root",
            "repo",
            "--",
            "tests/browser/site.spec.mjs",
        ]
    )

    assert args.site == "built"
    assert args.repo_root == "repo"
    assert args.browser_args == ["tests/browser/site.spec.mjs"]

from pathlib import Path

import pytest

from scripts import github_preview
from scripts.github_preview import (
    assert_current_run,
    locate_preview_root,
    parse_latest_run,
)


def test_parse_latest_run_requires_a_push_run():
    with pytest.raises(RuntimeError, match="No push workflow run"):
        parse_latest_run("[]")


def test_current_run_must_match_the_remote_preview_head():
    run = {
        "databaseId": 42,
        "headSha": "a" * 40,
        "status": "completed",
        "conclusion": "success",
        "url": "https://example.invalid/run/42",
    }

    assert_current_run(run, "a" * 40)
    with pytest.raises(RuntimeError, match="does not verify the current preview branch"):
        assert_current_run(run, "b" * 40)


def test_wait_for_current_run_skips_an_older_registered_run(monkeypatch):
    old_run = {
        "databaseId": 41,
        "headSha": "a" * 40,
        "status": "completed",
        "conclusion": "success",
        "url": "https://example.invalid/run/41",
    }
    current_run = {**old_run, "databaseId": 42, "headSha": "b" * 40}
    runs = iter((old_run, current_run))

    monkeypatch.setattr(github_preview, "latest_preview_run", lambda: next(runs))
    monkeypatch.setattr(github_preview.time, "sleep", lambda _seconds: None)

    assert github_preview.wait_for_current_run("b" * 40) == current_run


def test_preview_root_requires_matching_source_and_site_files(tmp_path):
    source_sha = "c" * 40
    (tmp_path / "preview-source-sha.txt").write_text(
        f"{source_sha}\n", encoding="utf-8"
    )
    (tmp_path / "index.html").write_text("index", encoding="utf-8")
    (tmp_path / "404.html").write_text("missing", encoding="utf-8")

    assert locate_preview_root(tmp_path, source_sha) == Path(tmp_path)

    with pytest.raises(RuntimeError, match="source mismatch"):
        locate_preview_root(tmp_path, "d" * 40)

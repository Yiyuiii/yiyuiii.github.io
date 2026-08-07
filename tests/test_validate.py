from types import SimpleNamespace

from scripts.validate import build_steps, run_validation


def test_default_plan_covers_every_non_browser_gate():
    steps = build_steps(
        python="python",
        npm="npm",
        bundle="bundle",
        include_browser=False,
        skip_project_sync=False,
    )

    assert [step.command for step in steps] == [
        ("python", "-m", "pytest", "-q"),
        ("npm", "run", "test:unit"),
        ("python", "scripts/sync_projects.py"),
        ("python", "scripts/translation_guard.py", "--check", "--production"),
        ("python", "scripts/generate_post_thumbnails.py", "--check"),
        ("python", "scripts/generate_article_images.py", "--check"),
        ("bundle", "exec", "jekyll", "build", "--trace"),
        ("python", "scripts/check_site.py", "--site", "_site"),
        ("python", "scripts/check_legacy_urls.py", "--site", "_site"),
    ]
    assert steps[6].environment == {"JEKYLL_ENV": "production"}


def test_offline_browser_plan_skips_only_project_sync_and_forwards_arguments():
    steps = build_steps(
        python="python",
        npm="npm",
        bundle="bundle",
        include_browser=True,
        skip_project_sync=True,
        browser_args=("tests/browser/site.spec.mjs", "--workers=2"),
    )

    commands = [step.command for step in steps]
    assert ("python", "scripts/sync_projects.py") not in commands
    assert commands[-1] == (
        "python",
        "scripts/run_browser_tests.py",
        "--site",
        "_site",
        "--",
        "tests/browser/site.spec.mjs",
        "--workers=2",
    )


def test_runner_stops_at_first_failure_without_mutating_parent_environment(tmp_path):
    steps = build_steps(
        python="python",
        npm="npm",
        bundle="bundle",
        include_browser=False,
        skip_project_sync=True,
    )
    calls = []
    results = iter((0, 7))

    def runner(command, **kwargs):
        calls.append((tuple(command), kwargs))
        return SimpleNamespace(returncode=next(results))

    environment = {"JEKYLL_ENV": "development", "KEEP": "yes"}
    result = run_validation(
        steps[:3],
        repo_root=tmp_path,
        environ=environment,
        runner=runner,
    )

    assert result == 7
    assert len(calls) == 2
    assert all(call[1]["cwd"] == tmp_path for call in calls)
    assert all(call[1]["check"] is False for call in calls)
    assert environment == {"JEKYLL_ENV": "development", "KEEP": "yes"}

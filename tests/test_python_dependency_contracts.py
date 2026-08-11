import re
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "scripts" / "requirements.in"
LOCK = ROOT / "scripts" / "requirements.txt"


def text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def declared_requirements(source: str) -> list[str]:
    return [
        line.strip()
        for line in source.splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]


def locked_versions(source: str) -> dict[str, str]:
    versions = {}
    for line in source.splitlines():
        match = re.match(r"^([A-Za-z0-9_.-]+)==([^ ;\\]+)", line)
        if match:
            package = re.sub(r"[-_.]+", "-", match.group(1)).lower()
            versions[package] = match.group(2)
    return versions


def test_python_checks_use_an_input_and_hashed_lock():
    assert not (ROOT / "scripts" / "requirements-dev.in").exists()
    assert not (ROOT / "scripts" / "requirements-dev.txt").exists()
    assert INPUT.is_file()
    assert LOCK.is_file()

    assert declared_requirements(text(INPUT)) == [
        "beautifulsoup4>=4.12,<5",
        "markdown-it-py>=3,<5",
        "Pillow==12.3.0",
        "pytest>=8,<9",
        "PyYAML>=6,<7",
        'tzdata>=2026.3; sys_platform == "win32"',
    ]

    lock = text(LOCK)
    assert "pip-compile with Python 3.12" in lock
    assert "--hash=sha256:" in lock
    assert "--trusted-host" not in lock
    assert "pypi.hub" not in lock
    assert "\\" not in lock.replace(" \\\n", "")

    versions = locked_versions(lock)
    assert versions == {
        "beautifulsoup4": "4.15.0",
        "colorama": "0.4.6",
        "iniconfig": "2.3.0",
        "markdown-it-py": "4.2.0",
        "mdurl": "0.1.2",
        "packaging": "26.3",
        "pillow": "12.3.0",
        "pluggy": "1.6.0",
        "pygments": "2.20.0",
        "pytest": "8.4.2",
        "pyyaml": "6.0.3",
        "soupsieve": "2.9.2",
        "typing-extensions": "4.16.0",
        "tzdata": "2026.3",
    }

    blocks = re.split(r"\n(?=[A-Za-z0-9_.-]+==)", lock)
    package_blocks = [block for block in blocks if re.match(r"^[A-Za-z0-9_.-]+==", block)]
    assert len(package_blocks) == len(versions)
    assert all("--hash=sha256:" in block for block in package_blocks)


def test_workflow_and_dependabot_install_and_maintain_the_lock():
    workflow = text(ROOT / ".github" / "workflows" / "deploy.yml")
    readme = text(ROOT / "README.md")
    dependabot = yaml.safe_load(text(ROOT / ".github" / "dependabot.yml"))

    assert "scripts/requirements.in" in workflow
    assert "scripts/requirements.txt" in workflow
    assert (
        "python -m pip install --require-hashes "
        "-r scripts/requirements.txt"
    ) in workflow
    assert "python -m pip check" in workflow
    assert (
        "python -m pip install --require-hashes "
        "-r scripts/requirements.txt"
    ) in readme

    pip_updates = [
        update
        for update in dependabot["updates"]
        if update["package-ecosystem"] == "pip"
    ]
    assert len(pip_updates) == 1
    assert pip_updates[0]["directory"] == "/scripts"
    assert pip_updates[0]["versioning-strategy"] == "increase-if-necessary"


def test_pillow_lock_matches_the_deterministic_image_contract():
    versions = locked_versions(text(LOCK))
    provenance = yaml.safe_load(text(ROOT / "docs" / "asset-provenance.yml"))
    article_derivatives = yaml.safe_load(
        text(ROOT / "_data" / "article_image_derivatives.yml")
    )

    assert versions["pillow"] == "12.3.0"
    assert provenance["index_derivatives"]["pillow"] == versions["pillow"]
    assert article_derivatives["policy"]["pillow"] == versions["pillow"]

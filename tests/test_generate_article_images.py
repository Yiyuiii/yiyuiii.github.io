import hashlib
import importlib.util
from pathlib import Path

import pytest
import yaml
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "generate_article_images.py"
SPEC = importlib.util.spec_from_file_location("generate_article_images", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fixture_tree(tmp_path: Path, *, complete_manifest: bool = True):
    posts = tmp_path / "assets" / "posts" / "fixture"
    posts.mkdir(parents=True, exist_ok=True)
    source = posts / "source.png"
    derivative = posts / "source-content-v1-10.webp"
    Image.new("RGB", (20, 10), (20, 40, 60)).save(source, "PNG")
    Image.new("RGB", (10, 5), (20, 40, 60)).save(derivative, "WEBP")

    record = {
        "source": "assets/posts/fixture/source.png",
        "published": "assets/posts/fixture/source.png",
        "variants": [
            {
                "asset": "assets/posts/fixture/source-content-v1-10.webp",
                "width": 10,
            }
        ],
    }
    if complete_manifest:
        record.update(
            {
                "source_sha256": digest(source),
                "source_dimensions": [20, 10],
            }
        )
        record["variants"][0].update(
            {
                "sha256": digest(derivative),
                "dimensions": [10, 5],
            }
        )
    data = {
        "version": 2,
        "policy": dict(MODULE.EXPECTED_POLICY),
        "images": [record],
    }
    policy = tmp_path / MODULE.POLICY_PATH
    policy.parent.mkdir(parents=True, exist_ok=True)
    policy.write_text(
        yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8"
    )
    return source, derivative, policy


def test_check_verifies_committed_manifest_without_reencoding(tmp_path, monkeypatch):
    fixture_tree(tmp_path)

    def unexpected_render(*args, **kwargs):
        raise AssertionError("check mode must not invoke a platform encoder")

    monkeypatch.setattr(MODULE, "render", unexpected_render)
    report = MODULE.generate(tmp_path, write=False)

    assert report["verification"] == "committed-manifest"
    assert report["sources"] == 1
    assert report["derivatives"] == 1


def test_check_rejects_changed_source_and_derivative_bytes(tmp_path):
    source, derivative, _ = fixture_tree(tmp_path)
    Image.new("RGB", (20, 10), (90, 40, 10)).save(source, "PNG")
    with pytest.raises(ValueError, match="source changed"):
        MODULE.generate(tmp_path, write=False)

    source, derivative, _ = fixture_tree(tmp_path)
    Image.new("RGB", (10, 5), (90, 40, 10)).save(derivative, "WEBP")
    with pytest.raises(ValueError, match="stale"):
        MODULE.generate(tmp_path, write=False)


def test_write_refreshes_hashes_and_dimensions_then_check_passes(tmp_path, monkeypatch):
    _, derivative, policy = fixture_tree(tmp_path, complete_manifest=False)
    derivative.unlink()
    monkeypatch.setattr(MODULE, "pillow_version", "12.0.0")
    monkeypatch.setattr(MODULE.features, "version", lambda name: "1.6.0")

    written = MODULE.generate(tmp_path, write=True)
    document = yaml.safe_load(policy.read_text(encoding="utf-8"))
    record = document["images"][0]
    variant = record["variants"][0]

    assert written["mode"] == "write"
    assert derivative.is_file()
    assert record["source_sha256"] == digest(tmp_path / record["source"])
    assert record["source_dimensions"] == [20, 10]
    assert variant["sha256"] == digest(derivative)
    assert variant["dimensions"] == [10, 5]
    assert MODULE.generate(tmp_path, write=False)["mode"] == "check"

import hashlib
import re
from pathlib import Path

import yaml
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "docs" / "article-assets" / "202608021600.yml"
POSTS = (
    ROOT / "_posts" / "2026-08-02-像读一篇随笔一样学会SETI.md",
    ROOT / "_posts" / "2026-08-02-learning-seti-board-game.md",
)
ASSET_RE = re.compile(r"/?(assets/posts/202608021600/[A-Za-z0-9._-]+\.webp)")


def manifest():
    return yaml.safe_load(MANIFEST_PATH.read_text(encoding="utf-8"))


def post_assets(path):
    return ASSET_RE.findall(path.read_text(encoding="utf-8"))


def test_seti_article_asset_manifest_covers_both_localized_posts_in_order():
    assets = [item["asset"] for item in manifest()["assets"]]
    assert len(assets) == 20
    assert len(set(assets)) == len(assets)
    chinese_assets = post_assets(POSTS[0])
    english_assets = post_assets(POSTS[1])
    assert len(chinese_assets) == len(set(chinese_assets)) == 20
    assert set(chinese_assets) == set(assets)
    assert english_assets == chinese_assets


def test_seti_article_asset_manifest_matches_production_files():
    for item in manifest()["assets"]:
        path = ROOT / item["asset"]
        assert path.is_file()
        assert hashlib.sha256(path.read_bytes()).hexdigest() == item["sha256"]
        with Image.open(path) as image:
            assert list(image.size) == item["dimensions"]
            assert image.format == "WEBP"


def test_seti_article_assets_use_declared_official_https_sources():
    data = manifest()
    declared_sources = set(data["source_urls"].values())
    assert data["article_uid"] == "202608021600"
    assert all(url.startswith("https://") for url in declared_sources)
    assert all(item["source_url"] in declared_sources for item in data["assets"])

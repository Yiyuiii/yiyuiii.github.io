from pathlib import Path

import pytest
import yaml

from scripts.check_legacy_urls import LegacyUrlError, verify_inventory


def write(path, content=""):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def test_retained_redirected_retirement_and_retired_routes(tmp_path):
    write(
        tmp_path / "index.html",
        '<link rel="canonical" href="https://example.test/">\n<h1>Home</h1>',
    )
    write(
        tmp_path / "blog" / "index.html",
        '<meta http-equiv="refresh" content="0; url=/">\n'
        '<link rel="canonical" href="https://example.test/">\n'
        '<meta property="og:url" content="https://example.test/">',
    )
    write(
        tmp_path / "sw.js",
        "caches.keys().then((keys) => keys.map((key) => caches.delete(key))); "
        "self.registration.unregister();",
    )
    inventory = [
        {"path": "/", "policy": "retained"},
        {"path": "/blog/", "policy": "redirected", "target": "/"},
        {"path": "/sw.js", "policy": "retirement"},
        {"path": "/research/", "policy": "retired"},
    ]

    verify_inventory(tmp_path, inventory)


def test_missing_retained_route_fails_with_url(tmp_path):
    with pytest.raises(LegacyUrlError, match="/about/"):
        verify_inventory(
            tmp_path,
            [{"path": "/about/", "policy": "retained"}],
        )


def test_redirect_must_have_the_declared_same_site_target(tmp_path):
    write(
        tmp_path / "page2" / "index.html",
        '<meta http-equiv="refresh" content="0; url=/wrong/">',
    )

    with pytest.raises(LegacyUrlError, match="/page2/.*expected /"):
        verify_inventory(
            tmp_path,
            [{"path": "/page2/", "policy": "redirected", "target": "/"}],
        )


def test_redirect_target_must_be_a_real_built_route(tmp_path):
    write(
        tmp_path / "old" / "index.html",
        '<meta http-equiv="refresh" content="0; url=/new/">',
    )

    with pytest.raises(LegacyUrlError, match="redirect target /new/ is missing"):
        verify_inventory(
            tmp_path,
            [{"path": "/old/", "policy": "redirected", "target": "/new/"}],
        )


def test_percent_encoded_redirect_target_matches_unicode_route(tmp_path):
    target = "/posts/SETI桌游规则-从摆桌到完成第一局/"
    encoded_target = (
        "/posts/SETI%E6%A1%8C%E6%B8%B8%E8%A7%84%E5%88%99-"
        "%E4%BB%8E%E6%91%86%E6%A1%8C%E5%88%B0%E5%AE%8C%E6%88%90"
        "%E7%AC%AC%E4%B8%80%E5%B1%80/"
    )
    canonical = f"https://example.test{encoded_target}"
    write(
        tmp_path / "posts" / "SETI桌游规则-从摆桌到完成第一局" / "index.html",
        f'<link rel="canonical" href="{canonical}">',
    )
    write(
        tmp_path / "posts" / "old-seti-guide" / "index.html",
        f'<meta http-equiv="refresh" content="0; url={encoded_target}">\n'
        f'<link rel="canonical" href="{canonical}">\n'
        f'<meta property="og:url" content="{canonical}">',
    )

    verify_inventory(
        tmp_path,
        [
            {
                "path": "/posts/old-seti-guide/",
                "policy": "redirected",
                "target": target,
            }
        ],
    )


@pytest.mark.parametrize(
    ("field", "canonical", "open_graph"),
    [
        ("canonical", "https://example.test/old/", "https://example.test/new/"),
        ("og:url", "https://example.test/new/", "https://example.test/old/"),
    ],
)
def test_redirect_metadata_must_match_the_target_canonical(
    tmp_path, field, canonical, open_graph
):
    write(
        tmp_path / "new" / "index.html",
        '<link rel="canonical" href="https://example.test/new/">',
    )
    write(
        tmp_path / "old" / "index.html",
        '<meta http-equiv="refresh" content="0; url=/new/">\n'
        f'<link rel="canonical" href="{canonical}">\n'
        f'<meta property="og:url" content="{open_graph}">',
    )

    with pytest.raises(LegacyUrlError, match=field):
        verify_inventory(
            tmp_path,
            [{"path": "/old/", "policy": "redirected", "target": "/new/"}],
        )


def test_retired_route_must_not_be_built(tmp_path):
    write(tmp_path / "cv" / "index.html", "<h1>CV</h1>")

    with pytest.raises(LegacyUrlError, match="/cv/.*retired"):
        verify_inventory(
            tmp_path,
            [{"path": "/cv/", "policy": "retired"}],
        )


def test_committed_inventory_is_concrete_unique_and_covers_article_media():
    root = Path(__file__).resolve().parents[1]
    inventory = yaml.safe_load(
        (root / "_data" / "legacy_urls.yml").read_text(encoding="utf-8")
    )
    paths = [item["path"] for item in inventory]

    assert len(paths) >= 65
    assert len(paths) == len(set(paths))
    assert all("*" not in path and ":" not in path for path in paths)
    assert len([item for item in inventory if item["policy"] == "asset"]) == 20
    assert "/posts/build-a-personal-github-page/" in paths
    assert "/posts/building-a-personal-github-page/" not in paths
    assert {"/blog/", "/page2/", "/categories/blogging/"} <= {
        item["path"] for item in inventory if item["policy"] == "redirected"
    }
    blogging = next(
        item for item in inventory if item["path"] == "/categories/blogging/"
    )
    assert blogging["target"] == "/categories/"

    redirect_source = (
        root / "_pages" / "legacy-blogging-category.md"
    ).read_text(encoding="utf-8")
    redirect = yaml.safe_load(redirect_source.split("---", 2)[1])
    assert redirect["permalink"] == "/categories/blogging/"
    assert redirect["redirect"] == "/categories/"
    assert redirect["canonical_url"] == "/categories/"


def test_removed_logic_duel_cover_is_explicitly_retired():
    root = Path(__file__).resolve().parents[1]
    inventory = yaml.safe_load(
        (root / "_data" / "legacy_urls.yml").read_text(encoding="utf-8")
    )
    old_cover = next(
        item
        for item in inventory
        if item["path"] == "/assets/posts/202302032000/title.jpg"
    )

    assert old_cover["policy"] == "retired"


def test_english_legacy_post_urls_redirect_to_the_language_namespace():
    root = Path(__file__).resolve().parents[1]
    inventory = yaml.safe_load(
        (root / "_data" / "legacy_urls.yml").read_text(encoding="utf-8")
    )
    expected = {
        "/posts/build-a-personal-github-page/": (
            "/en/posts/build-a-personal-github-page/",
            "_pages/legacy-build-a-personal-github-page.md",
        ),
        "/posts/reinforcement-learning-issues/": (
            "/en/posts/reinforcement-learning-issues/",
            "_pages/legacy-reinforcement-learning-issues.md",
        ),
    }

    for old_url, (new_url, source_path) in expected.items():
        record = next(item for item in inventory if item["path"] == old_url)
        assert record == {"path": old_url, "policy": "redirected", "target": new_url}

        page = yaml.safe_load((root / source_path).read_text(encoding="utf-8").split("---", 2)[1])
        assert page["permalink"] == old_url
        assert page["redirect"] == new_url
        assert page["canonical_url"] == new_url
        assert page["sitemap"] is False

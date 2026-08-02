from datetime import date
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def frontmatter(path):
    source = text(path)
    return yaml.safe_load(source.split("---", 2)[1])


def test_home_copy_is_bilingual_structured_and_not_hardcoded_in_runtime_files():
    home = yaml.safe_load(text("_data/home.yml"))

    assert set(home) == {"zh", "en"}
    for language in ("zh", "en"):
        copy = home[language]
        assert set(copy) == {
            "title",
            "introduction",
            "guide",
            "sections",
            "types",
            "date_format",
            "external_label",
            "legacy_tag_noscript",
        }
        assert copy["title"].strip()
        assert all(paragraph.strip() for paragraph in copy["introduction"])
        assert copy["guide"]["label"].strip()
        assert len(copy["guide"]["items"]) == 5
        assert set(copy["sections"]) == {
            "rotation",
            "rotation_note",
            "rotation_fallback",
            "recent",
        }
    assert home["zh"]["sections"]["rotation"] == "随机发现"
    assert home["en"]["sections"]["rotation"] == "Random discovery"
    assert home["zh"]["sections"]["rotation_note"] == "每次进入随机抽取，不记录访问"
    assert home["en"]["sections"]["rotation_note"] == (
        "Drawn at random on each visit, with no visit tracking"
    )

    runtime = "\n".join(
        text(path)
        for path in (
            "_includes/home-feed.liquid",
            "assets/js/home-feed.js",
            "assets/css/main.scss",
        )
    )
    for phrase in (
        home["zh"]["title"],
        home["en"]["title"],
        home["zh"]["sections"]["recent"],
        home["en"]["sections"]["recent"],
    ):
        assert phrase not in runtime


def test_home_feed_manifest_is_complete_stable_and_has_only_editorial_dates():
    manifest = yaml.safe_load(text("_data/home_feed.yml"))
    items = manifest["items"]

    assert manifest["date_semantics"].strip()
    assert len(items) == 25
    assert len({item["id"] for item in items}) == len(items)
    assert all(set(item) == {"id", "kind", "ref", "feed_date"} for item in items)
    assert {item["kind"] for item in items} == {
        "writing",
        "project",
        "publication",
    }
    assert not any(
        forbidden in item
        for item in items
        for forbidden in ("featured", "priority", "score", "stars", "forks")
    )
    assert all(isinstance(item["feed_date"], date) for item in items)

    post_uids = {
        frontmatter(path.relative_to(ROOT))["uid"]
        for path in (ROOT / "_posts").glob("*.md")
    }
    project_refs = {
        item["repository"]
        for item in yaml.safe_load(text("_data/project_repositories.yml"))
    }
    publication_refs = {
        item["key"] for item in yaml.safe_load(text("_data/publications.yml"))
    }
    assert {item["ref"] for item in items if item["kind"] == "writing"} == post_uids
    assert {item["ref"] for item in items if item["kind"] == "project"} == project_refs
    assert {
        item["ref"] for item in items if item["kind"] == "publication"
    } == publication_refs


def test_home_feed_builder_enforces_resolution_and_objective_sorting():
    plugin = text("_plugins/site_content.rb")

    assert "HomeFeed" in plugin
    assert 'site.data["home_feed_runtime"]' in plugin
    assert "feed_date" in plugin
    assert "sort_by" in plugin and "item.fetch(\"id\")" in plugin
    assert "first(8)" in plugin
    assert "recent_ids" in plugin
    assert "common_ids" in plugin
    assert "project_runtime" not in plugin
    for forbidden in ("featured", "priority", "score", "stars", "forks"):
        assert forbidden not in plugin


def test_home_rotation_candidates_are_shared_ordered_and_outside_both_recent_lists():
    items = yaml.safe_load(text("_data/home_feed.yml"))["items"]
    ordered = sorted(items, key=lambda item: (-item["feed_date"].toordinal(), item["id"]))
    recent_ids = {item["id"] for item in ordered[:8]}
    rotation_ids = sorted(item["id"] for item in items if item["id"] not in recent_ids)

    assert len(rotation_ids) > 1
    assert not recent_ids.intersection(rotation_ids)

    plugin = text("_plugins/site_content.rb")
    assert 'localized.fetch("zh").map' in plugin
    assert 'localized.fetch("en").map' in plugin
    assert "rotation_ids = (common_ids - recent_ids).sort" in plugin
    assert 'rotation_ids.map { |id| by_id.fetch(id) }' in plugin


def test_home_pages_own_roots_and_writing_indexes_move_without_changing_posts():
    expected = {
        "_pages/home.md": ("/", "zh", "WebSite", "/en/"),
        "_pages/home.en.md": ("/en/", "en", "WebSite", "/"),
        "_pages/writing.md": ("/writing/", "zh", "CollectionPage", "/en/writing/"),
        "_pages/writing.en.md": ("/en/writing/", "en", "CollectionPage", "/writing/"),
    }
    for path, values in expected.items():
        data = frontmatter(path)
        assert (
            data["permalink"],
            data["lang"],
            data["schema_type"],
            data["translation_url"],
        ) == values

    roots = []
    for path in (ROOT / "_pages").glob("*.md"):
        data = frontmatter(path.relative_to(ROOT))
        if data.get("published", True) and data.get("permalink") == "/":
            roots.append(path.name)
    assert roots == ["home.md"]


def test_home_template_keeps_semantics_without_javascript_and_uses_small_images():
    include = text("_includes/home-feed.liquid")
    item_include = text("_includes/home-feed-item.liquid")
    layout = text("_layouts/default.liquid")

    assert "site.data.home[lang_key]" in include
    assert "site.data.home_feed_runtime[lang_key]" in include
    assert "responsive-thumbnail.liquid" in item_include
    assert "runtime.rotation_fallback" in include
    assert "<noscript>" in include
    assert "home-feed.js" in layout
    assert "page.home" in layout
    assert "post.thumbnail | relative_url" not in include + item_include


def test_home_script_uses_unbiased_crypto_random_discovery_and_preserves_old_tag_urls():
    script = text("assets/js/home-feed.js")

    assert "window.crypto.getRandomValues(sample)" in script
    assert "uint32Range - (uint32Range % length)" in script
    assert "sample[0] >= unbiasedLimit" in script
    assert "sample[0] % length" in script
    assert "catch (_error)" in script
    assert "return null" in script
    assert 'window.addEventListener("pageshow"' in script
    assert "event.persisted" in script
    assert "renderRandomCandidate()" in script
    assert "recentIds" in script
    assert "location.replace" in script
    assert "URLSearchParams" in script
    for forbidden in (
        "localStorage",
        "sessionStorage",
        "document.cookie",
        "fetch(",
        "XMLHttpRequest",
        "sendBeacon",
        "canvas",
        "Math.random",
        "new Date",
        "Date.now",
        "Intl.DateTimeFormat",
    ):
        assert forbidden not in script


def test_header_home_and_missing_translation_routes_are_language_correct():
    header = text("_includes/header.liquid")
    site_text = yaml.safe_load(text("_data/site_text.yml"))

    assert "text.urls.home" in header
    assert site_text["zh"]["urls"]["home"] == "/"
    assert site_text["en"]["urls"]["home"] == "/en/"
    assert site_text["zh"]["urls"]["writing"] == "/writing/"
    assert site_text["en"]["urls"]["writing"] == "/en/writing/"
    assert "'/writing/?missing_translation=1'" in header
    assert "'/en/writing/?missing_translation=1'" in header


def test_home_disables_math_assets_but_posts_keep_the_existing_default():
    for path in ("_pages/home.md", "_pages/home.en.md"):
        assert frontmatter(path)["math"] is False

    scripts = text("_includes/plugins/al_math_scripts.liquid")
    styles = text("_includes/plugins/al_math_styles.liquid")
    for include in (scripts, styles):
        assert "page.math != false" in include
        assert "al_math_" in include

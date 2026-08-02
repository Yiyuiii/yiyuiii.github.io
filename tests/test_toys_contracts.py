import re
from pathlib import Path
from urllib.parse import urlparse

import yaml


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def frontmatter(path):
    return yaml.safe_load(text(path).split("---", 2)[1])


def test_toy_manifest_is_bilingual_editable_and_contains_only_live_features():
    data = yaml.safe_load(text("_data/toys.yml"))

    assert set(data) == {"page", "items"}
    assert set(data["page"]) == {"zh", "en"}
    assert set(data["page"]["zh"]) == set(data["page"]["en"]) == {
        "eyebrow",
        "title",
        "introduction",
        "available",
    }
    assert all(
        isinstance(value, str) and value.strip()
        for language in ("zh", "en")
        for value in data["page"][language].values()
    )

    items = data["items"]
    assert len(items) >= 2
    assert {item["id"] for item in items} >= {
        "random-discovery",
        "theme-and-light",
    }
    assert len({item["id"] for item in items}) == len(items)

    for item in items:
        assert set(item) == {
            "id",
            "kind",
            "title",
            "description",
            "action",
            "keywords",
            "href",
            "external",
        }
        assert re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", item["id"])
        assert isinstance(item["external"], bool)
        for field in ("kind", "title", "description", "action"):
            assert set(item[field]) == {"zh", "en"}
            assert all(
                isinstance(item[field][language], str)
                and item[field][language].strip()
                for language in ("zh", "en")
            )
        assert set(item["keywords"]) == {"zh", "en"}
        assert all(
            isinstance(keyword, str) and keyword.strip()
            for language in ("zh", "en")
            for keyword in item["keywords"][language]
        )

        if item["href"] is None:
            assert item["external"] is False
            continue
        assert set(item["href"]) == {"zh", "en"}
        for href in item["href"].values():
            parsed = urlparse(href)
            if item["external"]:
                assert parsed.scheme == "https" and parsed.netloc
            else:
                assert not parsed.scheme and not parsed.netloc and href.startswith("/")


def test_toy_routes_are_a_complete_localized_pair_and_use_the_shared_renderer():
    expected = {
        "_pages/toys.md": ("/toys/", "zh", "/en/toys/"),
        "_pages/toys.en.md": ("/en/toys/", "en", "/toys/"),
    }
    for path, values in expected.items():
        data = frontmatter(path)
        assert (data["permalink"], data["lang"], data["translation_url"]) == values
        assert data["schema_type"] == "CollectionPage"
        assert data["nav_key"] == "toys"
        assert data["translation_key"] == "toys-index"
        assert "{% include toy-index.liquid %}" in text(path)

    translation = frontmatter("_pages/toys.en.md")
    assert translation["translation_source"] == "_pages/toys.md"
    assert translation["translation_status"] == "current"
    assert translation["source_hash"] != "pending"


def test_toy_renderer_supports_safe_internal_external_and_instruction_entries():
    include = text("_includes/toy-index.liquid")

    assert "site.data.toys" in include
    assert "toy.href[lang_key]" in include
    assert "toy.external" in include
    assert 'target="_blank" rel="noopener noreferrer"' in include
    assert "toy-card__action--hint" in include
    assert 'id="{{ toy.id | escape }}"' in include


def test_toy_cards_and_six_item_navigation_have_bounded_mobile_layouts():
    css = text("assets/css/main.scss")

    assert ".toy-grid" in css
    assert "grid-template-columns: repeat(2, minmax(0, 1fr))" in css
    assert "@media (max-width: 820px)" in css
    tablet = css.split("@media (max-width: 820px)", 1)[1].split(
        "@media (max-width: 640px)", 1
    )[0]
    assert "grid-template-columns: repeat(6, minmax(0, 1fr))" in tablet
    mobile = css.split("@media (max-width: 640px)", 1)[1].split(
        "@media (max-width: 380px)", 1
    )[0]
    assert "grid-template-columns: repeat(3, minmax(0, 1fr))" in mobile
    assert ".toy-grid" in mobile
    assert "grid-template-columns: minmax(0, 1fr)" in mobile

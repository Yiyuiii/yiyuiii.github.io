from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def frontmatter(path):
    return yaml.safe_load(text(path).split("---", 2)[1])


def test_toy_manifest_is_bilingual_grouped_and_contains_only_real_features():
    data = yaml.safe_load(text("_data/toys.yml"))

    assert set(data) == {"page", "groups"}
    assert set(data["page"]) == {"zh", "en"}
    assert set(data["page"]["zh"]) == set(data["page"]["en"]) == {
        "introduction"
    }
    assert all(
        data["page"][language]["introduction"].strip()
        for language in ("zh", "en")
    )

    groups = data["groups"]
    assert [group["id"] for group in groups] == [
        "ungrouped",
        "quick-challenges",
        "random-generators",
    ]
    assert groups[0]["title"] is None
    assert groups[1]["title"] == {"zh": "轻松挑战", "en": "Quick challenges"}
    assert groups[2]["title"] == {"zh": "随机生成", "en": "Random generators"}

    expected_ids = [
        "moegirl-quiz",
        "color-challenge",
        "ten-second",
        "reaction-time",
        "random-password",
        "random-number",
    ]
    items = [item for group in groups for item in group["items"]]
    assert [item["id"] for item in items] == expected_ids
    assert len(expected_ids) == len(set(expected_ids))
    assert not {
        "random-name",
        "random-discovery",
        "theme-and-light",
    }.intersection(expected_ids)

    for item in items:
        assert set(item) == {"id", "title", "description", "keywords"}
        for field in ("title", "description", "keywords"):
            assert set(item[field]) == {"zh", "en"}
        assert all(item["title"][language].strip() for language in ("zh", "en"))
        assert all(
            item["description"][language].strip() for language in ("zh", "en")
        )
        assert all(
            keyword.strip()
            for language in ("zh", "en")
            for keyword in item["keywords"][language]
        )


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
        assert data["math"] is False
        assert data["translation_key"] == "toys-index"
        assert data["hide_title"] is True
        assert "{% include toy-index.liquid %}" in text(path)

    translation = frontmatter("_pages/toys.en.md")
    assert translation["translation_source"] == "_pages/toys.md"
    assert translation["translation_status"] == "current"
    assert translation["source_hash"] != "pending"


def test_toy_renderer_has_one_hidden_page_heading_and_native_disclosures():
    include = text("_includes/toy-index.liquid")

    assert '<h1 class="sr-only">{{ page.title }}</h1>' in include
    assert "copy.introduction" in include
    assert "copy.eyebrow" not in include
    assert "copy.title" not in include
    assert "toy-grid" not in include
    assert '<details id="{{ toy.id | escape }}"' in include
    assert "data-toy-disclosure" in include
    assert '<summary class="toy-entry__summary">' in include
    assert "{% case toy.id %}" in include

    expected_includes = [
        "toy-moegirl-quiz.liquid",
        "toy-color-challenge.liquid",
        "toy-ten-second.liquid",
        "toy-reaction-time.liquid",
        "toy-random-password.liquid",
        "toy-random-number.liquid",
    ]
    for component in expected_includes:
        assert f"include {component}" in include

    expected_scripts = [
        "toy-random.js",
        "toy-generators.js",
        "toy-challenges.js",
        "toy-disclosure.js",
    ]
    positions = [include.index(script) for script in expected_scripts]
    assert positions == sorted(positions)
    assert include.count(" defer></script>") == 4


def test_moegirl_component_uses_the_disclosure_heading_without_repeating_it():
    component = text("_includes/toy-moegirl-quiz.liquid")

    assert "include.heading_id" in component
    assert "copy.eyebrow" not in component
    assert "copy.title" not in component
    assert "copy.description" not in component
    assert "data-moegirl-quiz" in component
    assert "copy.privacy" in component


def test_search_indexes_each_real_grouped_toy_and_hashes_open_without_focus():
    search = text("_includes/search-modal.liquid")
    disclosure = text("assets/js/toy-disclosure.js")

    assert "site.data.toys.groups" in search
    assert "toy_group.items" in search
    assert "append: toy.id" in search
    assert "document.getElementById(targetId)" in disclosure
    assert 'window.addEventListener("hashchange", openHashTarget)' in disclosure
    assert "disclosure.open = true" in disclosure
    assert ".focus(" not in disclosure

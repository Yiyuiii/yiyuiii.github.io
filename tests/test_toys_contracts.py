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
        "introduction",
        "loading",
        "load_error",
        "retry",
    }
    assert all(
        data["page"][language]["introduction"].strip()
        for language in ("zh", "en")
    )

    groups = data["groups"]
    assert [group["id"] for group in groups] == [
        "database",
        "quick-challenges",
        "logic-puzzles",
        "random-generators",
    ]
    assert groups[0]["title"] == {"zh": "知识问答", "en": "Knowledge quizzes"}
    assert groups[1]["title"] == {"zh": "轻松挑战", "en": "Quick challenges"}
    assert groups[2]["title"] == {"zh": "逻辑谜题", "en": "Logic puzzles"}
    assert groups[3]["title"] == {"zh": "随机生成", "en": "Random generators"}

    expected_ids = [
        "moegirl-quiz",
        "art-glimpse",
        "anilist-role-quiz",
        "color-challenge",
        "ten-second",
        "reaction-time",
        "codebreaker",
        "make-24",
        "lights-out",
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
    assert 'id="{{ toy.id | escape }}"' in include
    assert "data-toy-disclosure" in include
    assert '<summary class="toy-entry__summary">' in include
    assert "{% case toy.id %}" in include

    expected_includes = [
        "toy-moegirl-quiz.liquid",
        "toy-art-glimpse.liquid",
        "toy-acg-relation-quiz.liquid",
        "toy-color-challenge.liquid",
        "toy-ten-second.liquid",
        "toy-reaction-time.liquid",
        "toy-codebreaker.liquid",
        "toy-make-24.liquid",
        "toy-lights-out.liquid",
        "toy-random-password.liquid",
        "toy-random-number.liquid",
    ]
    for component in expected_includes:
        assert f"include {component}" in include

    expected_assets = {
        "moegirl": "moegirl-quiz.js",
        "art": "art-glimpse.js",
        "acg-logic": "acg-relation-quiz-logic.js",
        "acg-ui": "acg-relation-quiz.js",
        "random": "toy-random.js",
        "generators": "toy-generators.js",
        "history": "toy-challenge-history.js",
        "challenges": "toy-challenges.js",
        "color": "toy-color-challenge.js",
        "codebreaker": "toy-codebreaker.js",
        "make24": "toy-make-24.js",
        "lights": "toy-lights-out.js",
    }
    for token, script in expected_assets.items():
        assert f'"{token}":' in include
        assert script in include
    assert "data-toy-assets" in include
    assert "data-toy-asset-manifest" in include
    assert "data-toy-loader-status" in include
    assert include.count(" defer></script>") == 1
    assert "toy-loader.js" in include


def test_encyclopedia_component_uses_the_disclosure_heading_without_repeating_it():
    component = text("_includes/toy-moegirl-quiz.liquid")

    assert "include.heading_id" in component
    assert "copy.eyebrow" not in component
    assert "copy.title" not in component
    assert "copy.description" not in component
    assert "data-moegirl-quiz" in component
    assert "data-quiz-source-select" not in component
    assert "data-api-endpoint" in component
    assert "Wikipedia" not in component


def test_moegirlpedia_quiz_has_source_specific_visible_copy_but_preserves_the_old_hash():
    data = yaml.safe_load(text("_data/toys.yml"))
    items = [item for group in data["groups"] for item in group["items"]]
    quiz = next(item for item in items if item["id"] == "moegirl-quiz")

    assert quiz["title"] == {
        "zh": "萌娘百科猜猜",
        "en": "Moegirlpedia quiz",
    }
    assert "角色" not in quiz["title"]["zh"]
    assert "character" not in quiz["title"]["en"].lower()
    assert "Wikipedia" not in quiz["keywords"]["en"]
    assert "维基百科" not in quiz["keywords"]["zh"]
    assert "Moegirlpedia" in quiz["keywords"]["en"]
    assert "萌娘百科" in quiz["keywords"]["zh"]
    assert "moegirl-quiz" in text("_includes/toy-index.liquid")


def test_external_quiz_titles_name_their_actual_providers_and_anilist_formats():
    data = yaml.safe_load(text("_data/toys.yml"))
    items = {
        item["id"]: item
        for group in data["groups"]
        for item in group["items"]
    }
    assert items["art-glimpse"]["title"] == {
        "zh": "名画猜猜（克利夫兰艺术博物馆）",
        "en": "Artwork quiz (Cleveland Museum of Art)",
    }
    assert items["anilist-role-quiz"]["title"] == {
        "zh": "动画主角猜猜（AniList）",
        "en": "Anime protagonist quiz (AniList)",
    }
    assert "可选择" in items["anilist-role-quiz"]["description"]["zh"]
    assert "choose" in items["anilist-role-quiz"]["description"]["en"].lower()


def test_search_indexes_each_real_grouped_toy_and_hashes_open_without_focus():
    search = text("_includes/search-dialog.liquid")
    disclosure = text("assets/js/toy-loader.js")

    assert "site.data.toys.groups" in search
    assert "toy_group.items" in search
    assert "append: toy.id" in search
    assert "document.getElementById(targetId)" in disclosure
    assert 'window.addEventListener("hashchange", openHashTarget)' in disclosure
    assert "disclosure.open = true" in disclosure
    assert ".focus(" not in disclosure


def test_toy_loader_restricts_dynamic_scripts_and_recovers_from_failures():
    loader = text("assets/js/toy-loader.js")

    assert "allowedPaths = Object.freeze" in loader
    assert "allowedDependencies = Object.freeze" in loader
    assert 'tokens.join(" ") !== disclosure.dataset.toyAssets' in loader
    assert "url.origin !== window.location.origin" in loader
    assert "url.pathname !== expectedPath" in loader
    assert "document.createElement(\"script\")" in loader
    assert "script.async = false" in loader
    assert "assetPromises.delete(token)" in loader
    assert "data-toy-loader-retry" in loader
    assert 'window.addEventListener("yiyuiii:open-hash-target"' in loader
    for forbidden in ("fetch(", "XMLHttpRequest", "innerHTML", "eval("):
        assert forbidden not in loader

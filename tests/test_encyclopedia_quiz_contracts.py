from pathlib import Path
from urllib.parse import urlparse

import yaml


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def quiz_data():
    return yaml.safe_load(text("_data/encyclopedia_quiz.yml"))


def test_source_matrix_has_safe_language_defaults_and_exact_official_endpoints():
    data = quiz_data()

    assert data["timeout_ms"] == 10000
    assert data["max_response_chars"] in {262144, 524288}
    assert data["recent_history_size"] >= 16
    assert data["defaults"] == {"zh": "moegirl_zh", "en": "wikipedia_en"}
    assert data["available_sources"] == {
        "zh": ["moegirl_zh", "wikipedia_zh"],
        "en": ["wikipedia_en", "moegirl_zh"],
    }
    assert set(data["sources"]) == {
        "moegirl_zh",
        "wikipedia_zh",
        "wikipedia_en",
    }

    expected = {
        "moegirl_zh": (
            "moegirl",
            "zh",
            "https://zh.moegirl.org.cn/api.php",
            50,
            "https://creativecommons.org/licenses/by-nc-sa/3.0/",
        ),
        "wikipedia_zh": (
            "wikipedia",
            "zh",
            "https://zh.wikipedia.org/w/api.php",
            20,
            "https://creativecommons.org/licenses/by-sa/4.0/",
        ),
        "wikipedia_en": (
            "wikipedia",
            "en",
            "https://en.wikipedia.org/w/api.php",
            20,
            "https://creativecommons.org/licenses/by-sa/4.0/",
        ),
    }
    for source_id, values in expected.items():
        source = data["sources"][source_id]
        assert (
            source["adapter"],
            source["language"],
            source["endpoint"],
            source["batch_size"],
            source["license_url"],
        ) == values
        endpoint = urlparse(source["endpoint"])
        assert endpoint.scheme == "https"
        assert not endpoint.query and not endpoint.fragment

    for language, default_source in data["defaults"].items():
        assert default_source in data["available_sources"][language]


def test_configuration_contains_copy_but_no_questions_media_credentials_or_storage():
    data = quiz_data()
    serialized = yaml.safe_dump(data, allow_unicode=True).lower()

    for forbidden in (
        "entries:",
        "questions:",
        "pageimages",
        "thumbnail",
        "image_url",
        "audio_url",
        "api_key",
        "access_token",
        "localstorage",
        "sessionstorage",
        "cookie",
    ):
        assert forbidden not in serialized

    common_keys = {
        "source_select_label",
        "start",
        "again",
        "retry",
        "options_label",
        "clue_label",
        "redaction",
        "correct",
        "incorrect",
        "network_error",
        "no_clue_error",
        "random_error",
        "no_js",
    }
    assert set(data["copy"]) == {"zh", "en"}
    assert set(data["copy"]["zh"]) == set(data["copy"]["en"])
    assert common_keys <= set(data["copy"]["zh"])
    for language in ("zh", "en"):
        copy = data["copy"][language]
        assert copy["clue_label"] in {"这是什么？", "What is this?"}
        assert copy["redaction"] == "⬛"
        assert "{title}" in copy["correct"]
        assert "{title}" in copy["incorrect"]
        assert "JavaScript" in copy["no_js"]

    source_copy_keys = {
        "label",
        "privacy",
        "loading",
        "source_label",
        "attribution",
        "license_label",
    }
    expected_combinations = {
        "moegirl_zh": {"zh", "en"},
        "wikipedia_zh": {"zh"},
        "wikipedia_en": {"en"},
    }
    assert set(data["source_copy"]) == set(expected_combinations)
    for source_id, languages in expected_combinations.items():
        assert languages <= set(data["source_copy"][source_id])
        for language in languages:
            copy = data["source_copy"][source_id][language]
            assert source_copy_keys <= set(copy)
            assert "IP" in copy["privacy"]
            assert "{title}" in copy["source_label"]
            if source_id.startswith("wikipedia"):
                combined = " ".join(str(value) for value in copy.values())
                assert "CC BY-SA 4.0" in combined
                assert any(term in combined for term in ("修改", "modified"))
            else:
                assert "CC BY-NC-SA 3.0" in " ".join(
                    str(value) for value in copy.values()
                )


def test_include_is_progressively_enhanced_and_renders_one_json_configuration():
    include = text("_includes/toy-encyclopedia-quiz.liquid")

    assert "data-encyclopedia-quiz" in include
    assert "data-quiz-enhanced hidden" in include
    assert "data-quiz-source-select" in include
    assert "data-quiz-privacy" in include
    assert "data-quiz-interactive hidden" in include
    assert "data-quiz-start" in include
    assert "data-quiz-clue" in include and "data-quiz-clue-text" in include
    assert "data-quiz-options" in include and 'role="group"' in include
    assert 'aria-live="polite"' in include
    assert "data-quiz-source-link" in include
    assert "data-quiz-attribution" in include
    assert "data-quiz-license-link" in include
    assert "<noscript>" in include and "copy.no_js" in include
    assert 'type="application/json"' in include
    assert "data-quiz-config" in include
    assert "data-quiz-copy" not in include
    assert "data-quiz-pool" not in include
    assert "quiz.entries | jsonify" not in include
    assert "assets/js/encyclopedia-quiz-logic.js" in include
    assert "assets/js/encyclopedia-quiz.js" in include
    assert include.index("encyclopedia-quiz-logic.js") < include.index(
        "encyclopedia-quiz.js"
    )
    assert 'referrerpolicy="no-referrer"' in include
    assert "<img" not in include


def test_scripts_keep_network_and_untrusted_dom_boundaries_explicit():
    logic = text("assets/js/encyclopedia-quiz-logic.js")
    controller = text("assets/js/encyclopedia-quiz.js")
    combined = f"{logic}\n{controller}"
    lowered = combined.lower()

    assert controller.count("await fetch(") == 1
    assert "crypto.getRandomValues" in combined
    assert "AbortController" in controller
    assert 'credentials: "omit"' in controller
    assert 'cache: "no-store"' in controller
    assert 'redirect: "error"' in controller
    assert 'referrerPolicy: "no-referrer"' in controller
    assert "MAX_RESPONSE" in combined
    assert "textContent" in controller
    assert "replaceChildren" in controller
    assert "data-quiz-source-select" in controller
    assert "data-quiz-enhanced" in controller
    assert "Map(" in controller
    assert "wikipedia_en" in combined and "wikipedia_zh" in combined
    assert "zh.wikipedia.org" in combined and "en.wikipedia.org" in combined
    assert "zh.moegirl.org.cn" in combined
    for required in (
        'generator: "random"',
        'grnfilterredir: "nonredirects"',
        'exintro: "1"',
        'explaintext: "1"',
        'exlimit: "20"',
        'requestid:',
    ):
        assert required in combined
    assert "oldid=" in combined

    for forbidden in (
        "math.random",
        "localstorage",
        "sessionstorage",
        "document.cookie",
        "innerhtml",
        "pageimages",
        "thumbnail",
        "rvlimit",
        "api-user-agent",
        "authorization",
    ):
        assert forbidden not in lowered


def test_logic_names_the_six_types_and_never_uses_an_unknown_bucket_as_a_quiz_type():
    logic = text("assets/js/encyclopedia-quiz-logic.js")

    for semantic_type in ("person", "place", "work", "organization", "organism", "event"):
        assert semantic_type in logic
    assert "disambiguation" in logic
    assert "semanticType" in logic
    assert "sampleWithoutReplacement" in logic
    assert "unknown" in logic


def test_styles_are_neutral_scoped_responsive_and_theme_aware():
    css = text("assets/css/main.scss")
    component = css[
        css.index(".encyclopedia-quiz {") : css.index(".site-footer {")
    ]

    assert 'html[data-theme="dark"] .encyclopedia-quiz' in component
    assert ".encyclopedia-quiz__source-select" in component
    assert ".encyclopedia-quiz__clue" in component
    assert ".encyclopedia-quiz__clue-text" in component
    assert "@media (max-width: 560px)" in component
    assert "grid-template-columns: minmax(0, 1fr)" in component
    assert "overflow-wrap: anywhere" in component
    assert ".moegirl-quiz" not in component
    assert "animation" not in component

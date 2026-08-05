from pathlib import Path
from urllib.parse import urlparse

import yaml


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def data():
    return yaml.safe_load(text("_data/acg_relation_quiz.yml"))


def test_only_the_audited_anilist_source_is_configured():
    quiz = data()
    assert quiz["timeout_ms"] == 10000
    assert quiz["max_response_chars"] == 262144
    assert quiz["recent_history_size"] == 16
    assert quiz["source"] == {
        "id": "anilist_role",
        "adapter": "anilist_role",
        "endpoint": "https://graphql.anilist.co",
        "method": "POST",
        "page_min": 1,
        "page_max": 60,
        "media_per_page": 6,
        "characters_per_media": 10,
        "source_home": "https://anilist.co/",
        "terms_url": "https://docs.anilist.co/guide/terms-of-use",
    }
    endpoint = urlparse(quiz["source"]["endpoint"])
    assert endpoint.scheme == "https" and endpoint.hostname == "graphql.anilist.co"
    assert not endpoint.query and not endpoint.fragment


def test_copy_is_bilingual_and_discloses_the_real_request_and_language_limits():
    quiz = data()
    assert set(quiz["copy"]) == {"zh", "en"}
    assert set(quiz["copy"]["zh"]) == set(quiz["copy"]["en"])
    assert set(quiz["source_copy"]) == {"zh", "en"}
    assert set(quiz["source_copy"]["zh"]) == set(quiz["source_copy"]["en"])
    zh = " ".join(quiz["source_copy"]["zh"].values())
    en = " ".join(quiz["source_copy"]["en"].values())
    assert "跨域权限检查" in zh and "GraphQL POST" in zh and "IP" in zh
    assert "原文" in zh and "罗马字" in zh and "没有独立中文题名" in zh
    assert "CORS permission check" in en and "GraphQL POST" in en and "IP" in en
    assert "six" in en and "360" in en
    assert "不会自动翻页或重试" in zh
    assert "never follows another page or retries automatically" in en


def test_configuration_has_no_questions_images_credentials_or_storage():
    serialized = yaml.safe_dump(data(), allow_unicode=True).lower()
    for forbidden in (
        "questions:",
        "entries:",
        "coverimage",
        "image_url",
        "api_key",
        "access_token",
        "authorization",
        "localstorage",
        "sessionstorage",
    ):
        assert forbidden not in serialized


def test_include_is_progressively_enhanced_and_text_only():
    include = text("_includes/toy-acg-relation-quiz.liquid")
    assert "data-acg-relation-quiz" in include
    assert "data-acg-enhanced hidden" in include
    assert "data-acg-interactive hidden" in include
    assert "data-acg-start" in include
    assert "data-acg-prompt" in include
    assert 'role="group"' in include and "data-acg-options" in include
    assert 'aria-live="polite"' in include
    assert "data-acg-source-link" in include and "data-acg-terms-link" in include
    assert 'referrerpolicy="no-referrer"' in include
    assert "<noscript>" in include
    assert 'type="application/json"' in include and "data-acg-config" in include
    assert "assets/js/acg-relation-quiz-logic.js" in include
    assert "assets/js/acg-relation-quiz.js" in include
    assert include.index("acg-relation-quiz-logic.js") < include.index("acg-relation-quiz.js")
    assert "<img" not in include and "<audio" not in include and "cover" not in include.lower()


def test_scripts_enforce_network_randomness_size_and_dom_boundaries():
    logic = text("assets/js/acg-relation-quiz-logic.js")
    controller = text("assets/js/acg-relation-quiz.js")
    combined = logic + controller
    assert 'endpoint: "https://graphql.anilist.co"' in logic
    assert "isAdult: false" in logic
    assert "genre_not_in" in logic and "tag_not_in" in logic
    assert "SENSITIVE_TEXT" in logic
    assert "coverImage" not in logic and "description" not in logic
    assert combined.count("fetch(") == 1
    assert 'credentials: "omit"' in controller
    assert 'referrerPolicy: "no-referrer"' in controller
    assert 'cache: "no-store"' in controller
    assert 'redirect: "error"' in controller
    assert "AbortController" in controller and "readBoundedResponseText" in controller
    assert "localStorage" not in combined and "sessionStorage" not in combined
    assert "document.cookie" not in combined and "Math.random" not in combined
    assert "innerHTML" not in controller and "insertAdjacentHTML" not in controller
    assert "textContent" in controller


def test_no_rejected_provider_or_sound_component_remains():
    assert "bangumi" not in text("_data/acg_relation_quiz.yml").lower()
    assert not (ROOT / "_data/sound_guess.yml").exists()
    assert not (ROOT / "_includes/toy-sound-guess.liquid").exists()
    assert not (ROOT / "assets/js/sound-guess.js").exists()
    assert not (ROOT / "assets/js/sound-guess-logic.js").exists()

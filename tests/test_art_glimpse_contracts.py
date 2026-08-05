from pathlib import Path
from urllib.parse import urlparse

import yaml


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def data():
    return yaml.safe_load(text("_data/toy_art_glimpse.yml"))


def test_configuration_is_one_small_official_cc0_landscape_batch():
    config = data()
    endpoint = urlparse(config["endpoint"])

    assert endpoint.scheme == "https"
    assert endpoint.hostname == "openaccess-api.clevelandart.org"
    assert endpoint.path == "/api/artworks/"
    assert not endpoint.query and not endpoint.fragment
    assert config["api_host"] == "openaccess-api.clevelandart.org"
    assert config["image_host"] == "openaccess-cdn.clevelandart.org"
    assert config["artwork_hosts"] == ["clevelandart.org", "www.clevelandart.org"]
    assert config["query"] == "landscape"
    assert config["artwork_type"] == "Painting"
    assert config["batch_size"] == 12
    assert config["candidate_count"] == 4
    assert 0 <= config["safe_skip_max"] <= 300
    assert config["license_url"] == "https://creativecommons.org/publicdomain/zero/1.0/"
    assert config["open_access_url"] == "https://www.clevelandart.org/open-access"


def test_configuration_bounds_metadata_and_four_web_images_without_a_pool():
    config = data()
    serialized = yaml.safe_dump(config, allow_unicode=True).lower()

    assert 3000 <= config["timeout_ms"] <= 15000
    assert config["image_timeout_ms"] == 10000
    assert config["max_response_chars"] <= 524288
    assert config["max_image_bytes"] == 1200000
    assert config["max_round_image_bytes"] == 4000000
    for forbidden in (
        "api_key",
        "access_token",
        "object_ids",
        "artworks:",
        "questions:",
        "localstorage",
        "sessionstorage",
        "cookie:",
    ):
        assert forbidden not in serialized


def test_copy_is_complete_bilingual_and_truthful_about_language_privacy_and_cc0():
    config = data()
    assert set(config["copy"]) == {"zh", "en"}
    assert set(config["copy"]["zh"]) == set(config["copy"]["en"])
    for language in ("zh", "en"):
        copy = config["copy"][language]
        combined = " ".join(str(value) for value in copy.values())
        assert "IP" in copy["privacy"]
        assert "CC0" in combined
        assert "{title}" in copy["source_label"]
        assert "JavaScript" in copy["no_js"]
    assert "原题名" not in config["copy"]["zh"]["source_label"]
    assert "《{title}》" in config["copy"]["zh"]["source_label"]
    assert "克利夫兰艺术博物馆" in config["copy"]["zh"]["privacy"]
    assert "Cleveland Museum of Art" in config["copy"]["en"]["privacy"]


def test_include_is_progressively_enhanced_accessible_and_self_contained():
    include = text("_includes/toy-art-glimpse.liquid")

    for required in (
        "data-art-glimpse",
        "data-art-glimpse-enhanced hidden",
        "data-art-glimpse-interactive hidden",
        "data-art-glimpse-start",
        "data-art-glimpse-clue",
        "data-art-glimpse-clue-canvas",
        "data-art-glimpse-choices",
        'role="group"',
        'aria-live="polite"',
        "data-art-glimpse-reveal",
        "data-art-glimpse-source",
        "data-art-glimpse-config",
        'type="application/json"',
        "<noscript>",
        "assets/js/art-glimpse.js",
        'referrerpolicy="no-referrer"',
    ):
        assert required in include
    stylesheet = text("assets/css/main.scss")
    assert ".art-glimpse__choices" in stylesheet
    assert "@media (max-width: 359px)" in stylesheet
    assert "glimpse.entries | jsonify" not in include
    assert "innerHTML" not in include


def test_controller_has_explicit_network_random_storage_and_dom_boundaries():
    script = text("assets/js/art-glimpse.js")
    lowered = script.lower()

    assert script.count("await fetch(") == 1
    assert "crypto.getRandomValues" in script
    assert "AbortController" in script
    assert 'cache: "no-store"' in script
    assert 'credentials: "omit"' in script
    assert 'redirect: "error"' in script
    assert 'referrerPolicy: "no-referrer"' in script
    assert 'image.referrerPolicy = "no-referrer"' in script
    assert "readBoundedResponseText" in script
    assert "maxImageBytes" in script
    assert "maxRoundImageBytes" in script
    assert "openaccess-api.clevelandart.org" in script
    assert "openaccess-cdn.clevelandart.org" in script
    assert "share_license_status" in script and '"CC0"' in script
    assert "SENSITIVE_TEXT" in script
    assert "textContent" in script
    assert "replaceChildren" in script
    assert "image.removeAttribute(\"src\")" in script
    assert "context.drawImage(" in script
    assert "toDataURL" not in script
    assert "getImageData" not in script
    for forbidden in (
        "math.random",
        "localstorage",
        "sessionstorage",
        "indexeddb",
        "document.cookie",
        "innerhtml",
        "authorization",
        "api_key",
        "access_token",
    ):
        assert forbidden not in lowered


def test_live_audit_is_explicit_single_batch_and_never_persists_content():
    audit = text("tests/tools/audit-art-glimpse-live.mjs")
    lowered = audit.lower()

    assert "--run-live" in audit
    assert "--sample" in audit
    assert "logic.buildApiUrl" in audit
    assert audit.count("await fetch(") == 2
    assert "Promise.all(gameRound.options.map" in audit
    assert "AbortController" in audit
    assert "content-type" in lowered
    assert "image/jpeg" in lowered
    assert "size cap" in lowered
    assert "writefile" not in lowered
    assert "appendfile" not in lowered
    assert "retry" not in lowered

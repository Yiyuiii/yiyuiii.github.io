from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_reviewed_pool_is_local_unique_and_large_enough_for_varied_rounds():
    data = yaml.safe_load(text("_data/moegirl_quiz.yml"))
    titles = [entry["title"] for entry in data["entries"]]

    assert data["api_endpoint"] == "https://zh.moegirl.org.cn/api.php"
    assert data["timeout_ms"] == 10000
    assert data["reviewed_on"] == "2026-08-02"
    assert len(titles) >= 12
    assert len(titles) == len(set(titles))
    assert all(title.strip() == title and title for title in titles)
    assert not any("http" in str(entry).lower() for entry in data["entries"])
    assert "Saber" not in titles
    assert "阿尔托莉雅·潘德拉贡" in titles
    for entry in data["entries"]:
        assert set(entry) <= {"title", "aliases"}
        assert set(entry) >= {"title"}
        assert all(
            isinstance(alias, str) and alias.strip()
            for alias in entry.get("aliases", [])
        )


def test_chinese_and_english_copy_have_the_same_complete_interface():
    data = yaml.safe_load(text("_data/moegirl_quiz.yml"))
    zh = data["copy"]["zh"]
    en = data["copy"]["en"]

    assert zh.keys() == en.keys()
    for key in ("correct", "incorrect", "source_label"):
        assert "{title}" in zh[key]
        assert "{title}" in en[key]
    assert "IP" in zh["privacy"] and "IP" in en["privacy"]
    assert "不请求图片" in zh["privacy"]
    assert "no cookies, storage, tracking, or images" in en["privacy"]
    assert "来源与署名" in zh["license"]
    assert "source and attribution" in en["license"]


def test_include_is_progressively_enhanced_and_discloses_remote_boundaries():
    include = text("_includes/toy-moegirl-quiz.liquid")

    assert "data-moegirl-quiz" in include
    assert "data-quiz-interactive hidden" in include
    assert "<noscript>" in include and "copy.no_js" in include
    assert "data-quiz-pool" in include and "quiz.entries | jsonify" in include
    assert "data-quiz-copy" in include and "copy | jsonify" in include
    assert "assets/js/moegirl-quiz.js" in include
    assert "data-quiz-clue" in include
    assert "data-quiz-clue-text" in include
    assert "data-quiz-image" not in include
    assert "<img" not in include
    assert 'referrerpolicy="no-referrer"' in include
    assert 'role="group"' in include
    assert 'aria-live="polite"' in include
    assert "copy.license" in include
    assert "creativecommons.org/licenses/by-nc-sa/3.0/" in include


def test_script_uses_one_metadata_fetch_without_tracking_or_unsafe_dom_html():
    script = text("assets/js/moegirl-quiz.js")

    assert script.count("await fetch(") == 1
    assert "crypto.getRandomValues" in script
    assert "sampleWithoutReplacement(entries, 4)" in script
    assert "referrerPolicy: \"no-referrer\"" in script
    assert "credentials: \"omit\"" in script
    assert "cache: \"no-store\"" in script
    assert "redirect: \"error\"" in script
    assert "AbortController" in script
    assert "API_HOST" in script and "API_PATH" in script
    assert 'prop: "extracts|info"' in script
    assert 'exintro: "1"' in script
    assert 'explaintext: "1"' in script
    assert "MAX_RESPONSE_CHARS" in script
    assert "anonymizeClue" in script
    assert "expandTitleFragments" in script
    assert "term.length >= 1" in script
    assert "textContent" in script and "replaceChildren" in script
    lowered = script.lower()
    assert "pageimages" not in lowered
    assert "thumbnail" not in lowered
    assert "image_hosts" not in lowered
    assert "math.random" not in lowered
    assert "localstorage" not in lowered
    assert "sessionstorage" not in lowered
    assert "document.cookie" not in lowered
    assert "innerhtml" not in lowered


def test_quiz_styles_are_scoped_responsive_and_theme_aware():
    css = text("assets/css/main.scss")
    component = css[css.index(".moegirl-quiz {") : css.index(".site-footer {")]

    assert 'html[data-theme="dark"] .moegirl-quiz' in component
    assert ".moegirl-quiz__clue" in component
    assert ".moegirl-quiz__clue-text" in component
    assert ".moegirl-quiz__figure" not in component
    assert "@media (max-width: 560px)" in component
    assert "grid-template-columns: minmax(0, 1fr)" in component
    assert "overflow-wrap: anywhere" in component
    assert "animation" not in component

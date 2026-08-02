from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def text(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def test_challenge_includes_are_bilingual_embeddable_components():
    selectors = {
        "_includes/toy-color-challenge.liquid": "data-toy-color-challenge",
        "_includes/toy-ten-second.liquid": "data-toy-ten-second",
        "_includes/toy-reaction-time.liquid": "data-toy-reaction-time",
    }
    for path, selector in selectors.items():
        include = text(path)
        assert "page.lang" in include
        assert selector in include
        assert "<noscript>" in include
        assert 'aria-live="polite"' in include
        assert 'aria-atomic="true"' in include
        assert "data-challenge-unavailable" in include
        assert "<h2" not in include and "<h3" not in include


def test_color_challenge_is_keyboard_native_and_non_diagnostic():
    include = text("_includes/toy-color-challenge.liquid")
    assert 'role="group"' in include
    assert "不是色觉检查或医学评估" in include
    assert "not a color-vision test or medical assessment" in include
    assert "data-color-grid" in include
    assert "data-color-next" in include


def test_timing_challenges_explain_local_one_attempt_results():
    ten_second = text("_includes/toy-ten-second.liquid")
    reaction = text("_includes/toy-reaction-time.liquid")
    assert "不会显示实时计时" in ten_second
    assert "no ranking or saved history" in ten_second
    assert "本设备上的本次尝试" in reaction
    assert "this attempt on this device" in reaction


def test_ten_second_does_not_require_randomness():
    include = text("_includes/toy-ten-second.liquid")
    script = text("assets/js/toy-challenges.js")
    assert "安全的本地随机源" not in include
    assert "Secure local randomness" not in include
    assert "prepareChallenge(root, false)" in script


def test_challenge_script_uses_only_the_shared_random_interface():
    script = text("assets/js/toy-challenges.js")
    assert "yiyuiiiToyRandom" in script
    assert "randomApi.intInclusive" in script
    assert "randomApi.uintBelow" in script
    assert "randomApi.pick" in script
    assert "Math" + ".random" not in script
    assert "crypto.getRandomValues" not in script


def test_challenge_script_has_no_network_or_persistence_surface():
    script = text("assets/js/toy-challenges.js")
    forbidden = (
        "fetch(",
        "XMLHttpRequest",
        "WebSocket",
        "localStorage",
        "sessionStorage",
        "document.cookie",
        "indexedDB",
    )
    for token in forbidden:
        assert token not in script


def test_timers_cancel_when_the_page_or_disclosure_is_hidden():
    script = text("assets/js/toy-challenges.js")
    assert "performance.now()" in script
    assert 'document.addEventListener("visibilitychange"' in script
    assert 'root.closest("details")' in script
    assert 'disclosure.addEventListener("toggle"' in script
    assert 'globalScope.addEventListener("pagehide"' in script
    assert "setInterval" not in script


def test_reaction_wait_is_bounded_and_early_press_is_explicit():
    script = text("assets/js/toy-challenges.js")
    assert "randomApi.intInclusive(1500, 4000)" in script
    assert 'phase: "tooSoon"' in script
    assert 'reactionTransition(state, "press"' in script


def test_color_challenge_has_three_progressive_difficulty_levels():
    script = text("assets/js/toy-challenges.js")
    include = text("_includes/toy-color-challenge.liquid")
    assert "COLOR_DELTAS = Object.freeze([12, 7, 4])" in script
    assert "streak / 2" in script
    assert '["easy","medium","hard"]' in include
    assert '["简单","适中","困难"]' in include

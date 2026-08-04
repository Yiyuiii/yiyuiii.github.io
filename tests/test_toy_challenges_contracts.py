from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def text(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def test_challenge_includes_are_bilingual_embeddable_components():
    selectors = {
        "_includes/toy-color-challenge.liquid": "data-toy-color-challenge",
        "_includes/toy-ten-second.liquid": "data-toy-ten-second",
        "_includes/toy-reaction-time.liquid": "data-toy-reaction-time",
        "_includes/toy-codebreaker.liquid": "data-toy-codebreaker",
        "_includes/toy-make-24.liquid": "data-toy-make-24",
        "_includes/toy-lights-out.liquid": "data-toy-lights-out",
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


def test_codebreaker_is_strict_local_and_keeps_leading_zeroes():
    include = text("_includes/toy-codebreaker.liquid")
    script = text("assets/js/toy-codebreaker.js")
    assert 'type="text"' in include
    assert 'inputmode="numeric"' in include
    assert "不会发送或保存" in include
    assert "Nothing is sent or stored" in include
    assert "每个匹配数字只会计入一类" in include
    assert "完全命中" in include
    assert "仅数字命中" in include
    assert "重置题目" in include
    assert "Reset puzzle" in include
    assert "换一个答案" not in include
    assert "位置正确 {exact}" not in include
    assert "数字正确 {misplaced}" not in include
    assert "candidateCount" in script
    assert "scoreGuess" in script
    assert "Math" + ".random" not in script
    for token in (
        "fetch(",
        "XMLHttpRequest",
        "WebSocket",
        "localStorage",
        "sessionStorage",
        "document.cookie",
        "indexedDB",
    ):
        assert token not in script


def test_make24_is_exact_local_and_exposes_reversible_controls():
    include = text("_includes/toy-make-24.liquid")
    script = text("assets/js/toy-make-24.js")
    assert "四个数都要恰好使用一次" in include
    assert "Use all four numbers exactly once" in include
    assert "整数过程" in include and "需要分数" in include
    assert "Integer path" in include and "Fractions required" in include
    assert "data-make24-undo" in include
    assert "data-make24-reset" in include
    assert "data-make24-new" in include
    assert 'data-make24-prompt aria-live="polite"' in include
    assert 'aria-describedby="make24-prompt"' in include
    assert "fractionRequired.length !== 10" in script
    assert "positiveIntegerOnly" in script
    assert "Math" + ".random" not in script
    for token in (
        "fetch(",
        "XMLHttpRequest",
        "WebSocket",
        "localStorage",
        "sessionStorage",
        "document.cookie",
        "indexedDB",
    ):
        assert token not in script


def test_lights_out_is_exact_local_and_has_redundant_grid_semantics():
    include = text("_includes/toy-lights-out.liquid")
    script = text("assets/js/toy-lights-out.js")
    assert 'role="grid"' in include
    assert 'setAttribute("role", "row")' in script
    assert '"gridcell"' in script
    assert '"aria-rowindex"' in script and '"aria-colindex"' in script
    assert "ArrowLeft" in script and "ArrowRight" in script
    assert "ArrowUp" in script and "ArrowDown" in script
    assert 'event.key === "Enter" || event.key === " "' in script
    assert "●" in script and "○" in script
    assert "copy.lightOn" in script and "copy.lightOff" in script
    assert "data-lights-undo" in include
    assert "data-lights-reset" in include
    assert "data-lights-new" in include
    assert "Math" + ".random" not in script
    for token in (
        "fetch(",
        "XMLHttpRequest",
        "WebSocket",
        "localStorage",
        "sessionStorage",
        "document.cookie",
        "indexedDB",
    ):
        assert token not in script


def test_timing_challenges_explain_bounded_local_history():
    ten_second = text("_includes/toy-ten-second.liquid")
    reaction = text("_includes/toy-reaction-time.liquid")
    assert "不会显示实时计时" in ten_second
    assert "最多保存 100 次完成记录" in ten_second
    assert "Up to 100 completed attempts" in ten_second
    assert "最多保存 100 次完成记录" in reaction
    assert "Up to 100 completed attempts" in reaction
    for include in (ten_second, reaction):
        assert "data-challenge-history" in include
        assert "data-history-chart" in include
        assert "data-history-table-body" in include
        assert "data-history-confirm-clear" in include
        assert "data-history-clear-status" in include


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


def test_timing_history_has_no_network_and_only_two_bounded_storage_keys():
    script = text("assets/js/toy-challenges.js")
    history = text("assets/js/toy-challenge-history.js")
    combined = script + history
    forbidden = (
        "fetch(",
        "XMLHttpRequest",
        "WebSocket",
        "sessionStorage",
        "document.cookie",
        "indexedDB",
    )
    for token in forbidden:
        assert token not in combined
    assert 'key: "yiyuiii.toy.ten-second.v1"' in history
    assert 'key: "yiyuiii.toy.reaction-time.v1"' in history
    assert "HISTORY_LIMIT = 100" in history
    assert "Math.round" in history
    assert "localStorage.clear" not in combined
    assert "innerHTML" not in history
    assert "createElementNS" in history
    assert 'svgNode("title"' in history
    assert 'svgNode("desc"' in history
    assert 'role: "img"' in history
    assert 'focusable: "false"' in history


def test_timers_cancel_when_the_page_or_disclosure_is_hidden():
    script = text("assets/js/toy-challenges.js")
    assert "performance.now()" in script
    assert 'document.addEventListener("visibilitychange"' in script
    assert 'root.closest("details")' in script
    assert 'disclosure.addEventListener("toggle"' in script
    assert 'globalScope.addEventListener("pagehide"' in script
    assert "requestAnimationFrame" in script
    assert "cancelAnimationFrame" in script
    assert "setInterval" not in script


def test_reaction_wait_is_bounded_and_early_press_is_explicit():
    script = text("assets/js/toy-challenges.js")
    assert "randomApi.intInclusive(1500, 4000)" in script
    assert 'phase: "tooSoon"' in script
    assert 'reactionTransition(state, "press"' in script


def test_color_challenge_uses_the_twenty_five_level_specialist_runtime():
    script = text("assets/js/toy-color-challenge.js")
    include = text("_includes/toy-color-challenge.liquid")
    assert "const LEVEL_COUNT = 25" in script
    assert "const START_LEVEL = 8" in script
    assert "const BLOCK_SIZE = 3" in script
    assert "const point = correct ? 1 : -1" in script
    assert "rgb8ToOklab" in script
    assert "oklchToOklab" in script
    assert "createRoundScheduler" in script
    assert "CURVE_ENDPOINTS" in script
    assert "每三题结算一次" in include
    assert "Each set contains three questions" in include
    assert "dataset.colorChallengeReady" in script
    assert "COLOR_DELTAS" not in script

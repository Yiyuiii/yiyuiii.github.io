from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "assets/js/toy-color-challenge.js"
INCLUDE = ROOT / "_includes/toy-color-challenge.liquid"
INDEX = ROOT / "_includes/toy-index.liquid"


def test_color_challenge_owns_its_new_specialist_runtime():
    include = INCLUDE.read_text(encoding="utf-8")
    index = INDEX.read_text(encoding="utf-8")
    assert 'data-toy-color-challenge' in include
    assert "/assets/js/toy-color-challenge.js" in index
    assert 'data-challenge-ready="true"' not in include
    assert 'data-color-challenge-ready' not in include


def test_color_challenge_copy_and_statistics_are_fully_bilingual():
    include = INCLUDE.read_text(encoding="utf-8")
    for phrase in (
        "每三题结算一次",
        "积分可以为负",
        "玩法设置",
        "明暗、鲜淡与色相",
        "中性灰",
        "Each set contains three questions",
        "the score may be negative",
        "Play settings",
        "lightness, chroma, and hue",
        "neutral gray",
        "不是色觉检查或医学评估",
        "not a color-vision test or medical assessment",
    ):
        assert phrase in include

    for selector in (
        "data-color-score",
        "data-color-level",
        "data-color-block",
        "data-color-difference",
        "data-color-answered",
        "data-color-record",
        "data-color-streak",
        "data-color-highest",
        "data-color-extreme",
        "data-color-foundation",
    ):
        assert selector in include
    assert 'class="toy-color-challenge__stats toy-color-challenge__stats--primary"' in include
    assert 'class="toy-color-challenge__more"' in include
    assert 'class="toy-color-challenge__stats toy-color-challenge__stats--secondary"' in include
    assert "更多统计" in include
    assert "More statistics" in include
    for selector in (
        "data-color-settings",
        "data-color-settings-summary",
        "data-color-preset",
        "data-color-variation",
        "data-color-hue-scope",
        "data-color-hue-sector",
        "data-color-neutral",
        "data-color-progression",
        "data-color-fixed-level",
        "data-color-apply",
    ):
        assert selector in include
    assert 'aria-live="polite"' in include
    assert 'aria-atomic="true"' in include
    assert '<noscript>' in include


def test_color_challenge_runtime_has_typed_curves_and_quantized_validation():
    script = SCRIPT.read_text(encoding="utf-8")
    assert "const LEVEL_COUNT = 25" in script
    assert "const START_LEVEL = 8" in script
    assert "const MID_LIGHTNESS_MIN = 0.52" in script
    assert "const MID_LIGHTNESS_MAX = 0.68" in script
    assert 'const VARIATIONS = Object.freeze(["lightness", "chroma", "hue"])' in script
    assert "const CURVE_ENDPOINTS" in script
    assert "easy: 0.28, hard: 0.004" in script
    assert "easy: 0.07, hard: 0.0045" in script
    assert "easy: 0.06, hard: 0.005" in script
    assert "maxChromaFor" in script
    assert "pairAnalysis" in script
    assert "directionThreshold" in script
    assert "createRoundScheduler" in script
    assert "createShuffleBag" in script
    assert "verifiedFallback" in script
    assert "rgb8ToOklab" in script
    assert "actualDelta" in script
    assert "normalRgb: Object.freeze([0, 0, 0])" not in script
    assert "Math.max(...channelDifferences) === 1" not in script


def test_color_challenge_stays_local_and_uses_only_the_shared_random_api():
    script = SCRIPT.read_text(encoding="utf-8")
    assert "yiyuiiiToyRandom" in script
    assert "randomApi.intInclusive" in script
    assert "randomApi.uintBelow" in script
    assert "randomApi.pick" in script
    for forbidden in (
        "Math" + ".random",
        "crypto.getRandomValues",
        "fetch(",
        "XMLHttpRequest",
        "WebSocket",
        "localStorage",
        "sessionStorage",
        "document.cookie",
        "indexedDB",
    ):
        assert forbidden not in script


def test_color_challenge_scoring_and_three_question_settlement_are_explicit():
    script = SCRIPT.read_text(encoding="utf-8")
    assert "const BLOCK_SIZE = 3" in script
    assert "const point = correct ? 1 : -1" in script
    assert "blockScore > 0 ? 1 : -1" in script
    assert 'kind = "extreme"' in script
    assert 'kind = "foundation"' in script
    assert "extremeClears += 1" in script
    assert "foundationRetries += 1" in script
    assert 'let kind = "fixed"' in script


def test_color_settings_are_staged_local_and_not_persisted():
    script = SCRIPT.read_text(encoding="utf-8")
    assert "readDraftConfig" in script
    assert "setDraftConfig" in script
    assert "Apply" not in script  # visible copy remains in the bilingual include
    assert "state = createInitialColorState(config)" in script
    assert "scheduler = createRoundScheduler(randomApi, config)" in script

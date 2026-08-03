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
        "单码极限无尽模式",
        "Each set contains three questions",
        "the score may be negative",
        "single-code endless mode",
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
    assert 'aria-live="polite"' in include
    assert 'aria-atomic="true"' in include
    assert '<noscript>' in include


def test_color_challenge_runtime_has_the_required_levels_and_endpoints():
    script = SCRIPT.read_text(encoding="utf-8")
    assert "const LEVEL_COUNT = 25" in script
    assert "const START_LEVEL = 8" in script
    assert "normalRgb: Object.freeze([0, 0, 0])" in script
    assert "oddRgb: Object.freeze([255, 255, 255])" in script
    assert "randomApi.pick([0, 2])" in script
    assert "Math.max(...channelDifferences) === 1" in script
    assert "level <= 19" in script
    assert "createIntegerNeighbourPair" in script
    assert "verifiedFallback" in script
    assert "rgb8ToOklab" in script
    assert "actualDelta" in script


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

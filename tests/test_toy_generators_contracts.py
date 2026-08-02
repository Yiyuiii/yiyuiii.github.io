from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_generator_copy_is_complete_bilingual_and_has_no_name_generator():
    data = yaml.safe_load(text("_data/toy_generators.yml"))

    assert set(data) == {"password", "number"}
    for component in data.values():
        assert set(component) == {"zh", "en"}
        assert component["zh"].keys() == component["en"].keys()
        assert all(
            isinstance(value, str) and value.strip()
            for language in component.values()
            for value in language.values()
        )


def test_secure_random_utility_uses_rejection_sampling_without_a_weak_fallback():
    script = text("assets/js/toy-random.js")

    assert "crypto.getRandomValues" in script
    assert "0x20_0000_0000_0000" in script
    assert "acceptedRange" in script
    assert "sample >= acceptedRange" in script
    assert "Number.isSafeInteger" in script
    assert "Math.random" not in script
    assert "localStorage" not in script
    assert "sessionStorage" not in script
    assert "fetch(" not in script


def test_password_generator_is_local_conditioned_and_never_announces_the_secret():
    include = text("_includes/toy-random-password.liquid")
    script = text("assets/js/toy-generators.js")

    assert "data-toy-random-password" in include
    assert 'type="password"' in include
    assert 'autocomplete="off"' in include
    assert "<noscript>" in include
    assert "data-generator-interactive hidden" in include
    assert 'type="submit" data-password-generate' in include
    assert "groups.every" in script
    assert "MAX_PASSWORD_ATTEMPTS" in script
    assert "navigator.clipboard.writeText" in script
    assert "status.textContent = copy.generated" not in script
    assert "output.value = password" in script
    lowered = script.lower()
    for forbidden in (
        "math.random",
        "fetch(",
        "xmlhttprequest",
        "sendbeacon",
        "websocket",
        "localstorage",
        "sessionstorage",
        "document.cookie",
    ):
        assert forbidden not in lowered


def test_number_generator_supports_safe_unique_sampling_without_large_range_arrays():
    include = text("_includes/toy-random-number.liquid")
    script = text("assets/js/toy-generators.js")

    assert "data-toy-random-number" in include
    assert "data-number-unique" in include
    assert "data-number-sort" in include
    assert 'data-minimum="0" data-maximum="1"' in include
    assert 'data-minimum="1" data-maximum="6"' in include
    assert 'data-minimum="1" data-maximum="20"' in include
    assert "data-generator-interactive hidden" in include
    assert 'type="submit" data-number-generate' in include
    assert "sampleUniqueOffsets" in script
    assert "new Set()" in script
    assert "swapIndex = random.uintBelow(index + 1)" in script
    assert "Number.isSafeInteger(span)" in script
    assert "Array.from({ length: span" not in script


def test_generators_use_native_submit_and_reveal_controls_only_after_initialization():
    script = text("assets/js/toy-generators.js")

    assert script.count('root.addEventListener("submit"') == 2
    assert script.count("interactive.hidden = false") == 2
    assert 'generateButton.addEventListener("click"' not in script

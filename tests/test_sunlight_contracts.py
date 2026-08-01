from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_sunlight_copy_is_parallel_and_describes_action_and_status():
    data = yaml.safe_load(text("_data/site_text.yml"))

    assert data["zh"]["sunlight"] == {
        "enable": "开启阳光背景",
        "disable": "关闭阳光背景",
        "status_on": "阳光背景已开启",
        "status_off": "阳光背景已关闭",
    }
    assert data["en"]["sunlight"] == {
        "enable": "Turn on the sunlight background",
        "disable": "Turn off the sunlight background",
        "status_on": "Sunlight background is on",
        "status_off": "Sunlight background is off",
    }


def test_header_places_a_real_progressive_sunlight_control_between_actions():
    header = text("_includes/header.liquid")

    search = header.index('id="search-toggle"')
    sunlight = header.index('id="sunlight-toggle"')
    language = header.index('class="language-switch"')

    assert search < sunlight < language
    assert 'type="button"' in header[sunlight:language]
    assert 'class="icon-button sunlight-toggle"' in header[sunlight:language]
    assert "hidden" in header[sunlight:language]
    assert 'aria-pressed="true"' in header[sunlight:language]
    assert 'aria-label="{{ text.sunlight.disable }}"' in header[sunlight:language]
    assert "text.sunlight.enable" in header[sunlight:language]
    assert "text.sunlight.disable" in header[sunlight:language]
    assert "text.sunlight.status_on" in header[sunlight:language]
    assert "text.sunlight.status_off" in header[sunlight:language]
    assert 'id="sunlight-status"' in header
    assert 'aria-live="polite"' in header


def test_head_preinitializes_only_normal_pages_without_tracking_or_networking():
    head = text("_includes/head.liquid")
    preinit = head[head.index("sunlight.v1") - 300 : head.index("sunlight.v1") + 700]

    assert "page.layout != 'not-found'" in head
    assert "yiyuiii.sunlight.v1" in preinit
    assert 'saved === "on" || saved === "off"' in preinit
    assert 'dataset.sunlight = saved === "off" ? "off" : "on"' in preinit
    assert "localStorage.getItem" in preinit
    assert "localStorage.setItem" not in preinit
    for forbidden in ("fetch(", "XMLHttpRequest", "cookie", "sendBeacon"):
        assert forbidden not in preinit


def test_sunlight_script_is_independent_strict_and_progressively_enhanced():
    layout = text("_layouts/default.liquid")
    script = text("assets/js/sunlight.js")

    assert "sunlight.js" in layout
    assert layout.index("sunlight.js") > layout.index("site-search.js")
    assert "yiyuiii.sunlight.v1" in script
    assert 'saved === "on" || saved === "off"' in script
    assert 'localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off")' in script
    assert "button.hidden = false" in script
    assert "aria-pressed" in script
    assert "status.textContent" in script
    for forbidden in ("fetch(", "XMLHttpRequest", "document.cookie", "sendBeacon"):
        assert forbidden not in script


def test_sunlight_visual_layer_is_static_aligned_and_non_interactive():
    css = text("assets/css/main.scss")
    body = css[css.index("body {") : css.index("a {")]
    sunlight = css[css.index("body::before") : css.index("a {")]

    assert "--sunlight-x" in css
    assert "--sunlight-y" in css
    assert "68rem" in css
    assert "2.125rem" in css
    assert "1.125rem" in css
    assert "repeating-conic-gradient" in sunlight
    assert "radial-gradient" in sunlight
    assert "58rem" in sunlight
    assert "mask-image" in sunlight
    assert "pointer-events: none" in sunlight
    assert 'html[data-sunlight="off"] body::before' in css
    assert ".not-found-page::before" in css
    assert "rgba(102, 89, 150" not in body
    assert "rgba(51, 122, 112, 0.03)" in body
    for forbidden in ("animation:", "filter:", "url("):
        assert forbidden not in sunlight


def test_sunlight_button_has_clear_on_and_off_states_without_motion():
    css = text("assets/css/main.scss")
    control = css[css.index(".sunlight-toggle") : css.index(".icon-button svg")]

    assert '.sunlight-toggle[aria-pressed="true"]' in control
    assert '.sunlight-toggle[aria-pressed="false"]' in control
    assert "animation" not in control
    assert "transition" not in control


def test_404_layout_does_not_expose_or_load_the_sunlight_control():
    not_found = text("_layouts/not-found.liquid")

    assert "sunlight-toggle" not in not_found
    assert "sunlight.js" not in not_found


def test_welcome_guide_keeps_the_single_sunlight_mapping():
    home = yaml.safe_load(text("_data/home.yml"))

    for language in ("zh", "en"):
        targets = [item["target"] for item in home[language]["guide"]["items"]]
        assert targets.count("sunlight") == 1

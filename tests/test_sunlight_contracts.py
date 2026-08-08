from pathlib import Path

import yaml

from scss_source import aggregate_scss_source


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def main_scss():
    return aggregate_scss_source(
        ROOT / "assets" / "css" / "main.scss",
        load_paths=(ROOT / "_sass",),
    )


def test_ambient_copy_is_parallel_and_names_sunlight_and_moonlight():
    data = yaml.safe_load(text("_data/site_text.yml"))

    assert data["zh"]["sunlight"] == {
        "enable_light": "开启日光背景",
        "disable_light": "关闭日光背景",
        "status_light_on": "日光背景已开启",
        "status_light_off": "日光背景已关闭",
        "enable_dark": "开启月光背景",
        "disable_dark": "关闭月光背景",
        "status_dark_on": "月光背景已开启",
        "status_dark_off": "月光背景已关闭",
    }
    assert data["en"]["sunlight"] == {
        "enable_light": "Turn on the sunlight background",
        "disable_light": "Turn off the sunlight background",
        "status_light_on": "Sunlight background is on",
        "status_light_off": "Sunlight background is off",
        "enable_dark": "Turn on the moonlight background",
        "disable_dark": "Turn off the moonlight background",
        "status_dark_on": "Moonlight background is on",
        "status_dark_off": "Moonlight background is off",
    }


def test_avatar_is_a_progressive_ambient_control_with_home_fallback():
    header = text("_includes/header.liquid")

    fallback = header.index('id="sunlight-fallback-link"')
    sunlight = header.index('id="sunlight-toggle"')
    brand_name = header.index('class="site-brand__name"')
    navigation = header.index('<nav class="site-nav"')

    assert fallback < sunlight < brand_name < navigation
    assert 'href="{{ text.urls.home | relative_url }}"' in header[fallback:sunlight]
    assert 'aria-label="{{ text.home_link }}"' in header[fallback:sunlight]
    assert 'type="button"' in header[sunlight:brand_name]
    assert 'class="site-brand__avatar-toggle"' in header[sunlight:brand_name]
    assert "hidden" in header[sunlight:brand_name]
    assert 'aria-pressed="true"' in header[sunlight:brand_name]
    assert "text.sunlight.enable_light" in header[sunlight:brand_name]
    assert "text.sunlight.disable_light" in header[sunlight:brand_name]
    assert "text.sunlight.enable_dark" in header[sunlight:brand_name]
    assert "text.sunlight.disable_dark" in header[sunlight:brand_name]
    assert 'href="{{ text.urls.home | relative_url }}"' in header[brand_name:navigation]
    assert 'id="sunlight-status"' in header
    assert 'aria-live="polite"' in header


def test_head_preinitializes_two_strict_independent_preferences_only_on_normal_pages():
    head = text("_includes/head.liquid")
    preinit = head[head.index("{% if page.layout != 'not-found' %}") : head.index("{% endif %}", head.index("{% if page.layout != 'not-found' %}"))]

    assert "yiyuiii.sunlight.v1" in preinit
    assert "yiyuiii.theme.v1" in preinit
    assert 'sunlight === "on" || sunlight === "off"' in preinit
    assert 'theme === "light" || theme === "dark"' in preinit
    assert "dataset.sunlight = sunlight" in preinit
    assert "dataset.theme = theme" in preinit
    assert preinit.count("localStorage.getItem") == 2
    assert "localStorage.setItem" not in preinit
    for forbidden in ("fetch(", "XMLHttpRequest", "cookie", "sendBeacon"):
        assert forbidden not in preinit


def test_ambient_script_uses_only_its_own_strict_preference_and_progressive_swap():
    layout = text("_layouts/default.liquid")
    script = text("assets/js/sunlight.js")

    assert layout.index("theme.js") < layout.index("sunlight.js")
    assert "yiyuiii.sunlight.v1" in script
    assert "yiyuiii.theme.v1" not in script
    assert 'saved === "on" || saved === "off"' in script
    assert 'localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off")' in script
    assert "fallbackLink.hidden = true" in script
    assert "button.hidden = false" in script
    assert "yiyuiii:themechange" in script
    assert "aria-pressed" in script
    assert "status.textContent" in script
    for forbidden in ("fetch(", "XMLHttpRequest", "document.cookie", "sendBeacon"):
        assert forbidden not in script


def test_ambient_visuals_are_aligned_animated_and_theme_specific():
    css = main_scss()
    celestial = css[css.index("body::before") : css.index("a {")]
    dark = css[css.index('html[data-theme="dark"]') : css.index("*,")]

    assert "--sunlight-x" in css and "--sunlight-y" in css
    assert "--celestial-ray-radius: clamp(21rem, 58vw, 46rem)" in css
    assert "--celestial-ray-diameter: clamp(42rem, 116vw, 92rem)" in css
    assert "68rem" in css and "2.125rem" in css and "1.125rem" in css
    assert "body::before" in celestial and "body::after" in celestial
    assert "radial-gradient" in celestial
    assert "repeating-conic-gradient" in celestial
    assert "var(--celestial-halo)" in celestial
    assert "var(--celestial-ray-width)" in celestial
    assert "var(--celestial-ray-cycle)" in celestial
    assert "width: var(--celestial-ray-diameter)" in celestial
    assert "transparent var(--celestial-ray-radius)" in celestial
    assert "animation: celestial-rays-turn 360s linear infinite" in celestial
    assert "pointer-events: none" in celestial
    assert 'html[data-sunlight="off"] body::before' in celestial
    assert 'html[data-sunlight="off"] body::after' in celestial
    assert ".not-found-page::before" in celestial
    assert ".not-found-page::after" in celestial
    assert "rgba(184, 217, 245, 0.06)" in dark
    assert "--celestial-ray-width: 0.72deg" in dark
    assert "--celestial-ray-cycle: 15deg" in dark


def test_reduced_motion_stops_rotation_but_keeps_static_ambient_layers():
    css = main_scss()
    reduced = css[css.index("@media (prefers-reduced-motion: reduce)") :]

    assert "body::after" in reduced
    assert "animation: none !important" in reduced
    assert "content: none" not in reduced


def test_404_layout_exposes_neither_theme_nor_ambient_controls_or_scripts():
    not_found = text("_layouts/not-found.liquid")

    for forbidden in (
        "sunlight-toggle",
        "sunlight.js",
        "theme-toggle",
        "theme.js",
        "data-theme",
        "data-sunlight",
    ):
        assert forbidden not in not_found


def test_welcome_guide_maps_avatar_and_theme_actions_once_per_language():
    home = yaml.safe_load(text("_data/home.yml"))

    for language in ("zh", "en"):
        targets = [item["target"] for item in home[language]["guide"]["items"]]
        assert targets == ["sunlight", "navigation", "search", "language", "theme"]

from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_theme_copy_is_parallel_and_describes_next_action_and_status():
    data = yaml.safe_load(text("_data/site_text.yml"))

    assert data["zh"]["theme"] == {
        "enable_light": "切换到明亮样式",
        "enable_dark": "切换到夜晚样式",
        "status_light": "已切换到明亮样式",
        "status_dark": "已切换到夜晚样式",
    }
    assert data["en"]["theme"] == {
        "enable_light": "Switch to the light appearance",
        "enable_dark": "Switch to the night appearance",
        "status_light": "Light appearance is on",
        "status_dark": "Night appearance is on",
    }


def test_header_action_order_and_progressive_theme_control_are_explicit():
    header = text("_includes/header.liquid")

    search = header.index('id="search-toggle"')
    theme = header.index('id="theme-toggle"')
    language = header.index('class="language-switch"')

    assert search < theme < language
    control = header[theme:language]
    assert 'class="icon-button theme-toggle"' in control
    assert 'type="button"' in control
    assert 'aria-pressed="false"' in control
    assert 'aria-label="{{ text.theme.enable_dark }}"' in control
    assert "hidden" in control
    assert "theme-toggle__sun" in control
    assert "theme-toggle__moon" in control
    assert "text.theme.enable_light" in control
    assert "text.theme.enable_dark" in control
    assert 'id="theme-status"' in header


def test_theme_script_is_strict_independent_persistent_and_announces_changes():
    layout = text("_layouts/default.liquid")
    script = text("assets/js/theme.js")

    assert "theme.js" in layout
    assert "yiyuiii.theme.v1" in script
    assert "yiyuiii.sunlight.v1" not in script
    assert 'saved === "light" || saved === "dark"' in script
    assert "localStorage.setItem(STORAGE_KEY, nextTheme)" in script
    assert "root.dataset.theme" in script
    assert "button.hidden = false" in script
    assert "aria-pressed" in script
    assert "status.textContent" in script
    assert 'new CustomEvent("yiyuiii:themechange"' in script
    assert "rerenderMermaid" in script
    assert 'theme === "dark" ? "dark" : "default"' in script
    assert "code.language-mermaid" in script
    assert "window.mermaid.run" in script
    for forbidden in ("fetch(", "XMLHttpRequest", "document.cookie", "sendBeacon"):
        assert forbidden not in script


def test_custom_theme_owns_dynamic_compatibility_without_enabling_upstream_toggle():
    config = yaml.safe_load(text("_config.yml"))
    layout = text("_layouts/default.liquid")
    compatibility = text("assets/js/theme-compat.js")

    assert config["enable_darkmode"] is False
    assert layout.index("theme-compat.js") < layout.index("scripts.liquid")
    assert "window.determineComputedTheme" in compatibility
    assert 'dataset.theme === "dark" ? "dark" : "light"' in compatibility


def test_dark_palette_changes_color_scheme_and_keeps_search_input_readable():
    css = text("assets/css/main.scss")
    dark = css[css.index('html[data-theme="dark"]') : css.index("*,")]
    search = css[css.index("#site-search-input {") : css.index(".search-status")]

    assert "color-scheme: dark" in dark
    for variable in (
        "--page",
        "--surface",
        "--ink",
        "--body",
        "--muted",
        "--divider",
        "--focus",
        "--global-code-bg-color",
    ):
        assert variable in dark
    assert "background: var(--page)" in search
    assert "background: white" not in search
    assert "#site-search-input::placeholder" in search

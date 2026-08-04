import json
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_giscus_uses_stable_github_discussions_ids_and_pathname_mapping():
    config = yaml.safe_load(text("_config.yml"))["giscus"]

    assert config == {
        "repo": "Yiyuiii/yiyuiii.github.io",
        "repo_id": "MDEwOlJlcG9zaXRvcnk0MDY0MTE1MTM=",
        "category": "Announcements",
        "category_id": "DIC_kwDOGDlY-c4DCk8v",
        "mapping": "pathname",
        "strict": 1,
        "reactions_enabled": 1,
        "input_position": "bottom",
        "dark_theme": "dark",
        "light_theme": "light",
        "emit_metadata": 0,
    }


def test_giscus_embedding_is_restricted_to_production_and_local_preview_origins():
    policy = json.loads(text("giscus.json"))

    assert policy == {
        "origins": ["https://yiyuiii.github.io"],
        "originsRegex": [r"^http://(localhost|127\.0\.0\.1):[0-9]+$"],
        "defaultCommentOrder": "oldest",
    }


def test_comment_copy_is_complete_parallel_and_explicit_about_public_loading():
    data = yaml.safe_load(text("_data/site_text.yml"))
    zh = data["zh"]["comments"]
    en = data["en"]["comments"]

    assert zh.keys() == en.keys()
    assert set(zh) == {
        "heading",
        "introduction",
        "load",
        "loading",
        "retry",
        "error",
        "direct_link",
        "no_script",
    }
    assert "公开" in zh["introduction"] and "public" in en["introduction"]
    assert "当前页面路径" in zh["introduction"] and "current page path" in en["introduction"]
    for copy in (zh, en):
        assert "GitHub Discussions" in copy["introduction"]
        assert "giscus.app" in copy["introduction"]


def test_comment_include_is_static_until_the_reader_explicitly_loads_it():
    include = text("_includes/page-comments.liquid")

    assert include.count("data-page-comments") == 1
    assert "site.data.site_text[comments_lang].comments" in include
    assert "data-comments-load hidden" in include
    assert "data-comments-thread hidden" in include
    assert "data-giscus-lang=\"{{ giscus_lang }}\"" in include
    assert "site.giscus.repo_id" in include
    assert "site.giscus.category_id" in include
    assert "discussions/categories/" in include
    assert 'rel="external nofollow noopener noreferrer"' in include
    assert 'referrerpolicy="no-referrer"' in include
    assert "<noscript>" in include
    lowered = include.lower()
    assert "<script" not in lowered
    assert "<iframe" not in lowered


def test_default_layout_places_comments_after_feedback_and_excludes_noncanonical_layouts():
    layout = text("_layouts/default.liquid")
    not_found = text("_layouts/not-found.liquid")

    assert layout.count("include page-comments.liquid") == 1
    assert layout.count("assets/js/page-comments.js") == 1
    assert "{% unless page.redirect %}" in layout
    assert layout.index("include page-feedback.liquid") < layout.index("include page-comments.liquid")
    assert layout.index("include page-comments.liquid") < layout.index("include footer.liquid")
    assert "include page-comments.liquid" not in not_found
    assert "assets/js/page-comments.js" not in not_found


def test_comment_loader_uses_one_click_giscus_config_retry_and_theme_sync():
    script = text("assets/js/page-comments.js")

    assert 'const GISCUS_ORIGIN = "https://giscus.app"' in script
    assert 'script.src = `${GISCUS_ORIGIN}/client.js`' in script
    assert 'button.addEventListener("click", load)' in script
    assert 'root.dataset.state === "loading"' in script
    assert 'root.dataset.state === "loaded"' in script
    assert 'script.addEventListener("error"' in script
    assert 'window.addEventListener("yiyuiii:themechange"' in script
    assert "setConfig: { theme: currentTheme(root) }" in script
    assert 'script.dataset.lang = root.dataset.giscusLang' in script
    assert 'script.dataset.mapping = root.dataset.mapping' in script
    assert "fetch(" not in script.lower()
    assert "localstorage" not in script.lower()
    assert "document.cookie" not in script.lower()


def test_canonical_metadata_provides_a_stable_giscus_backlink():
    seo = text("_includes/bilingual-seo.liquid")

    assert '<meta name="giscus:backlink" content="{{ canonical_absolute }}">' in seo

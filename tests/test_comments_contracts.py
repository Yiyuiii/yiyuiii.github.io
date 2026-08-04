import json
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_giscus_uses_stable_ids_pathname_mapping_and_official_themes():
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
        "introduction_before",
        "direct_link",
        "introduction_after",
        "load",
        "auto_load",
        "auto_load_enabled",
        "auto_load_disabled",
        "auto_load_unavailable",
        "loading",
        "retry",
        "error",
        "no_script",
    }
    assert "公开" in zh["introduction_before"] and "public" in en["introduction_before"]
    assert "当前页面路径" in zh["introduction_after"] and "current page path" in en["introduction_after"]
    assert zh["auto_load"] == "在本站自动加载评论"
    assert en["auto_load"] == "Auto-load comments on this site"
    for copy in (zh, en):
        assert copy["direct_link"] == "GitHub Discussions"
        assert "giscus.app" in copy["introduction_after"]


def test_comment_include_is_static_until_the_reader_explicitly_loads_it():
    include = text("_includes/page-comments.liquid")

    assert include.count("data-page-comments") == 1
    assert "site.data.site_text[comments_lang].comments" in include
    assert "data-comments-load hidden" in include
    assert "data-comments-auto-option hidden" in include
    assert "data-comments-auto-load" in include
    assert 'for="{{ auto_load_id }}"' in include
    assert "auto_load_description" not in include
    assert "page-comments__auto-load-description" not in include
    assert "data-comments-thread hidden" in include
    assert "data-giscus-lang=\"{{ giscus_lang }}\"" in include
    assert "site.giscus.repo_id" in include
    assert "site.giscus.category_id" in include
    assert "discussions/categories/" in include
    assert "&#32;<a" in include
    assert include.index('class="page-comments__introduction"') < include.index("data-comments-direct")
    assert include.index("data-comments-direct") < include.index('class="page-comments__actions"')
    assert 'rel="external nofollow noopener noreferrer"' in include
    assert 'referrerpolicy="no-referrer"' in include
    assert "<noscript>" in include
    lowered = include.lower()
    assert "<script" not in lowered
    assert "<iframe" not in lowered


def test_default_layout_uses_comments_as_the_only_post_content_module():
    layout = text("_layouts/default.liquid")
    post_layout = text("_layouts/post.liquid")
    not_found = text("_layouts/not-found.liquid")

    assert layout.count("include page-comments.liquid") == 1
    assert post_layout.count("include page-comments.liquid") == 1
    assert layout.count("assets/js/page-comments.js") == 1
    assert "{% unless page.redirect %}" in layout
    assert "{% unless page.layout == 'post' %}" in layout
    assert post_layout.index("</article>") < post_layout.index(
        "include page-comments.liquid"
    )
    assert post_layout.index("include page-comments.liquid") < post_layout.rindex(
        "</div>"
    )
    assert "include page-feedback.liquid" not in layout
    assert layout.index("include page-comments.liquid") < layout.index("include footer.liquid")
    assert "include page-comments.liquid" not in not_found
    assert "include page-feedback.liquid" not in not_found
    assert "assets/js/page-comments.js" not in not_found


def test_retired_page_feedback_module_has_no_dead_site_copy_or_include():
    data = yaml.safe_load(text("_data/site_text.yml"))

    assert "feedback" not in data["zh"]
    assert "feedback" not in data["en"]
    assert not (ROOT / "_includes/page-feedback.liquid").exists()


def test_comment_loader_uses_explicit_minimal_auto_load_preference_and_theme_sync():
    script = text("assets/js/page-comments.js")

    assert 'const GISCUS_ORIGIN = "https://giscus.app"' in script
    assert 'const AUTO_LOAD_STORAGE_KEY = "yiyuiii.comments.v1"' in script
    assert 'const AUTO_LOAD_STORAGE_VALUE = "auto"' in script
    assert 'script.src = `${GISCUS_ORIGIN}/client.js`' in script
    assert 'button.addEventListener("click", load)' in script
    assert 'autoLoad.addEventListener("change"' in script
    assert 'localStorage.getItem(AUTO_LOAD_STORAGE_KEY)' in script
    assert 'localStorage.setItem(AUTO_LOAD_STORAGE_KEY, AUTO_LOAD_STORAGE_VALUE)' in script
    assert 'localStorage.removeItem(AUTO_LOAD_STORAGE_KEY)' in script
    assert 'window.addEventListener("storage"' in script
    assert "if (autoLoad.checked) load();" in script
    assert 'root.dataset.state === "loading"' in script
    assert 'root.dataset.state === "loaded"' in script
    assert 'script.addEventListener("error"' in script
    assert 'window.addEventListener("yiyuiii:themechange"' in script
    assert "setConfig: { theme: currentTheme(root) }" in script
    assert 'script.dataset.lang = root.dataset.giscusLang' in script
    assert 'script.dataset.mapping = root.dataset.mapping' in script
    assert "fetch(" not in script.lower()
    assert "sessionstorage" not in script.lower()
    assert "document.cookie" not in script.lower()


def test_canonical_metadata_provides_a_stable_giscus_backlink():
    seo = text("_includes/bilingual-seo.liquid")

    assert '<meta name="giscus:backlink" content="{{ canonical_absolute }}">' in seo

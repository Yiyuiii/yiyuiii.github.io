from pathlib import Path

import yaml

from scripts.translation_guard import validate_site_text


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def frontmatter(path):
    source = text(path)
    return yaml.safe_load(source.split("---", 2)[1])


def test_config_selects_the_light_content_first_shell():
    config = yaml.safe_load(text("_config.yml"))

    assert config["title"] == "yiyuiii"
    assert config["lang"] == "zh-CN"
    assert config["timezone"] == "Asia/Hong_Kong"
    assert config["enable_darkmode"] is False
    assert config["enable_project_categories"] is False
    assert config["related_blog_posts"]["enabled"] is False
    assert config["al_folio"]["features"]["cv"]["enabled"] is False
    assert "google_fonts" not in config["third_party_libraries"]
    assert "jekyll/scholar" not in config["plugins"]
    assert "al_search" not in config["plugins"]
    assert "al_citations" not in config["plugins"]


def test_site_text_is_parallel_and_contains_approved_navigation():
    data = yaml.safe_load(text("_data/site_text.yml"))

    validate_site_text(data)
    assert data["zh"]["nav"] == {
        "writing": "随笔",
        "github": "GitHub",
        "papers": "论文",
        "about": "关于yiyuiii",
    }
    assert data["en"]["nav"] == {
        "writing": "Writing",
        "github": "GitHub",
        "papers": "Papers",
        "about": "About yiyuiii",
    }
    assert data["zh"]["revision"] == {
        "first": "初稿",
        "last": "最近修订",
        "history": "修订历史",
        "date_format": "%Y.%m.%d",
    }
    assert data["en"]["revision"] == {
        "first": "First published",
        "last": "Last revised",
        "history": "Revision history",
        "date_format": "%Y-%m-%d",
    }
    assert data["zh"]["sections"] == {
        "trigger": "章节",
        "label": "文章章节",
        "close": "关闭章节导航",
    }
    assert data["en"]["sections"] == {
        "trigger": "Sections",
        "label": "Article sections",
        "close": "Close section navigation",
    }
    assert "about_links" not in data["zh"]
    assert "about_links" not in data["en"]


def test_header_has_avatar_centered_navigation_search_and_language_action():
    header = text("_includes/header.liquid")

    assert "site-brand__avatar" in header
    assert "android-chrome-256x256.png" in header
    assert "<nav" in header and "site-nav" in header
    assert "text.nav.writing" in header
    assert "text.nav.github" in header
    assert "text.nav.papers" in header
    assert "text.nav.about" in header
    assert 'id="search-toggle"' in header
    assert "language-switch" in header
    assert "theme-toggle" not in header


def test_document_language_uses_page_value_and_google_fonts_are_absent():
    layout = text("_layouts/default.liquid")
    head = text("_includes/head.liquid")

    assert "page.lang | default: site.lang" in layout
    assert "search-modal.liquid" in layout
    assert "site-search.js" in layout
    assert "fonts.googleapis.com" not in head
    assert "google_fonts" not in head


def test_site_owned_seo_is_language_aware_and_does_not_advertise_missing_pairs():
    config = yaml.safe_load(text("_config.yml"))
    head = text("_includes/head.liquid")
    seo = text("_includes/bilingual-seo.liquid")

    assert config["serve_og_meta"] is False
    assert config["serve_schema_org"] is False
    assert "{% include bilingual-seo.liquid %}" in head
    assert "page.canonical_url | default: page.url" in seo
    assert 'rel="canonical"' in seo
    assert 'rel="alternate" hreflang="zh-CN"' in seo
    assert 'rel="alternate" hreflang="en"' in seo
    assert 'rel="alternate" hreflang="x-default"' in seo
    assert "{% if page.translation_url %}" in seo
    assert 'property="og:locale"' in seo
    assert "zh_CN" in seo and "en_US" in seo
    assert "page.schema_type | default: 'WebPage'" in seo
    assert "schema_type = 'BlogPosting'" in seo
    assert '"@type": {{ schema_type | jsonify }}' in seo
    assert '"inLanguage"' in seo
    assert "{% unless page.redirect %}" in seo
    structured_data_guard = seo.index("{% unless page.redirect %}")
    assert seo.index('rel="canonical"') < structured_data_guard
    assert seo.index('property="og:type"') < structured_data_guard
    assert seo.index('type="application/ld+json"') > structured_data_guard
    assert head.count('rel="canonical"') == 0


def test_index_and_profile_pages_declare_their_schema_semantics():
    expected = {
        "_pages/home.md": "WebSite",
        "_pages/home.en.md": "WebSite",
        "_pages/about.md": "ProfilePage",
        "_pages/about.en.md": "ProfilePage",
        "_pages/writing.md": "CollectionPage",
        "_pages/writing.en.md": "CollectionPage",
        "_pages/projects.md": "CollectionPage",
        "_pages/projects.en.md": "CollectionPage",
        "_pages/publications.md": "CollectionPage",
        "_pages/publications.en.md": "CollectionPage",
        "_pages/archives.md": "CollectionPage",
        "_pages/archives.en.md": "CollectionPage",
        "_pages/tags.md": "CollectionPage",
        "_pages/tags.en.md": "CollectionPage",
        "_pages/categories.md": "CollectionPage",
        "_pages/categories.en.md": "CollectionPage",
    }

    assert {
        path: frontmatter(path).get("schema_type")
        for path in expected
    } == expected

    archive_compat = text("_plugins/legacy-post-compat.rb")
    assert 'page.data["schema_type"] = "CollectionPage"' in archive_compat


def test_head_allows_only_used_cdn_fonts_and_production_favicons():
    head = text("_includes/head.liquid")
    favicon_dir = ROOT / "assets" / "img" / "favicons"
    production_favicons = {
        path.relative_to(favicon_dir).as_posix()
        for path in favicon_dir.rglob("*")
        if path.is_file()
        and not any(
            component.startswith(".")
            for component in path.relative_to(favicon_dir).parts
        )
    }

    assert "font-src 'self' data: https://cdn.jsdelivr.net;" in head
    assert "font-src 'self' data: https:;" not in head
    assert """<link rel="icon" href="{{ '/assets/img/favicons/favicon.ico' | relative_url }}" sizes="any">""" in head
    assert production_favicons == {
        "android-chrome-256x256.png",
        "favicon.ico",
    }


def test_fixed_light_shell_provides_the_theme_api_required_by_mermaid():
    layout = text("_layouts/default.liquid")
    compatibility = text("assets/js/theme-compat.js")

    assert "theme-compat.js" in layout
    assert layout.index("theme-compat.js") < layout.index("scripts.liquid")
    assert "window.determineComputedTheme" in compatibility
    assert 'return "light"' in compatibility


def test_nested_content_includes_bind_their_page_language_locally():
    site_text_includes = (
        "_includes/post-list.liquid",
        "_includes/project-list.liquid",
        "_includes/publication-list.liquid",
        "_includes/search-modal.liquid",
    )

    for path in site_text_includes:
        source = text(path)
        assert "{% assign lang_key = page.lang | default: 'zh' %}" in source
        assert "{% assign text = site.data.site_text[lang_key] %}" in source

    about = text("_includes/about-profile.liquid")
    assert "{% assign lang_key = page.lang | default: 'zh' %}" in about
    assert "{% assign profile = site.data.about[lang_key] %}" in about
    assert "{% assign hidden_blocks = site.data.about.display.hidden_blocks %}" in about
    assert "{% unless hidden_blocks contains block.id %}" in about


def test_not_found_page_preserves_the_requested_language_without_redirecting():
    page_data = frontmatter("_pages/404.md")
    layout = text("_layouts/not-found.liquid")

    assert page_data["layout"] == "not-found"
    assert "redirect" not in page_data
    assert "http-equiv=\"refresh\"" not in layout
    assert "location.pathname" in layout
    assert 'data-language="zh"' in layout
    assert 'data-language="en"' in layout
    assert "document.documentElement.lang = language" in layout


def test_search_uses_the_current_publication_language():
    include = text("_includes/search-modal.liquid")

    assert "publication.title[lang_key]" in include
    assert "publication.authors[lang_key]" in include
    assert "publication.venue[lang_key]" in include
    assert "publication.recognition.label[lang_key]" in include


def test_verified_publication_recognition_follows_the_venue():
    include = text("_includes/publication-list.liquid")
    venue = '<span class="index-kicker">{{ publication.venue[page.lang] }}</span>'
    recognition = "{% if publication.recognition %}"

    assert venue in include
    assert recognition in include
    assert include.index(venue) < include.index(recognition)
    assert "publication-recognition" in include
    assert "publication.recognition.label[page.lang]" in include
    assert "publication.recognition.url" in include
    recognition_block = include[
        include.index(recognition) : include.index("{% endif %}", include.index(recognition))
    ]
    assert 'target="_blank"' in recognition_block
    assert 'rel="noopener noreferrer"' in recognition_block


def test_verified_self_contribution_follows_the_owner_name_inline():
    include = text("_includes/publication-list.liquid")
    owner = '<strong class="publication-self">{{ author }}</strong>'
    contribution = "publication.self_contribution[page.lang]"

    assert "publication-self-entry" in include
    assert owner in include
    assert contribution in include
    assert include.index(owner) < include.index(contribution)
    assert "publication-note" not in include


def test_only_welcome_page_owns_the_root_permalink():
    owners = []
    for path in sorted((ROOT / "_pages").glob("*.md")):
        data = frontmatter(path.relative_to(ROOT))
        if data.get("published", True) and data.get("permalink") == "/":
            owners.append(path.name)

    assert owners == ["home.md"]


def test_workflow_builds_pr_artifact_and_only_deploys_master():
    workflow = text(".github/workflows/deploy.yml")

    assert workflow.count("actions/checkout@v6") == 2
    assert "actions/setup-python@v6" in workflow
    assert "actions/upload-artifact@v7" in workflow
    assert "actions/download-artifact@v8" in workflow
    assert "\npermissions: {}\n" in workflow
    assert "permissions:\n      contents: read" in workflow
    assert "permissions:\n      contents: write" in workflow
    assert "GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}" in workflow
    assert "python -m pytest -q" in workflow
    assert "python scripts/check_site.py --site _site" in workflow
    assert "python scripts/check_legacy_urls.py --site _site" in workflow
    assert "name: site-preview" in workflow
    assert "github.event_name != 'pull_request'" in workflow
    assert "github.ref == 'refs/heads/master'" in workflow

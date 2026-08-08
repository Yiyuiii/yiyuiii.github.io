import json
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
    assert set(config["third_party_libraries"]) == {
        "download",
        "d3",
        "mermaid",
        "mathjax",
    }
    assert "jekyll/scholar" not in config["plugins"]
    assert "al_search" not in config["plugins"]
    assert "al_citations" not in config["plugins"]
    assert "jekyll-3rd-party-libraries" not in config["plugins"]
    assert config["third_party_libraries"]["download"] is False


def test_local_library_url_expander_replaces_the_vulnerable_download_plugin():
    gemfile = text("Gemfile")
    plugin = text("_plugins/third_party_library_urls.rb")

    assert "jekyll-3rd-party-libraries" not in gemfile
    assert 'VERSION_TOKEN = "{{version}}"' in plugin
    assert 'Jekyll::Hooks.register :site, :after_init' in plugin
    assert 'if libraries["download"]' in plugin


def test_disabled_capabilities_do_not_register_build_plugins():
    config = yaml.safe_load(text("_config.yml"))
    gemfile = text("Gemfile")
    workflow = text(".github/workflows/deploy.yml")
    unused_plugins = {
        "jekyll-get-json",
        "jekyll-imagemagick",
        "jekyll-jupyter-notebook",
        "jekyll-paginate-v2",
        "jekyll-twitter-plugin",
        "al_folio_cv",
        "al_folio_distill",
        "al_folio_upgrade",
        "al_folio_bootstrap_compat",
        "al_cookie",
        "al_analytics",
        "al_ext_posts",
        "al_comments",
        "al_newsletter",
        "al_icons",
        "al_img_tools",
    }

    assert unused_plugins.isdisjoint(config["plugins"])
    for plugin in unused_plugins:
        assert f"gem '{plugin}'" not in gemfile

    assert "classifier-reborn" not in gemfile
    assert "gem 'observer'" not in gemfile
    assert "gem 'ostruct'" not in gemfile
    assert "imagemagick" not in config
    assert "Install ImageMagick" not in workflow


def test_custom_shell_does_not_load_unused_theme_runtime_assets():
    layout = text("_layouts/default.liquid")
    head = text("_includes/head.liquid")

    assert "{% include scripts.liquid %}" not in layout
    assert "{% include plugins/al_charts_scripts.liquid %}" in layout
    assert "{% include plugins/al_math_scripts.liquid %}" in layout
    assert "al_icons_styles" not in head
    for unused_asset in (
        "nav-toggle.js",
        "tooltips-setup.js",
        "no_defer.js",
        "common.js",
        "copy_code.js",
        "jupyter_new_tab.js",
    ):
        assert unused_asset not in layout


def test_content_security_policy_names_only_active_runtime_origins():
    head = text("_includes/head.liquid")
    policy = head.split('http-equiv="Content-Security-Policy"', 1)[1].split(">", 1)[0]

    assert "object-src 'none'" in policy
    assert "base-uri 'self'" in policy
    assert "form-action 'self'" in policy
    assert "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://giscus.app" in policy
    assert "img-src 'self' data: https://openaccess-cdn.clevelandart.org" in policy
    assert "frame-src https://giscus.app" in policy
    for origin in (
        "https://graphql.anilist.co",
        "https://openaccess-api.clevelandart.org",
        "https://zh.moegirl.org.cn",
    ):
        assert origin in policy
    assert " https:;" not in policy


def test_toy_styles_are_page_scoped_instead_of_part_of_the_global_bundle():
    head = text("_includes/head.liquid")
    main_css = text("assets/css/main.scss")
    toy_css = text("assets/css/toys.scss")

    assert "{% if page.nav_key == 'toys' %}" in head
    assert "'/assets/css/toys.css'" in head
    assert ".toy-index" not in main_css
    assert ".moegirl-quiz" not in main_css
    assert ".toy-index" in toy_css
    assert ".moegirl-quiz" in toy_css


def test_site_text_is_parallel_and_contains_approved_navigation():
    data = yaml.safe_load(text("_data/site_text.yml"))

    validate_site_text(data)
    assert data["zh"]["nav"] == {
        "home": "欢迎",
        "writing": "随笔",
        "github": "GitHub",
        "papers": "论文",
        "toys": "小玩意",
        "about": "关于yiyuiii",
    }
    assert data["en"]["nav"] == {
        "home": "Welcome",
        "writing": "Writing",
        "github": "GitHub",
        "papers": "Papers",
        "toys": "Toys",
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


def test_header_has_avatar_centered_navigation_search_theme_and_language_actions():
    header = text("_includes/header.liquid")

    assert "site-brand__avatar" in header
    assert "android-chrome-256x256.png" in header
    assert "<nav" in header and "site-nav" in header
    assert "text.nav.home" in header
    assert "text.nav.writing" in header
    assert "text.nav.github" in header
    assert "text.nav.papers" in header
    assert "text.nav.toys" in header
    assert "text.nav.about" in header
    assert 'id="search-toggle"' in header
    assert "language-switch" in header
    assert 'id="theme-toggle"' in header
    assert "site-brand__avatar-toggle" in header
    assert "site-brand__name" in header


def test_document_language_uses_page_value_and_google_fonts_are_absent():
    layout = text("_layouts/default.liquid")
    head = text("_includes/head.liquid")

    assert "page.lang | default: site.lang" in layout
    assert "search-dialog.liquid" in layout
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
        "_pages/toys.md": "CollectionPage",
        "_pages/toys.en.md": "CollectionPage",
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


def test_head_allows_only_local_fonts_and_production_favicons():
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

    assert "font-src 'self' data:;" in head
    assert "font-src 'self' data: https:" not in head
    assert """<link rel="icon" href="{{ '/assets/img/favicons/favicon.ico' | relative_url }}" sizes="any">""" in head
    assert production_favicons == {
        "android-chrome-256x256.png",
        "favicon.ico",
    }


def test_site_theme_shell_provides_the_dynamic_api_required_by_mermaid():
    layout = text("_layouts/default.liquid")
    compatibility = text("assets/js/theme-compat.js")

    assert "theme-compat.js" in layout
    assert layout.index("theme-compat.js") < layout.index("plugins/al_charts_scripts.liquid")
    assert "window.determineComputedTheme" in compatibility
    assert 'dataset.theme === "dark" ? "dark" : "light"' in compatibility


def test_nested_content_includes_bind_their_page_language_locally():
    site_text_includes = (
        "_includes/post-list.liquid",
        "_includes/project-list.liquid",
        "_includes/publication-list.liquid",
        "_includes/search-dialog.liquid",
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
    include = text("_includes/search-dialog.liquid")

    assert "publication.title[lang_key]" in include
    assert "publication.authors[lang_key]" in include
    assert "publication.venue[lang_key]" in include
    assert "publication.recognition.label[lang_key]" in include
    assert "site.data.toys.groups" in include
    assert "group.items" in include
    assert "toy.title[lang_key]" in include
    assert "toy.keywords[lang_key]" in include
    assert "text.urls.toys" in include


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
    assert "actions/setup-node@v6" in workflow
    assert 'node-version: "24"' in workflow
    assert "npx playwright install --with-deps --no-shell chromium" in workflow
    assert "python scripts/validate.py --browser" in workflow
    assert "name: browser-failure-artifacts" in workflow
    assert "name: site-preview" in workflow
    assert "github.event_name != 'pull_request'" in workflow
    assert "github.ref == 'refs/heads/master'" in workflow

    assert workflow.index("npm ci") < workflow.index("python scripts/validate.py --browser")


def test_javascript_logic_tests_have_a_portable_package_entrypoint():
    package = json.loads(text("package.json"))

    assert package["scripts"]["test:unit"] == "node --test"


def test_browser_suite_parallelism_matches_local_and_ci_capacity():
    config = text("playwright.config.mjs")

    assert "workers: process.env.CI ? 4 : 2" in config
    assert 'channel: "chromium"' in config
    assert "fullyParallel: false" in config


def test_ruby_dependencies_are_locked_for_reproducible_builds():
    assert (ROOT / "Gemfile.lock").is_file()
    assert "Gemfile.lock" not in text(".gitignore").splitlines()

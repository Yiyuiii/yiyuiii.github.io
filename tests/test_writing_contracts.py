from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def frontmatter(path):
    source = path.read_text(encoding="utf-8")
    return yaml.safe_load(source.split("---", 2)[1])


def test_every_post_has_an_explicit_source_language():
    posts = sorted((ROOT / "_posts").glob("*.md"))
    languages = [frontmatter(path)["lang"] for path in posts]

    assert len(posts) == 11
    assert languages.count("en") == 2
    assert languages.count("zh") == 9


def test_every_post_has_a_nonempty_authored_excerpt():
    posts = sorted((ROOT / "_posts").glob("*.md"))
    excerpts = {
        path.name: frontmatter(path).get("excerpt")
        for path in posts
    }

    assert all(
        isinstance(excerpt, str) and excerpt.strip()
        for excerpt in excerpts.values()
    ), excerpts


def test_writing_index_uses_complete_summaries_and_real_tags():
    include = text("_includes/post-list.liquid")

    assert "site.data.site_text[lang_key]" in include
    assert "sorted_tags" in include
    assert "entry-rule" in include
    assert "data-filter-list" in include
    assert "data-filter-entry" in include
    assert "data-filter-empty" in include
    assert "data-tags" in include
    assert "url_encode" in include
    assert "post.description | default: post.excerpt" in include
    assert "truncate" not in include
    assert "line-clamp" not in include
    assert "thumbnail" in include


def test_writing_and_project_indexes_share_one_scoped_filter_protocol():
    script = text("assets/js/site-search.js")

    assert 'document.querySelectorAll("[data-filter-list]")' in script
    assert 'list.querySelectorAll("[data-filter-entry][data-tags]")' in script
    assert 'list.querySelector("[data-filter-empty]")' in script
    assert 'document.querySelectorAll(".writing-entry")' not in script
    assert 'document.querySelector("#tag-empty-state")' not in script


def test_post_dates_use_an_assigned_language_format():
    post_list = text("_includes/post-list.liquid")
    layout = text("_layouts/post.liquid")

    assert "{% assign date_format = text.date_format %}" in post_list
    assert "| date: date_format" in post_list
    assert "{% assign revision_date_format = text.revision.date_format %}" in layout
    assert "| date: revision_date_format" in layout
    assert "| date: text.date_format" not in post_list
    assert "| date: text.revision.date_format" not in layout


def test_tag_frequency_is_language_local_and_ties_are_stable():
    plugin = text("_plugins/site_content.rb")

    assert 'post.data["lang"]' in plugin
    assert "frequencies" in plugin
    assert 'post.data["sorted_tags"]' in plugin
    assert "each_with_index" in plugin
    assert "[-" in plugin


def test_homepages_are_language_specific_and_blog_redirects_to_root():
    zh = frontmatter(ROOT / "_pages" / "writing.md")
    en = frontmatter(ROOT / "_pages" / "writing.en.md")
    blog = frontmatter(ROOT / "_pages" / "blog.md")

    assert (zh["permalink"], zh["lang"], zh["hide_title"]) == ("/", "zh", True)
    assert (en["permalink"], en["lang"], en["hide_title"]) == ("/en/", "en", True)
    assert blog["permalink"] == "/blog/"
    assert blog["redirect"] == "/"


def test_post_layout_is_reader_first():
    layout = text("_layouts/post.liquid")

    assert layout.count("{% toc %}") == 1
    assert "{% capture article_toc_markup %}" in layout
    assert 'replace: \' id="toc"\', \'\'' in layout
    assert '<details class="article-toc">' not in layout
    assert "article-side-toc" in layout
    assert 'class="article-section-dialog"' in layout
    assert "data-article-navigation" in layout
    assert "article-navigation.js" in layout
    assert "related_posts" not in layout
    assert "reading-time" not in layout
    assert "post-content" in layout
    assert "<h1" in layout


def test_post_header_orders_tags_before_expandable_revision_history():
    layout = text("_layouts/post.liquid")

    tags = '<div class="article-tags">'
    history = '<details class="article-history">'

    assert tags in layout
    assert history in layout
    assert layout.index("<h1") < layout.index(tags) < layout.index(history)
    assert "{% if page.revisions %}" in layout
    assert "{% assign revision_total = 0 %}" in layout
    assert "page.author" not in layout
    assert "<summary" in layout
    assert "<time" in layout
    assert "revision_count" not in layout
    assert "条记录" not in layout
    assert "修订 2 次" not in layout


def test_installation_post_uses_structured_revisions_and_optional_evidence_notes():
    path = ROOT / "_posts" / "2022-11-11-装机记录.md"
    source = path.read_text(encoding="utf-8")
    data = frontmatter(path)
    body = source.split("---", 2)[2]

    assert data["revisions"] == [
        {"date": "2022-11-11", "note": "初稿"},
        {
            "date": "2026-07-29",
            "note": (
                "补充资料来源，校正硬件型号、成本及部分技术表述；"
                "保留 2022 年视角（ChatGPT 协助）"
            ),
        },
        {
            "date": "2026-07-30",
            "note": "校正刷新率收益与烤机结温两处表述（Kimi 协助）",
        },
    ]
    assert "2022.11.11：初稿" not in body
    assert "2026.07.29：ChatGPT 修订" not in body
    assert body.count("{: .article-evidence}") == 11


def test_installation_post_uses_the_approved_lightweight_cover():
    path = ROOT / "_posts" / "2022-11-11-装机记录.md"
    data = frontmatter(path)

    assert data["thumbnail"] == (
        "/assets/posts/202211110000/cover-generated-2026-07-29.webp"
    )
    asset = ROOT / data["thumbnail"].lstrip("/")
    assert asset.is_file()
    assert asset.stat().st_size < 200_000
    header = asset.read_bytes()[:16]
    assert header[:4] == b"RIFF"
    assert header[8:16] == b"WEBPVP8 "


def test_every_post_now_has_a_local_thumbnail():
    posts = sorted((ROOT / "_posts").glob("*.md"))
    thumbnails = [frontmatter(path).get("thumbnail") for path in posts]

    assert len(posts) == 11
    assert all(
        isinstance(thumbnail, str) and thumbnail.startswith("/assets/posts/")
        for thumbnail in thumbnails
    )
    assert all(
        (ROOT / thumbnail.lstrip("/")).is_file()
        for thumbnail in thumbnails
    )


def test_article_navigation_uses_native_dialog_and_progressive_scroll_tracking():
    script = text("assets/js/article-navigation.js")

    assert "showModal()" in script
    assert "IntersectionObserver" in script
    assert 'aria-current' in script
    assert '"location"' in script
    assert "prefers-reduced-motion" in script
    assert "requestAnimationFrame" in script
    assert "decodeURIComponent" in script
    assert "data-article-section-trigger" in script
    assert "data-article-section-close" in script
    assert "preventScroll" in script

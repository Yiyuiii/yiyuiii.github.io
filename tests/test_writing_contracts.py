import re
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def frontmatter(path):
    source = path.read_text(encoding="utf-8")
    return yaml.safe_load(source.split("---", 2)[1])


def markdown_headings(path):
    """Return headings outside fenced code blocks from a post body."""
    body = path.read_text(encoding="utf-8").split("---", 2)[2]
    headings = []
    in_fence = False
    fence = None

    for line in body.splitlines():
        fence_match = re.match(r"^\s*(`{3,}|~{3,})", line)
        if fence_match:
            marker = fence_match.group(1)[0]
            if not in_fence:
                in_fence = True
                fence = marker
            elif marker == fence:
                in_fence = False
                fence = None
            continue
        if in_fence:
            continue

        heading = re.match(r"^(#{1,6})\s+(.+?)\s*$", line)
        if heading:
            headings.append((len(heading.group(1)), heading.group(2)))

    return headings


def test_every_post_has_an_explicit_source_language():
    posts = sorted((ROOT / "_posts").glob("*.md"))
    languages = [frontmatter(path)["lang"] for path in posts]

    assert posts
    assert set(languages) == {"en", "zh"}


def test_every_post_body_starts_at_h2_and_never_skips_a_heading_level():
    posts = sorted((ROOT / "_posts").glob("*.md"))

    for path in posts:
        headings = markdown_headings(path)
        assert headings, f"{path.name} has no body headings"
        assert headings[0][0] == 2, (
            f"{path.name} must start its body outline at h2: {headings[0]!r}"
        )
        assert all(2 <= level <= 4 for level, _ in headings), (
            f"{path.name} must reserve h1 for the article layout: {headings!r}"
        )
        for previous, current in zip(headings, headings[1:]):
            assert current[0] <= previous[0] + 1, (
                f"{path.name} skips from h{previous[0]} to h{current[0]}: "
                f"{previous[1]!r} -> {current[1]!r}"
            )


def test_removed_duplicate_post_title_keeps_its_public_fragment_anchor():
    body = text("_posts/2021-09-16-build a personal github page.md").split(
        "---", 2
    )[2]

    assert "# Building a Personal GitHub Page" not in body
    assert 'id="building-a-personal-github-page"' in body


def test_taxonomy_navigation_returns_to_the_current_language_filter():
    for path in (
        "_pages/tags.md",
        "_pages/tags.en.md",
        "_pages/categories.md",
        "_pages/categories.en.md",
    ):
        source = text(path)
        assert "site.data.site_text[lang_key]" in source
        assert "text.urls.writing" in source
        assert "?tag=" in source
        assert "prepend: '/tags/'" not in source
        assert "prepend: '/categories/'" not in source

    post_list = text("_includes/post-list.liquid")
    assert "post.tags | concat: post.categories" in post_list


def test_generated_legacy_archives_prefer_chinese_but_keep_english_only_routes():
    archive = text("_layouts/archive.liquid")
    plugin = text("_plugins/legacy-post-compat.rb")

    assert 'lang_key = page.lang | default: "zh"' in archive
    assert 'site.data.site_text[lang_key]' in archive
    assert 'page.documents | where: "lang", lang_key' in archive
    assert 'page.data["layout"] == "archive"' in plugin
    assert 'document.data["lang"] == "zh"' in plugin
    assert '? "zh" : "en"' in plugin


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
    responsive_thumbnail = text("_includes/responsive-thumbnail.liquid")

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
    assert "responsive-thumbnail.liquid" in include
    assert "priority=forloop.first" in include
    assert 'srcset="' in responsive_thumbnail
    assert "160w" in responsive_thumbnail
    assert "320w" in responsive_thumbnail
    assert (
        '(max-width: 380px) 88px, (max-width: 640px) 109px, 134px'
        in responsive_thumbnail
    )
    assert 'width="160"' in responsive_thumbnail
    assert 'height="160"' in responsive_thumbnail
    assert 'decoding="async"' in responsive_thumbnail
    assert 'loading="eager"' in responsive_thumbnail
    assert 'fetchpriority="high"' in responsive_thumbnail
    assert 'loading="lazy"' in responsive_thumbnail


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


def test_writing_indexes_are_language_specific_and_blog_redirects_to_writing():
    zh = frontmatter(ROOT / "_pages" / "writing.md")
    en = frontmatter(ROOT / "_pages" / "writing.en.md")
    blog = frontmatter(ROOT / "_pages" / "blog.md")
    page2 = frontmatter(ROOT / "_pages" / "legacy-page2.md")

    assert (zh["permalink"], zh["lang"], zh["hide_title"]) == (
        "/writing/",
        "zh",
        True,
    )
    assert (en["permalink"], en["lang"], en["hide_title"]) == (
        "/en/writing/",
        "en",
        True,
    )
    assert blog["permalink"] == "/blog/"
    assert blog["redirect"] == "/writing/"
    assert blog["canonical_url"] == blog["redirect"]
    assert page2["permalink"] == "/page2/"
    assert page2["canonical_url"] == page2["redirect"] == "/writing/"


def test_post_layout_is_reader_first():
    layout = text("_layouts/post.liquid")

    assert layout.count("{% toc %}") == 1
    assert "{% capture article_toc_markup %}" in layout
    assert 'replace: \' id="toc"\', \'\'' in layout
    assert '<details class="article-inline-toc">' in layout
    assert "article-side-toc" in layout
    assert 'class="article-section-dialog"' not in layout
    assert "data-article-navigation" in layout
    assert "article-navigation.js" in layout
    assert "related_posts" not in layout
    assert "reading-time" not in layout
    assert "post-content" in layout
    assert "<h1" in layout
    assert layout.count("{% include article-cover.liquid %}") == 1
    assert layout.index("{% include article-cover.liquid %}") < layout.index(
        '<div class="post-content"'
    )

    cover = text("_includes/article-cover.liquid")
    assert '<figure class="article-cover">' in cover
    assert 'class="article-cover__image"' in cover
    assert 'loading="eager"' in cover
    assert 'fetchpriority="high"' in cover
    assert "page.thumbnail | relative_url" in cover
    assert "page.article_cover.alt | escape" in cover
    assert "page.article_cover.caption | markdownify" in cover


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

    assert posts
    assert all(
        isinstance(thumbnail, str) and thumbnail.startswith("/assets/posts/")
        for thumbnail in thumbnails
    )
    assert all(
        (ROOT / thumbnail.lstrip("/")).is_file()
        for thumbnail in thumbnails
    )


def test_every_post_uses_one_explicit_cover_component_without_body_duplication():
    posts = sorted((ROOT / "_posts").glob("*.md"))

    assert len(posts) == 22
    for path in posts:
        data = frontmatter(path)
        cover = data.get("article_cover")
        body = path.read_text(encoding="utf-8").split("---", 2)[2]

        assert isinstance(cover, dict) and set(cover) == {"alt", "caption"}, path
        assert all(
            isinstance(cover[field], str) and cover[field].strip()
            for field in ("alt", "caption")
        ), path
        assert data["thumbnail"] not in body, path


def assert_age_of_innovation_reviewed_conclusions(body):
    context = "《大创造时代》生产文章正文"
    reviewed_conclusions = (
        r"y \approx 0.19",
        "1.65+0.81",
        "T1 的 1c ≈ T6 的 2.72 分",
        "59.47c + 29.18 分",
        "1b1 魔产 ≥ 1o1k 产 ≥ 2c3 分产",
        "`1o = 2 分`",
        "`3c = 2 分`",
        "5 金币 = 1 分",
        "这不是官方的终局兑换规则",
    )

    for conclusion in reviewed_conclusions:
        assert conclusion in body, (
            f"{context}缺少已审阅结论：{conclusion!r}"
        )
    assert "(未完工)" not in body, f"{context}仍包含未完工标记"
    assert body.count("{: .article-evidence}") == 4, (
        f"{context}应恰有 4 个证据标记"
    )
    assert "\n\n{: .article-evidence}" not in body, (
        f"{context}的证据标记前不应有额外空行"
    )


def test_age_of_innovation_keeps_reviewed_production_conclusions():
    source = text(
        "_posts/2025-10-11-《大创造时代》资源-分值量化计算思路.md"
    )
    body = source.split("---", 2)[2]

    assert_age_of_innovation_reviewed_conclusions(body)


def test_article_navigation_uses_inline_disclosure_and_progressive_scroll_tracking():
    script = text("assets/js/article-navigation.js")

    assert 'querySelector(".article-inline-toc")' in script
    assert "inlineDisclosure.open = false" in script
    assert "showModal()" not in script
    assert "IntersectionObserver" in script
    assert 'aria-current' in script
    assert '"location"' in script
    assert "prefers-reduced-motion" in script
    assert "requestAnimationFrame" in script
    assert "decodeURIComponent" in script
    assert "data-article-section-trigger" not in script
    assert "data-article-section-close" not in script
    assert "preventScroll" in script

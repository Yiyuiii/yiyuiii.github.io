import hashlib
from pathlib import Path

import yaml
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def frontmatter(path):
    source = path.read_text(encoding="utf-8")
    return yaml.safe_load(source.split("---", 2)[1])


def without_retired_blog_category(source):
    return source.replace("categories: [Blogging, ", "categories: [", 1)


def assert_only_retired_blog_category_changes(approved, production):
    assert "categories: [Blogging, " in approved
    assert "categories: [Blogging, " not in production
    assert without_retired_blog_category(approved) == production


def assert_only_cover_changes(base, production, thumbnail, image_line, caption):
    _, base_header, base_body = base.split("---", 2)
    _, production_header, production_body = production.split("---", 2)

    assert f"thumbnail: {thumbnail}\n" in production_header
    production_without_thumbnail = production_header.replace(
        f"thumbnail: {thumbnail}\n", "", 1
    )
    assert without_retired_blog_category(production_without_thumbnail) == (
        without_retired_blog_category(base_header)
    )
    cover_block = f"{image_line}\n\n{caption}"
    assert cover_block in production_body
    assert production_body.replace(cover_block, "", 1).strip("\n") == (
        base_body.strip("\n")
    )


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
    snapshot = (
        ROOT
        / "docs"
        / "content-revisions"
        / "2022-11-11-装机记录"
        / "kimi-2026-07-30.md"
    ).read_text(encoding="utf-8")
    data = frontmatter(path)
    body = source.split("---", 2)[2]

    assert source == snapshot
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


def test_logic_duel_post_preserves_revisions_and_uses_selected_bgg_cover():
    revision_dir = (
        ROOT
        / "docs"
        / "content-revisions"
        / "2023-02-03-逻辑对决桌游攻略"
    )
    original = (revision_dir / "original-2023-02-03.md").read_text(
        encoding="utf-8"
    )
    kimi_approved = (revision_dir / "kimi-2026-07-30.md").read_text(
        encoding="utf-8"
    )
    generated_cover_approved = (
        revision_dir / "cover-approved-2026-07-31.md"
    ).read_text(encoding="utf-8")
    cover_approved_path = revision_dir / "cover-approved-bgg-2026-07-31.md"
    assert cover_approved_path.is_file()
    cover_approved = cover_approved_path.read_text(encoding="utf-8")
    production = (ROOT / "_posts" / "2023-02-03-逻辑对决桌游攻略.md").read_text(
        encoding="utf-8"
    )

    assert hashlib.sha256(original.encode("utf-8")).hexdigest() == (
        "9b17f3a7483c1c16df5d282128df0fd98e50e2ac4d2406564fe5bb76ad280c22"
    )
    assert (
        hashlib.sha256(generated_cover_approved.encode("utf-8")).hexdigest()
        == "09e76740c92b93bd15dfb94e9ca6b1d9ce309c2bde058c60f0364b5ace7cddbf"
    )
    assert production == cover_approved
    assert production != original
    assert production != kimi_approved
    assert "[Codebreaking Components]" in production
    assert "BoardGameGeek 用户 dizziedobsession" in production
    assert "CC0 1.0" in production
    assert "原创题图" not in production
    assert "Codex 图像生成协助" not in production
    assert "知乎 @红薯晶暴游" not in production
    assert "title.jpg" not in production
    assert (
        "/assets/posts/202302032000/cover-bgg-7205453-square.webp"
        in production
    )
    cover = ROOT / "assets" / "posts" / "202302032000" / (
        "cover-bgg-7205453-square.webp"
    )
    assert cover.is_file()
    assert cover.stat().st_size < 200_000
    with Image.open(cover) as opened:
        assert opened.format == "WEBP"
        assert opened.size == (1024, 1024)

    generated_cover = (
        ROOT
        / "assets"
        / "posts"
        / "202302032000"
        / "cover-generated-2026-07-31.webp"
    )
    assert not generated_cover.exists()

    source = revision_dir / "cover-source-bgg-7205453.jpg"
    assert hashlib.sha256(source.read_bytes()).hexdigest() == (
        "9ecd88b04fe962809fff2fc46ab98d6be837f26fb5a8bb4014883453479efaf2"
    )
    with Image.open(source) as opened:
        assert opened.size == (1174, 880)

    source_record = (revision_dir / "cover-source.md").read_text(
        encoding="utf-8"
    )
    assert "https://boardgamegeek.com/image/7205453/break-the-code" in source_record
    assert "CC0 1.0" in source_record
    assert "dizziedobsession" in source_record
    assert (revision_dir / "cover-source-generated-2026-07-31.md").is_file()
    assert not (revision_dir / "chatgpt-proposed-2026-07-29.md").exists()


def test_troyes_original_and_approved_cover_are_preserved():
    revision_dir = (
        ROOT
        / "docs"
        / "content-revisions"
        / "2024-07-01-特鲁瓦资源分值量化分析攻略"
    )
    original = (revision_dir / "original-2024-07-01.md").read_text(
        encoding="utf-8"
    )
    approved = (revision_dir / "cover-approved-2026-07-30.md").read_text(
        encoding="utf-8"
    )
    production = (
        ROOT
        / "_posts"
        / "2024-07-01-《特鲁瓦》资源-分值量化分析攻略.md"
    ).read_text(encoding="utf-8")

    assert hashlib.sha256(original.encode("utf-8")).hexdigest() == (
        "f65241ad6917c21c25af930bdf6c0cc6d19a06e8cd22aef8ad25d74483b48a1d"
    )
    assert hashlib.sha256(approved.encode("utf-8")).hexdigest() == (
        "7e6322a6b2b7236fcbd3b68f05c2c4d17e7552d0310ef8895b8da83a432645f7"
    )
    assert_only_retired_blog_category_changes(approved, production)
    assert production != original
    without_cover = production.replace(
        "thumbnail: /assets/posts/202407012233/"
        "cover-bgg-1091724-square.webp\n",
        "",
    ).replace(
        "\n![《特鲁瓦》四人对局]"
        "(/assets/posts/202407012233/cover-bgg-1091724-square.webp)\n\n"
        "*题图：[Overview of the board. 4 player game.]"
        "(https://boardgamegeek.com/image/1091724/troyes)，"
        "摄影：BoardGameGeek 用户 verminose，"
        "[CC BY-NC 3.0](https://creativecommons.org/licenses/by-nc/3.0/)；"
        "本站作方形裁切。*\n",
        "",
    )
    assert without_retired_blog_category(without_cover) == (
        without_retired_blog_category(original)
    )
    assert (revision_dir / "fact-audit-2026-07-30.md").is_file()
    assert (revision_dir / "cover-source.md").is_file()
    assert (revision_dir / "README.md").is_file()

    source = revision_dir / "cover-source-bgg-1091724.jpg"
    assert hashlib.sha256(source.read_bytes()).hexdigest() == (
        "3ea030c606e2ef46eca7d0c80f716415e5044fe35afdff1c98f1a0a4e0701ccd"
    )
    cover = ROOT / "assets/posts/202407012233/cover-bgg-1091724-square.webp"
    assert hashlib.sha256(cover.read_bytes()).hexdigest() == (
        "cfddd3759235ac570455d46aa984d884935a8c3346b10855f0f0cd64cf639462"
    )
    assert cover.stat().st_size < 200_000
    assert cover.read_bytes()[:4] == b"RIFF"


def test_selected_board_game_covers_and_revisions_are_preserved():
    cases = [
        {
            "revision_dir": "2024-04-23-盖亚计划资源分值量化计算思路",
            "base_file": "original-2024-04-23.md",
            "base_hash": (
                "03dcf12f7a3dcbdd7643585b0e7a8bfd"
                "25a1a0a77cad0a703c4ae27b47446486"
            ),
            "approved_hash": (
                "1a332e107a7c7a18d95e3091fb41f859"
                "0aee4a3dccdc2f4366eb3bcf34fe3ed5"
            ),
            "production_file": (
                "2024-04-23-《盖亚计划》资源-分值量化计算思路.md"
            ),
            "thumbnail": (
                "/assets/posts/202404232233/"
                "cover-bgg-5194524-square.webp"
            ),
            "image_line": (
                "![《盖亚计划》终局版图与计分板]"
                "(/assets/posts/202404232233/"
                "cover-bgg-5194524-square.webp)"
            ),
            "caption": (
                "*题图：[Game board Geodens vs Automa Firaks]"
                "(https://boardgamegeek.com/image/5194524/gaia-project)，"
                "图片：BoardGameGeek 用户 magic_erwt，"
                "[CC0 1.0]"
                "(https://creativecommons.org/publicdomain/zero/1.0/)；"
                "本站作方形裁切。*"
            ),
            "source_file": "cover-source-bgg-5194524.jpg",
            "source_hash": (
                "d6308a59e240d1b734856347cface088"
                "37d8774d11ef32ad1fb9c559402bc04a"
            ),
            "source_dimensions": (1024, 768),
            "cover_file": (
                "assets/posts/202404232233/"
                "cover-bgg-5194524-square.webp"
            ),
            "cover_hash": (
                "f63895aa3977d0c5bebd97dd661d4b28"
                "428acd61d1bbc450c4cf81b7d2bc91de"
            ),
        },
        {
            "revision_dir": "2025-10-11-大创造时代资源分值量化计算思路",
            "base_file": "kimi-2026-07-30.md",
            "base_hash": (
                "0697c8bce7d33b043b8690223dbdb7fe"
                "03bdb3395461495aa49c498302c15703"
            ),
            "approved_hash": (
                "1e7c7e958298a52b54bca1b4a2d9f2db"
                "96fdac6f14f5a2d4ccd5051a9396e505"
            ),
            "production_file": (
                "2025-10-11-《大创造时代》资源-分值量化计算思路.md"
            ),
            "thumbnail": (
                "/assets/posts/202510112233/"
                "cover-bgg-7712310-square.webp"
            ),
            "image_line": (
                "![《大创造时代》五人终局]"
                "(/assets/posts/202510112233/"
                "cover-bgg-7712310-square.webp)"
            ),
            "caption": (
                "*题图：[Five player game.]"
                "(https://boardgamegeek.com/image/7712310/"
                "age-of-innovation)，"
                "图片：BoardGameGeek 用户 Hipopotam，"
                "[CC BY-SA 3.0]"
                "(https://creativecommons.org/licenses/by-sa/3.0/)；"
                "本站作方形裁切，衍生封面沿用同一许可。*"
            ),
            "source_file": "cover-source-bgg-7712310.jpg",
            "source_hash": (
                "60204ecac55cdaa1be45da4f8cb371d1"
                "0b13e84039692ef20d2d108940a33c92"
            ),
            "source_dimensions": (3784, 2838),
            "cover_file": (
                "assets/posts/202510112233/"
                "cover-bgg-7712310-square.webp"
            ),
            "cover_hash": (
                "c6e4afcf62b37df698f5858326805f87"
                "13f8017b676003c404d7e8b40d943dd0"
            ),
        },
        {
            "revision_dir": "2023-01-18-四季物语量化分析攻略",
            "base_file": "original-2023-01-18.md",
            "base_hash": (
                "8716a0234a3b9199c551cb23d739e0a1"
                "e3349989e7715f772aa89dc503875e6a"
            ),
            "approved_hash": (
                "07b7a7244ff73805afd08aeaf512f69e"
                "202095395f7614b222bdde1b1b6cc328"
            ),
            "production_file": "2023-01-18-四季物语量化分析攻略.md",
            "thumbnail": (
                "/assets/posts/202301162233/"
                "cover-bgg-2898488-square.webp"
            ),
            "image_line": (
                "![《四季物语》季节盘与能量标记]"
                "(/assets/posts/202301162233/"
                "cover-bgg-2898488-square.webp)"
            ),
            "caption": (
                "*题图：[Board up close]"
                "(https://boardgamegeek.com/image/2898488/seasons)，"
                "图片：BoardGameGeek 用户 dodecalouise，"
                "[CC0 1.0]"
                "(https://creativecommons.org/publicdomain/zero/1.0/)；"
                "本站作方形裁切。*"
            ),
            "source_file": "cover-source-bgg-2898488.jpg",
            "source_hash": (
                "8800e802a1597f4d708c2dd570d42cf9"
                "4c5224e2459dcd729c1ce26728a10b2f"
            ),
            "source_dimensions": (2560, 1920),
            "cover_file": (
                "assets/posts/202301162233/"
                "cover-bgg-2898488-square.webp"
            ),
            "cover_hash": (
                "2138cd3f99ff0c877a336a20be981904"
                "96b7d17b2dca252a731601bb0f5ee714"
            ),
        },
    ]

    for case in cases:
        revision_dir = ROOT / "docs" / "content-revisions" / case[
            "revision_dir"
        ]
        base = (revision_dir / case["base_file"]).read_text(encoding="utf-8")
        approved = (
            revision_dir / "cover-approved-2026-07-30.md"
        ).read_text(encoding="utf-8")
        production = (
            ROOT / "_posts" / case["production_file"]
        ).read_text(encoding="utf-8")

        assert hashlib.sha256(base.encode("utf-8")).hexdigest() == case[
            "base_hash"
        ]
        assert hashlib.sha256(approved.encode("utf-8")).hexdigest() == case[
            "approved_hash"
        ]
        assert_only_cover_changes(
            base,
            production,
            case["thumbnail"],
            case["image_line"],
            case["caption"],
        )
        assert (revision_dir / "README.md").is_file()
        assert (revision_dir / "cover-source.md").is_file()

        source = revision_dir / case["source_file"]
        assert hashlib.sha256(source.read_bytes()).hexdigest() == case[
            "source_hash"
        ]
        with Image.open(source) as image:
            assert image.size == case["source_dimensions"]

        cover = ROOT / case["cover_file"]
        assert hashlib.sha256(cover.read_bytes()).hexdigest() == case[
            "cover_hash"
        ]
        assert cover.stat().st_size < 200_000
        with Image.open(cover) as image:
            assert image.format == "WEBP"
            assert image.size == (1024, 1024)


def test_cloud_server_cover_preserves_the_original_article():
    revision_dir = (
        ROOT
        / "docs"
        / "content-revisions"
        / "2022-08-14-云服务器折腾随笔"
    )
    original = (revision_dir / "original-2022-08-14.md").read_text(
        encoding="utf-8"
    )
    approved = (
        revision_dir / "cover-approved-2026-07-30.md"
    ).read_text(encoding="utf-8")
    production = (
        ROOT / "_posts" / "2022-08-14-云服务器折腾随笔.md"
    ).read_text(encoding="utf-8")

    assert hashlib.sha256(original.encode("utf-8")).hexdigest() == (
        "64216f5b0e70cbc7623fdea9e3fbbaf0db9e8c10a3666062dd2e8c34f2f1bc34"
    )
    assert hashlib.sha256(approved.encode("utf-8")).hexdigest() == (
        "8a190017e154719d50805863de569b92345031a57957b057ee1e37c5bee90532"
    )
    assert_only_retired_blog_category_changes(approved, production)
    assert_only_cover_changes(
        original,
        production,
        "/assets/posts/202208142347/cover-cloud-console-2026-07-30.webp",
        (
            "![云服务器实例控制台示意]"
            "(/assets/posts/202208142347/"
            "cover-cloud-console-2026-07-30.webp)"
        ),
        (
            "*题图：云服务器实例控制台示意（自制）；"
            "用于表现浏览器中管理 VPS 的场景，"
            "不对应任何真实云服务商后台。*"
        ),
    )

    cover = (
        ROOT
        / "assets"
        / "posts"
        / "202208142347"
        / "cover-cloud-console-2026-07-30.webp"
    )
    assert hashlib.sha256(cover.read_bytes()).hexdigest() == (
        "c1cbcce997663247009967199e4e89d55a5e84a1be39459ac8a76a6ef9b1f8fc"
    )
    assert cover.stat().st_size < 100_000
    with Image.open(cover) as image:
        assert image.format == "WEBP"
        assert image.size == (720, 720)

    source_record = (revision_dir / "cover-source.md").read_text(
        encoding="utf-8"
    )
    assert "不是任何真实云服务商的后台截图" in source_record
    assert "外部素材：无" in source_record


def test_final_cover_batch_preserves_the_four_original_articles():
    cases = [
        {
            "revision_dir": "2021-09-16-building-a-personal-github-page",
            "base_file": "original-2021-09-16.md",
            "base_hash": (
                "40481b1ef5e02617684aadad65bcb569"
                "922b5c25b359236a8b84f00091ce0411"
            ),
            "approved_hash": (
                "19cd8b5a0d041f71f6ac0507e62c066"
                "153f7bd3fea22a549effbdab944fc794a"
            ),
            "production_file": (
                "2021-09-16-build a personal github page.md"
            ),
            "thumbnail": (
                "/assets/posts/202109160000/"
                "cover-homepage-2026-07-30.webp"
            ),
            "image_line": (
                "![The Chinese writing index of this personal GitHub "
                "Pages site](/assets/posts/202109160000/"
                "cover-homepage-2026-07-30.webp)"
            ),
            "caption": (
                "*Cover: this site's Chinese writing index on 30 July "
                "2026; screenshot and site content by the author.*"
            ),
            "source_file": "cover-source-homepage-2026-07-30.webp",
            "source_hash": (
                "80de76f63298f7e5b914a53e53e9233"
                "f9b8fbd3829691bc2f8447d95053ef71b"
            ),
            "source_dimensions": (640, 640),
            "cover_file": (
                "assets/posts/202109160000/"
                "cover-homepage-2026-07-30.webp"
            ),
            "cover_hash": (
                "80de76f63298f7e5b914a53e53e9233"
                "f9b8fbd3829691bc2f8447d95053ef71b"
            ),
        },
        {
            "revision_dir": "2021-09-17-reinforcement-learning-issues",
            "base_file": "original-2021-09-17.md",
            "base_hash": (
                "d8c292066fb4ef27eedbd9ba30f51b943"
                "33503bd2fec9d8877d1ebcbd48e5ff2"
            ),
            "approved_hash": (
                "aa892003c41bd7d66a212c2e4b13faeb"
                "435d267ff7d8922ac4d4a8ebb57413ce"
            ),
            "production_file": "2021-09-17-reinforcement learning issues.md",
            "thumbnail": (
                "/assets/posts/202109170000/"
                "cover-reinforcement-learning-diagram-square.webp"
            ),
            "image_line": (
                "![A typical reinforcement-learning agent–environment "
                "loop](/assets/posts/202109170000/"
                "cover-reinforcement-learning-diagram-square.webp)"
            ),
            "caption": (
                "*Cover diagram: [Reinforcement learning diagram]"
                "(https://commons.wikimedia.org/wiki/"
                "File:Reinforcement_learning_diagram.svg) by Wikimedia "
                "Commons user Megajuice, [CC0 1.0]"
                "(https://creativecommons.org/publicdomain/zero/1.0/); "
                "square layout prepared for this site.*"
            ),
            "source_file": (
                "cover-source-reinforcement-learning-diagram-960.png"
            ),
            "source_hash": (
                "e580d95e052f635c96df97872f6e3ac2"
                "7f9e3d5490797c38515eecaf43dc61af"
            ),
            "source_dimensions": (960, 928),
            "cover_file": (
                "assets/posts/202109170000/"
                "cover-reinforcement-learning-diagram-square.webp"
            ),
            "cover_hash": (
                "a4c2961865207299e43a205d125a28e0"
                "55456662c641b6b756d75eb68a9d532e"
            ),
            "extra_source_file": (
                "cover-source-reinforcement-learning-diagram.svg"
            ),
            "extra_source_hash": (
                "d057ec057ad17c94acb8c19a225a1eb5"
                "0d1b8af63c55ecae64edf0365a6630e7"
            ),
        },
        {
            "revision_dir": "2022-08-17-制作一张匹配形状的字符画",
            "base_file": "original-2022-08-17.md",
            "base_hash": (
                "2c5a0cdb34e14afefb11e69bcca24d55"
                "041960c8462508384a1904c14b5a36a3"
            ),
            "approved_hash": (
                "1d64e5dec3ab3f7cff931844c15da74d"
                "f2e5ac51bc81ede17d0c28316d34431f"
            ),
            "production_file": "2022-08-17-制作一张匹配形状的字符画.md",
            "thumbnail": (
                "/assets/posts/202208171838/"
                "cover-site-avatar-ascii-square.webp"
            ),
            "image_line": (
                "![本站头像的字符画结果]"
                "(/assets/posts/202208171838/"
                "cover-site-avatar-ascii-square.webp)"
            ),
            "caption": (
                "*题图：使用本文的形状匹配思路将本站头像重新生成为字符画；"
                "头像与结果均为本站自有内容。*"
            ),
            "source_file": "cover-source-site-avatar.png",
            "source_hash": (
                "4edb23b692b9f6733992f640dafaba22"
                "73abbb29432bc3ea249930e075a2db1a"
            ),
            "source_dimensions": (256, 256),
            "cover_file": (
                "assets/posts/202208171838/"
                "cover-site-avatar-ascii-square.webp"
            ),
            "cover_hash": (
                "5ccd61775fc75b81937c10042b6d437a"
                "b8d6a837524e59839855ed900055fee7"
            ),
        },
        {
            "revision_dir": "2023-07-23-了解游泳",
            "base_file": "original-2023-07-23.md",
            "base_hash": (
                "4edb56dc644875f920cc7c96ca30f94c"
                "d53a62d3faae62733fab042f6ec08f14"
            ),
            "approved_hash": (
                "0e3a032dae33c0229df905b9e78de5a8"
                "3a29c8c6d468812596138826ce31284e"
            ),
            "production_file": "2023-07-23-了解游泳.md",
            "thumbnail": (
                "/assets/posts/202307232000/"
                "cover-breaststroke-square.webp"
            ),
            "image_line": (
                "![普通泳池中的蛙泳练习]"
                "(/assets/posts/202307232000/"
                "cover-breaststroke-square.webp)"
            ),
            "caption": (
                "*题图：[Swimming.breaststroke.arp.750pix]"
                "(https://commons.wikimedia.org/wiki/"
                "File:Swimming.breaststroke.arp.750pix.jpg)，"
                "摄影：Adrian Pingstone，公有领域；本站作方形裁切。*"
            ),
            "source_file": "cover-source-breaststroke.jpg",
            "source_hash": (
                "85d67ce6692e00e4cb3babc34f5a0fb3"
                "6c45ae6f60fdbc96fde9a67520683435"
            ),
            "source_dimensions": (750, 536),
            "cover_file": (
                "assets/posts/202307232000/"
                "cover-breaststroke-square.webp"
            ),
            "cover_hash": (
                "625afdeed0ea79ba667a285b893b7b4d"
                "fab6ec46d97d81c65e3007dba3d35b6a"
            ),
        },
    ]

    for case in cases:
        revision_dir = ROOT / "docs" / "content-revisions" / case[
            "revision_dir"
        ]
        base = (revision_dir / case["base_file"]).read_text(encoding="utf-8")
        approved = (
            revision_dir / "cover-approved-2026-07-30.md"
        ).read_text(encoding="utf-8")
        production = (
            ROOT / "_posts" / case["production_file"]
        ).read_text(encoding="utf-8")

        assert hashlib.sha256(base.encode("utf-8")).hexdigest() == case[
            "base_hash"
        ]
        assert hashlib.sha256(approved.encode("utf-8")).hexdigest() == case[
            "approved_hash"
        ]
        assert production == approved
        assert_only_cover_changes(
            base,
            production,
            case["thumbnail"],
            case["image_line"],
            case["caption"],
        )
        assert (revision_dir / "README.md").is_file()
        assert (revision_dir / "cover-source.md").is_file()

        source = revision_dir / case["source_file"]
        assert hashlib.sha256(source.read_bytes()).hexdigest() == case[
            "source_hash"
        ]
        with Image.open(source) as image:
            assert image.size == case["source_dimensions"]

        if "extra_source_file" in case:
            extra_source = revision_dir / case["extra_source_file"]
            normalized_source = extra_source.read_text(encoding="utf-8")
            normalized_hash = hashlib.sha256(
                normalized_source.encode("utf-8")
            ).hexdigest()
            assert normalized_hash == case["extra_source_hash"]

        cover = ROOT / case["cover_file"]
        assert hashlib.sha256(cover.read_bytes()).hexdigest() == case[
            "cover_hash"
        ]
        assert cover.stat().st_size < 200_000
        with Image.open(cover) as image:
            assert image.format == "WEBP"
            assert image.size == (640, 640)


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


def test_age_of_innovation_snapshots_and_production_contract():
    revision_dir = (
        ROOT
        / "docs"
        / "content-revisions"
        / "2025-10-11-大创造时代资源分值量化计算思路"
    )
    original = (revision_dir / "original-2025-10-11.md").read_text(
        encoding="utf-8"
    )
    approved = (revision_dir / "kimi-2026-07-30.md").read_text(
        encoding="utf-8"
    )
    cover_approved = (
        revision_dir / "cover-approved-2026-07-30.md"
    ).read_text(encoding="utf-8")
    production = (
        ROOT
        / "_posts"
        / "2025-10-11-《大创造时代》资源-分值量化计算思路.md"
    ).read_text(encoding="utf-8")

    assert hashlib.sha256(original.encode("utf-8")).hexdigest() == (
        "73fbfe25ce1c5ec802ab0f17d769785ee37a0de94eeca981c9f7e773c0daf063"
    )
    assert hashlib.sha256(cover_approved.encode("utf-8")).hexdigest() == (
        "1e7c7e958298a52b54bca1b4a2d9f2db96fdac6f14f5a2d4ccd5051a9396e505"
    )
    assert production != cover_approved
    assert production != original
    assert_only_cover_changes(
        approved,
        production,
        "/assets/posts/202510112233/cover-bgg-7712310-square.webp",
        (
            "![《大创造时代》五人终局]"
            "(/assets/posts/202510112233/"
            "cover-bgg-7712310-square.webp)"
        ),
        (
            "*题图：[Five player game.]"
            "(https://boardgamegeek.com/image/7712310/age-of-innovation)，"
            "图片：BoardGameGeek 用户 Hipopotam，"
            "[CC BY-SA 3.0]"
            "(https://creativecommons.org/licenses/by-sa/3.0/)；"
            "本站作方形裁切，衍生封面沿用同一许可。*"
        ),
    )
    assert (revision_dir / "fact-audit-2026-07-29.md").is_file()
    assert (revision_dir / "verify_model.py").is_file()
    assert r"y \approx 0.19" in approved
    assert "1.65+0.81" in approved
    assert "T1 的 1c ≈ T6 的 2.72 分" in approved
    assert "59.47c + 29.18 分" in approved
    assert "1b1 魔产 ≥ 1o1k 产 ≥ 2c3 分产" in approved
    assert "`1o = 2 分`" in approved
    assert "`3c = 2 分`" in approved
    assert "5 金币 = 1 分" in approved
    assert "这不是官方的终局兑换规则" in approved
    assert "(未完工)" not in approved
    assert approved.count("{: .article-evidence}") == 4
    assert "\n\n{: .article-evidence}" not in approved
    assert not (revision_dir / "chatgpt-proposed-2026-07-30.md").exists()


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

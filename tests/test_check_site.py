import ssl
import urllib.error
from pathlib import Path

import pytest

from scripts.check_site import (
    SiteCheckError,
    _check_external_links,
    check_site,
    route_path,
)


def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def page(lang, nav, body, current=None):
    home = "/en/" if lang == "en" else "/"
    if current:
        nav = nav.replace(
            f'<a href="{current}">',
            f'<a href="{current}" aria-current="page">',
            1,
        )
    return f"""<!doctype html>
<html lang="{lang}">
  <body>
    <span class="site-brand">
      <a class="site-brand__avatar-home" href="{home}">avatar</a>
      <a class="site-brand__name" href="{home}">yiyuiii</a>
    </span>
    <nav class="site-nav">{nav}</nav>
    <main>{body}</main>
  </body>
</html>
"""


def not_found_page():
    return """<!doctype html>
<html lang="zh" data-not-found-language="zh">
  <head>
    <title>404</title>
    <script>
      const language = location.pathname.startsWith('/en/') ? 'en' : 'zh';
      document.documentElement.lang = language;
    </script>
  </head>
  <body>
    <main>
      <section data-language="zh">
        <h1>页面不存在</h1>
        <p>没有找到这个页面。</p>
        <a href="/">返回随笔</a>
      </section>
      <section data-language="en">
        <h1>Page not found</h1>
        <p>This page could not be found.</p>
        <a href="/en/">Back to writing</a>
      </section>
    </main>
  </body>
</html>
"""


def about_details(block_id, heading, names):
    rows = "".join(
        f'<div id="about-{block_id}-{index}" class="about-detail-list__row">'
        f"<dt>{name}</dt><dd><p>完整的个人说明。</p></dd></div>"
        for index, name in enumerate(names)
    )
    return (
        f'<section id="about-{block_id}" class="about-section" '
        f'aria-labelledby="about-{block_id}-heading">'
        f'<h2 id="about-{block_id}-heading">{heading}</h2>'
        f'<dl class="about-detail-list">{rows}</dl></section>'
    )


def about_profile(language):
    if language == "zh":
        label = "关于yiyuiii"
        headings = (
            "灵魂基调",
            "科研方向",
            "兴趣方向",
            "日常技能",
            "我的链接",
        )
        research_names = ("元强化学习", "元贝叶斯优化", "大模型 Agent")
        interest_names = tuple(f"兴趣 {index}" for index in range(11))
        skill_names = ("做饭", "唱歌", "装机")
        link_labels = ("GitHub", "电子邮件", "RSS", "PayPal")
    else:
        label = "About yiyuiii"
        headings = (
            "Core Traits",
            "Research Directions",
            "Interests",
            "Everyday Skills",
            "My Links",
        )
        research_names = (
            "Meta-Reinforcement Learning",
            "Meta-Bayesian Optimization",
            "LLM Agents",
        )
        interest_names = tuple(f"Interest {index}" for index in range(11))
        skill_names = ("Cooking", "Singing", "PC building")
        link_labels = ("GitHub", "Email", "RSS", "PayPal")

    links = "".join(
        f'<li><a href="{href}">{link_labels[index]}</a></li>'
        for index, href in enumerate(
            (
                "https://github.com/Yiyuiii",
                "mailto:yiyuiii@foxmail.com",
                "/feed.xml",
                "https://paypal.me/yiyuiii",
            )
        )
    )
    return (
        '<div class="about-profile">'
        f'<h1 id="about-greeting" class="about-greeting" aria-label="{label}">'
        "Ciallo～(∠・ω&lt; )⌒★</h1>"
        '<section id="about-aesthetics" class="about-section about-prose" '
        'aria-labelledby="about-aesthetics-heading">'
        f'<h2 id="about-aesthetics-heading">{headings[0]}</h2>'
        '<div class="about-prose__body"><p>Aesthetic copy.</p></div></section>'
        + about_details("research", headings[1], research_names)
        + about_details("interests", headings[2], interest_names)
        + about_details("skills", headings[3], skill_names)
        + '<section id="about-links" class="about-section about-links" '
        'aria-labelledby="about-links-heading">'
        f'<h2 id="about-links-heading">{headings[4]}</h2>'
        '<div id="about-intro" class="about-intro about-links__intro">'
        '<p>Intro copy.</p></div>'
        f'<ul>{links}</ul></section>'
        "</div>"
    )


def valid_site(root):
    zh_nav = (
        '<a href="/">欢迎</a><a href="/writing/">随笔</a>'
        '<a href="/projects/">GitHub</a><a href="/publications/">论文</a>'
        '<a href="/toys/">小玩意</a><a href="/about/">关于yiyuiii</a>'
    )
    en_nav = (
        '<a href="/en/">Welcome</a><a href="/en/writing/">Writing</a>'
        '<a href="/en/projects/">GitHub</a><a href="/en/publications/">Papers</a>'
        '<a href="/en/toys/">Toys</a><a href="/en/about/">About yiyuiii</a>'
    )
    def home_feed(language):
        guide = "".join(f"<li>Guide {index}</li>" for index in range(5))
        recent = "".join(
            '<article class="home-feed-item" data-stable-id="project:p{index}">'
            '<time data-home-date datetime="2026-07-31">2026-07-31</time>'
            '<p data-home-summary>Summary</p></article>'.format(index=index)
            for index in range(8)
        )
        return (
            '<div class="home-shell"><header class="home-welcome"><h1>Welcome</h1>'
            f'<aside class="home-guide"><ul>{guide}</ul></aside></header>'
            '<div data-home-rotation><article class="home-feed-item" '
            'data-stable-id="publication:rotation"><time data-home-date '
            'datetime="2026-07-30">2026-07-30</time>'
            '<p data-home-summary>Rotation</p></article></div>'
            f'<div data-home-recent>{recent}</div></div>'
        )

    def toy_index(language):
        localized = {
            "zh": {
                "page": "小玩意",
                "database": "知识问答",
                "quick": "轻松挑战",
                "logic": "逻辑谜题",
                "random": "随机生成",
                "items": [
                    ("moegirl-quiz", "萌娘百科猜猜"),
                    ("art-glimpse", "名画猜猜（克利夫兰艺术博物馆）"),
                    ("anilist-role-quiz", "动画主角猜猜（AniList）"),
                    ("color-challenge", "色差挑战"),
                    ("ten-second", "盲估十秒"),
                    ("reaction-time", "反应时间"),
                    ("codebreaker", "数字 Wordle"),
                    ("make-24", "凑成 24"),
                    ("lights-out", "翻灯"),
                    ("random-password", "随机密码"),
                    ("random-number", "随机数字"),
                ],
            },
            "en": {
                "page": "Toys",
                "database": "Knowledge quizzes",
                "quick": "Quick challenges",
                "logic": "Logic puzzles",
                "random": "Random generators",
                "items": [
                    ("moegirl-quiz", "Moegirlpedia quiz"),
                    ("art-glimpse", "Artwork quiz (Cleveland Museum of Art)"),
                    ("anilist-role-quiz", "Anime protagonist quiz (AniList)"),
                    ("color-challenge", "Color difference challenge"),
                    ("ten-second", "Ten-second estimate"),
                    ("reaction-time", "Reaction time"),
                    ("codebreaker", "Number Wordle"),
                    ("make-24", "Make 24"),
                    ("lights-out", "Lights Out"),
                    ("random-password", "Random password"),
                    ("random-number", "Random numbers"),
                ],
            },
        }[language]

        entries = []
        for index, (item_id, title) in enumerate(localized["items"]):
            level = 2 if index == 0 else 3
            if item_id == "moegirl-quiz":
                component = (
                    '<div class="moegirl-quiz" data-moegirl-quiz '
                    'data-api-endpoint="https://zh.moegirl.org.cn/api.php">'
                    '<div data-quiz-interactive hidden><p data-quiz-clue-text></p></div>'
                    '<script type="application/json" data-quiz-copy>{}</script>'
                    '</div>'
                )
            elif item_id == "art-glimpse":
                component = '<section class="art-glimpse" data-art-glimpse></section>'
            elif item_id == "anilist-role-quiz":
                component = (
                    '<div class="acg-relation-quiz" '
                    'data-acg-relation-quiz></div>'
                )
            else:
                component = "<div>Ready.</div>"
            entries.append(
                f'<details id="{item_id}" class="toy-entry">'
                f'<summary><h{level} id="{item_id}-title">'
                f'<span class="toy-entry__title">{title}</span>'
                '<small class="toy-entry__description">Description.</small>'
                f'</h{level}></summary><div class="toy-entry__body">'
                f'{component}</div></details>'
            )

        return (
            '<div class="toy-index"><header class="toy-index__header">'
            f'<h1 class="sr-only">{localized["page"]}</h1>'
            '<p class="toy-index__introduction">Introduction.</p></header>'
            '<div class="toy-list">'
            '<section class="toy-group" data-toy-group="database">'
            f'<h2 class="toy-group__title">{localized["database"]}</h2>'
            f'<div class="toy-group__items">{"".join(entries[:3])}</div></section>'
            '<section class="toy-group" data-toy-group="quick-challenges">'
            f'<h2 class="toy-group__title">{localized["quick"]}</h2>'
            f'<div class="toy-group__items">{"".join(entries[3:6])}</div></section>'
            '<section class="toy-group" data-toy-group="logic-puzzles">'
            f'<h2 class="toy-group__title">{localized["logic"]}</h2>'
            f'<div class="toy-group__items">{"".join(entries[6:9])}</div></section>'
            '<section class="toy-group" data-toy-group="random-generators">'
            f'<h2 class="toy-group__title">{localized["random"]}</h2>'
            f'<div class="toy-group__items">{"".join(entries[9:])}</div></section>'
            '</div><script src="/assets/js/toy-loader.js"></script></div>'
        )

    write(root / "index.html", page("zh", zh_nav, home_feed("zh"), "/"))
    write(root / "en" / "index.html", page("en", en_nav, home_feed("en"), "/en/"))

    tags = (
        '<article class="writing-entry">'
        '<div class="entry-tags"><a>桌游</a><a>四季物语</a></div>'
        '<time datetime="2023-01-28T12:00:00+00:00">2023年1月28日</time>'
        '<a class="entry-main"><h2>四季物语量化分析攻略</h2>'
        '<p>完整摘要，不被截断。</p></a>'
        '<a class="entry-thumbnail"><img '
        'src="/assets/posts/sample/cover-index-v2-160.webp" '
        'srcset="/assets/posts/sample/cover-index-v2-160.webp 160w, '
        '/assets/posts/sample/cover-index-v2-320.webp 320w" '
        'sizes="(max-width: 380px) 88px, (max-width: 640px) 109px, 134px" '
        'width="160" height="160" decoding="async" '
        'loading="eager" fetchpriority="high"></a></article>'
    )
    write(root / "writing" / "index.html", page("zh", zh_nav, tags, "/writing/"))
    write(
        root / "en" / "writing" / "index.html",
        page("en", en_nav, "<h1>Writing</h1>", "/en/writing/"),
    )

    def project_entries(route):
        return "".join(
            '<article class="project-entry" data-filter-entry '
            'data-tags="Python|MIT">'
            '<div class="entry-meta index-meta">'
            '<div class="index-meta__lead">'
            f'<a class="project-tag" href="{route}?tag=Python">Python</a>'
            f'<a class="project-tag" href="{route}?tag=MIT">MIT</a>'
            '</div><span class="entry-rule"></span>'
            '<div class="index-meta__tail">'
            f'<span aria-label="Stars {6 - i}">★ {6 - i}</span>'
            "<span>Forks 0</span></div></div>"
            f'<a class="project-main" href="https://github.com/Yiyuiii/r{i}" '
            'target="_blank" rel="noopener noreferrer">'
            f"<h2>r{i}</h2><p>README source.</p></a></article>"
            for i in range(6)
        )

    write(
        root / "projects" / "index.html",
        page("zh", zh_nav, project_entries("/projects/"), "/projects/"),
    )
    write(
        root / "en" / "projects" / "index.html",
        page("en", en_nav, project_entries("/en/projects/"), "/en/projects/"),
    )

    def publication_entries(language):
        contribution = (
            "（共同第一作者）" if language == "zh" else "(co-first author)"
        )
        return "".join(
            f'<article class="publication-entry" id="p{i}">'
            '<div class="entry-meta index-meta">'
            '<span class="index-kicker">Venue</span></div>'
            f"<h2>Paper {i}</h2>"
            + (
                '<p class="publication-authors">Junpeng Yu, '
                '<span class="publication-self-entry">'
                '<strong class="publication-self">Yiyu Chen</strong>'
                f'<span class="publication-contribution">{contribution}</span>'
                "</span></p>"
                if i in {0, 1}
                else '<p class="publication-authors">Yiyu Chen, Coauthor</p>'
            )
            + '<a href="https://doi.org/10.1/example">DOI</a></article>'
            for i in range(8)
        )

    write(
        root / "publications" / "index.html",
        page("zh", zh_nav, publication_entries("zh"), "/publications/"),
    )
    write(
        root / "en" / "publications" / "index.html",
        page("en", en_nav, publication_entries("en"), "/en/publications/"),
    )

    write(
        root / "about" / "index.html",
        page("zh", zh_nav, about_profile("zh"), "/about/"),
    )
    write(
        root / "en" / "about" / "index.html",
        page("en", en_nav, about_profile("en"), "/en/about/"),
    )
    zh_toys = toy_index("zh")
    en_toys = toy_index("en")
    write(root / "toys" / "index.html", page("zh", zh_nav, zh_toys, "/toys/"))
    write(
        root / "en" / "toys" / "index.html",
        page("en", en_nav, en_toys, "/en/toys/"),
    )
    write(root / "assets" / "js" / "toy-loader.js", "(()=>{})();")
    write(root / "archives" / "index.html", page("zh", zh_nav, "<h1>随笔归档</h1>"))
    write(root / "feed.xml", "<feed></feed>")
    write(root / "sitemap.xml", "<urlset></urlset>")
    write(root / "404.html", not_found_page())


def test_valid_built_site_contract_passes(tmp_path):
    valid_site(tmp_path)

    check_site(tmp_path)


def test_toy_runtime_must_not_be_part_of_initial_scripts(tmp_path):
    valid_site(tmp_path)
    path = route_path(tmp_path, "/toys/")
    source = path.read_text(encoding="utf-8").replace(
        "</main>",
        '<script src="/assets/js/toy-random.js"></script></main>',
        1,
    )
    path.write_text(source, encoding="utf-8")
    write(tmp_path / "assets" / "js" / "toy-random.js", "(()=>{})();")

    with pytest.raises(SiteCheckError, match="first disclosure"):
        check_site(tmp_path)


def test_toy_loader_and_initial_javascript_have_hard_budgets(tmp_path):
    valid_site(tmp_path)
    write(tmp_path / "assets" / "js" / "toy-loader.js", "x" * 4097)
    with pytest.raises(SiteCheckError, match="toy loader is 4097 bytes"):
        check_site(tmp_path)

    write(tmp_path / "assets" / "js" / "toy-loader.js", "x")
    write(tmp_path / "assets" / "js" / "site-shell.js", "x" * (15 * 1024))
    for route in ("/toys/", "/en/toys/"):
        path = route_path(tmp_path, route)
        source = path.read_text(encoding="utf-8").replace(
            "</main>",
            '<script src="/assets/js/site-shell.js"></script></main>',
            1,
        )
        path.write_text(source, encoding="utf-8")
    with pytest.raises(SiteCheckError, match="initial same-origin JavaScript"):
        check_site(tmp_path)


def test_about_intro_must_be_between_link_heading_and_link_list(tmp_path):
    valid_site(tmp_path)
    path = tmp_path / "about" / "index.html"
    intro = (
        '<div id="about-intro" class="about-intro about-links__intro">'
        '<p>Intro copy.</p></div>'
    )
    source = path.read_text(encoding="utf-8").replace(intro, "")
    source = source.replace('<section id="about-links"', intro + '<section id="about-links"')
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="under the link heading"):
        check_site(tmp_path)


@pytest.mark.parametrize("side", ("before", "after"))
def test_about_intro_must_be_adjacent_to_link_heading_and_list(tmp_path, side):
    valid_site(tmp_path)
    path = tmp_path / "about" / "index.html"
    intro = (
        '<div id="about-intro" class="about-intro about-links__intro">'
        '<p>Intro copy.</p></div>'
    )
    unexpected = '<div id="unexpected-link-child"></div>'
    replacement = unexpected + intro if side == "before" else intro + unexpected
    source = path.read_text(encoding="utf-8").replace(intro, replacement)
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="under the link heading"):
        check_site(tmp_path)


def test_missing_required_route_has_concrete_evidence(tmp_path):
    valid_site(tmp_path)
    (tmp_path / "en" / "about" / "index.html").unlink()

    with pytest.raises(SiteCheckError, match="/en/about/"):
        check_site(tmp_path)


def test_project_rows_must_each_have_exactly_one_repository_link(tmp_path):
    valid_site(tmp_path)
    path = tmp_path / "projects" / "index.html"
    path.write_text(
        path.read_text(encoding="utf-8").replace(
            "</a></article>",
            '</a><a href="https://example.com">README</a></article>',
            1,
        ),
        encoding="utf-8",
    )

    with pytest.raises(SiteCheckError, match="exactly one GitHub repository link"):
        check_site(tmp_path)


@pytest.mark.parametrize("route", ("/projects/", "/en/projects/"))
def test_project_metadata_links_must_stay_on_the_localized_index(tmp_path, route):
    valid_site(tmp_path)
    path = route_path(tmp_path, route)
    source = path.read_text(encoding="utf-8").replace(
        f'href="{route}?tag=Python"',
        'href="https://github.com/topics/python"',
        1,
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="metadata filter"):
        check_site(tmp_path)


def test_project_rows_reject_nested_links(tmp_path):
    valid_site(tmp_path)
    path = route_path(tmp_path, "/projects/")
    source = path.read_text(encoding="utf-8").replace(
        "<h2>r0</h2>",
        '<h2>r0</h2><a href="/projects/?tag=Python">nested</a>',
        1,
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="nested anchor"):
        check_site(tmp_path)


@pytest.mark.parametrize("route", ("/projects/", "/en/projects/"))
def test_project_indexes_reject_rendered_update_timestamps(tmp_path, route):
    valid_site(tmp_path)
    path = route_path(tmp_path, route)
    source = path.read_text(encoding="utf-8").replace(
        "<h2>r0</h2>",
        "<h2>r0</h2><span>2026-01-02T03:04:05Z</span>",
        1,
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="updated_at"):
        check_site(tmp_path)


@pytest.mark.parametrize(
    "route",
    ("/projects/", "/en/projects/", "/publications/", "/en/publications/"),
)
def test_content_indexes_reject_redundant_page_headers(tmp_path, route):
    valid_site(tmp_path)
    path = route_path(tmp_path, route)
    source = path.read_text(encoding="utf-8").replace(
        "<main>",
        '<main><header class="page-header"><h1>Redundant</h1></header>',
        1,
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="page-header"):
        check_site(tmp_path)


@pytest.mark.parametrize(
    ("forbidden", "message"),
    [
        ("已发表", "published label"),
        ("俞俊鹏", "translated author"),
    ],
)
def test_publication_indexes_reject_invented_display_metadata(
    tmp_path, forbidden, message
):
    valid_site(tmp_path)
    path = route_path(tmp_path, "/publications/")
    source = path.read_text(encoding="utf-8").replace(
        "<h2>Paper 0</h2>",
        f"<h2>Paper 0</h2><span>{forbidden}</span>",
        1,
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match=message):
        check_site(tmp_path)


def test_publication_indexes_require_semantic_self_emphasis(tmp_path):
    valid_site(tmp_path)
    path = route_path(tmp_path, "/publications/")
    source = path.read_text(encoding="utf-8").replace(
        ' class="publication-self"',
        "",
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="publication-self"):
        check_site(tmp_path)


def test_publication_contribution_must_follow_the_owner_inside_the_author_line(tmp_path):
    valid_site(tmp_path)
    path = route_path(tmp_path, "/publications/")
    source = path.read_text(encoding="utf-8").replace(
        '<span class="publication-contribution">（共同第一作者）</span>',
        "</span><span class=\"publication-contribution\">（共同第一作者）</span>",
        1,
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="self contribution"):
        check_site(tmp_path)


@pytest.mark.parametrize("route", ("/publications/", "/en/publications/"))
def test_publication_indexes_reject_extended_abstract_labels(tmp_path, route):
    valid_site(tmp_path)
    path = route_path(tmp_path, route)
    source = path.read_text(encoding="utf-8").replace(
        "<h2>Paper 0</h2>",
        "<h2>Paper 0</h2><p>Extended Abstract</p>",
        1,
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="extended abstract"):
        check_site(tmp_path)


@pytest.mark.parametrize("route", ("/projects/", "/en/projects/"))
def test_project_repository_link_requires_a_readme_summary(tmp_path, route):
    valid_site(tmp_path)
    path = route_path(tmp_path, route)
    source = path.read_text(encoding="utf-8").replace(
        "<p>README source.</p>",
        "",
        1,
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="README summary"):
        check_site(tmp_path)


def test_rendered_tag_frequency_order_is_checked(tmp_path):
    valid_site(tmp_path)
    path = tmp_path / "writing" / "index.html"
    source = path.read_text(encoding="utf-8")
    source = source.replace(
        "<a>桌游</a><a>四季物语</a>",
        "<a>四季物语</a><a>桌游</a>",
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="tag order"):
        check_site(tmp_path)


def test_writing_summary_must_be_authored_and_bounded(tmp_path):
    valid_site(tmp_path)
    path = tmp_path / "writing" / "index.html"
    source = path.read_text(encoding="utf-8")
    source = source.replace(
        "完整摘要，不被截断。",
        "过长的正文" * 200,
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="summary"):
        check_site(tmp_path)


def test_writing_date_must_use_the_language_display_format(tmp_path):
    valid_site(tmp_path)
    path = tmp_path / "writing" / "index.html"
    source = path.read_text(encoding="utf-8")
    source = source.replace(
        "2023年1月28日",
        "2023-01-28 12:00:00 +0000",
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="date"):
        check_site(tmp_path)


def test_writing_thumbnail_must_use_responsive_derivatives(tmp_path):
    valid_site(tmp_path)
    path = tmp_path / "writing" / "index.html"
    source = path.read_text(encoding="utf-8")
    source = source.replace(
        "/assets/posts/sample/cover-index-v2-160.webp 160w",
        "/assets/posts/sample/cover.webp 160w",
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="thumbnail candidates"):
        check_site(tmp_path)


def test_about_links_must_keep_localized_visible_names(tmp_path):
    valid_site(tmp_path)
    path = tmp_path / "about" / "index.html"
    source = path.read_text(encoding="utf-8").replace(">电子邮件<", "><")
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="profile link labels"):
        check_site(tmp_path)


@pytest.mark.parametrize(
    ("route", "label"),
    (("/about/", "关于yiyuiii"), ("/en/about/", "About yiyuiii")),
)
def test_about_requires_the_accessible_ciallo_heading(tmp_path, route, label):
    valid_site(tmp_path)
    path = route_path(tmp_path, route)
    source = path.read_text(encoding="utf-8").replace(
        f' aria-label="{label}"',
        "",
        1,
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="Ciallo heading"):
        check_site(tmp_path)


def test_about_rejects_old_slogan_or_inferred_current_status(tmp_path):
    valid_site(tmp_path)
    path = route_path(tmp_path, "/about/")
    source = path.read_text(encoding="utf-8").replace(
        "</main>",
        "<p>兴趣驱动的复杂系统的拆解者。我目前是南京大学博士研究生。</p></main>",
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="obsolete or inferred profile copy"):
        check_site(tmp_path)


def test_about_allows_tools_as_an_ordinary_word_in_english_copy(tmp_path):
    valid_site(tmp_path)
    path = route_path(tmp_path, "/en/about/")
    source = path.read_text(encoding="utf-8").replace(
        "Intro copy.",
        "I compare how different LLM tools perform in practical workflows.",
        1,
    )
    path.write_text(source, encoding="utf-8")

    check_site(tmp_path)


def test_about_requires_personality_first_and_all_five_visible_sections_in_order(
    tmp_path,
):
    valid_site(tmp_path)
    path = route_path(tmp_path, "/about/")
    source = path.read_text(encoding="utf-8").replace(
        ">灵魂基调</h2>",
        ">错误顺序</h2>",
        1,
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="section headings"):
        check_site(tmp_path)


@pytest.mark.parametrize("route", ("/about/", "/en/about/"))
def test_about_rejects_temporarily_hidden_education_section(tmp_path, route):
    valid_site(tmp_path)
    path = route_path(tmp_path, route)
    source = path.read_text(encoding="utf-8").replace(
        '<section id="about-research"',
        '<section id="about-education" class="about-section" '
        'aria-labelledby="about-education-heading">'
        '<h2 id="about-education-heading">Education</h2></section>'
        '<section id="about-research"',
        1,
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="section headings"):
        check_site(tmp_path)


@pytest.mark.parametrize(
    ("block_id", "message"),
    (("interests", "interest rows"), ("skills", "skill rows")),
)
def test_about_requires_complete_interest_and_skill_counts(
    tmp_path, block_id, message
):
    valid_site(tmp_path)
    path = route_path(tmp_path, "/about/")
    source = path.read_text(encoding="utf-8").replace(
        f'<div id="about-{block_id}-0"',
        f'<div id="removed-{block_id}-0"',
        1,
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match=message):
        check_site(tmp_path)


def test_english_publication_metadata_must_not_fall_back_to_chinese(tmp_path):
    valid_site(tmp_path)
    path = tmp_path / "en" / "publications" / "index.html"
    source = path.read_text(encoding="utf-8").replace("Paper 0", "元强化学习研究综述")
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="English publication metadata"):
        check_site(tmp_path)


def test_english_publication_venue_must_not_fall_back_to_chinese(tmp_path):
    valid_site(tmp_path)
    path = tmp_path / "en" / "publications" / "index.html"
    source = path.read_text(encoding="utf-8").replace(">Venue<", ">软件学报<", 1)
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="English publication metadata"):
        check_site(tmp_path)


def test_english_publication_recognition_must_not_fall_back_to_chinese(tmp_path):
    valid_site(tmp_path)
    path = tmp_path / "en" / "publications" / "index.html"
    source = path.read_text(encoding="utf-8").replace(
        '<span class="index-kicker">Venue</span>',
        '<span class="index-kicker">Venue</span>'
        '<a class="publication-recognition" href="https://example.com">'
        "2024年高被关注综述论文</a>",
        1,
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="English publication metadata"):
        check_site(tmp_path)


def test_404_must_not_redirect_english_paths_to_the_chinese_home(tmp_path):
    valid_site(tmp_path)
    write(
        tmp_path / "404.html",
        '<html lang="zh"><head><meta http-equiv="refresh" content="0; url=/"></head>'
        "<body><h1>页面不存在</h1></body></html>",
    )

    with pytest.raises(SiteCheckError, match="404"):
        check_site(tmp_path)


def test_forbidden_routes_must_remain_404(tmp_path):
    valid_site(tmp_path)
    write(tmp_path / "research" / "index.html", "<h1>Research</h1>")

    with pytest.raises(SiteCheckError, match="/research/"):
        check_site(tmp_path)


def test_internal_collaboration_and_test_sources_must_not_be_public(tmp_path):
    valid_site(tmp_path)
    write(tmp_path / "AGENTS.md", "# Internal agent memory")
    write(tmp_path / "scripts" / "check_site.py", "raise SystemExit")
    write(tmp_path / "tests" / "test_site.py", "def test_internal(): pass")

    with pytest.raises(SiteCheckError, match="AGENTS.md.*scripts.*tests"):
        check_site(tmp_path)


def test_generated_test_reports_must_not_be_public(tmp_path):
    valid_site(tmp_path)
    write(tmp_path / "test-results" / "audit.html", "private audit")
    write(tmp_path / "playwright-report" / "index.html", "private report")

    with pytest.raises(SiteCheckError, match="test-results.*playwright-report"):
        check_site(tmp_path)


def test_built_images_must_reserve_their_intrinsic_aspect_ratio(tmp_path):
    valid_site(tmp_path)
    path = route_path(tmp_path, "/")
    source = path.read_text(encoding="utf-8").replace(
        "<main>",
        '<main><img src="/assets/example.png" alt="Example">',
        1,
    )
    path.write_text(source, encoding="utf-8")

    with pytest.raises(SiteCheckError, match="missing positive width and height"):
        check_site(tmp_path)


class ExternalResponse:
    def __init__(self, status=200):
        self.status = status

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False


def test_external_link_check_falls_back_to_get_when_head_is_rejected(
    tmp_path, monkeypatch
):
    write(
        tmp_path / "index.html",
        '<a href="https://example.com/reference">Reference</a>',
    )
    methods = []

    def fake_urlopen(request, timeout):
        methods.append((request.get_method(), timeout))
        if request.get_method() == "HEAD":
            raise urllib.error.HTTPError(
                request.full_url, 405, "Method Not Allowed", None, None
            )
        return ExternalResponse()

    monkeypatch.setattr("scripts.check_site.urllib.request.urlopen", fake_urlopen)

    _check_external_links(tmp_path)

    assert [method for method, _ in methods] == ["HEAD", "GET"]


def test_external_link_check_retries_transient_os_error(tmp_path, monkeypatch):
    write(
        tmp_path / "index.html",
        '<a href="https://example.com/reference">Reference</a>',
    )
    attempts = 0

    def fake_urlopen(request, timeout):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise OSError("temporary connection failure")
        return ExternalResponse()

    monkeypatch.setattr("scripts.check_site.urllib.request.urlopen", fake_urlopen)

    _check_external_links(tmp_path)

    assert attempts == 2


def test_external_link_check_contains_ssl_errors_and_lists_all_sources(
    tmp_path, monkeypatch
):
    url = "https://example.com/reference"
    write(tmp_path / "index.html", f'<a href="{url}">Home reference</a>')
    write(
        tmp_path / "notes" / "index.html",
        f'<a href="{url}">Notes reference</a>',
    )

    def fake_urlopen(request, timeout):
        raise ssl.SSLError("bad record mac")

    monkeypatch.setattr("scripts.check_site.urllib.request.urlopen", fake_urlopen)

    with pytest.raises(SiteCheckError) as captured:
        _check_external_links(tmp_path)

    message = str(captured.value)
    assert url in message
    assert "SSLError" in message
    assert "linked from /, /notes/" in message


def test_external_link_check_reports_http_failure_without_get_fallback(
    tmp_path, monkeypatch
):
    url = "https://example.com/missing"
    write(tmp_path / "index.html", f'<a href="{url}">Missing</a>')
    methods = []

    def fake_urlopen(request, timeout):
        methods.append(request.get_method())
        raise urllib.error.HTTPError(request.full_url, 404, "Not Found", None, None)

    monkeypatch.setattr("scripts.check_site.urllib.request.urlopen", fake_urlopen)

    with pytest.raises(SiteCheckError, match="HTTP 404") as captured:
        _check_external_links(tmp_path)

    assert "linked from /" in str(captured.value)
    assert methods == ["HEAD"]

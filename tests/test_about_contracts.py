from pathlib import Path

import yaml

from scripts.translation_guard import validate_about_profile


ROOT = Path(__file__).resolve().parents[1]
ABOUT_PATH = ROOT / "_data" / "about.yml"
PRIVATE_OR_OBSOLETE_COPY = [
    "138",
    "出生年月",
    "政治面貌",
    "中共党员",
    "国防科技",
    "under submission",
    "兴趣驱动的复杂系统的拆解者",
    "我目前是",
    "currently a PhD student",
]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def parse_page(path):
    source = text(path)
    return yaml.safe_load(source.split("---", 2)[1]), source.split("---", 2)[2]


def about_data():
    return yaml.safe_load(ABOUT_PATH.read_text(encoding="utf-8"))


def block(data, language, block_id):
    return next(
        item for item in data[language]["blocks"] if item["id"] == block_id
    )


def test_about_routes_and_titles_are_explicit():
    zh, _ = parse_page("_pages/about.md")
    en, _ = parse_page("_pages/about.en.md")

    assert (zh["title"], zh["permalink"], zh["lang"]) == (
        "关于yiyuiii",
        "/about/",
        "zh",
    )
    assert (en["title"], en["permalink"], en["lang"]) == (
        "About yiyuiii",
        "/en/about/",
        "en",
    )
    assert zh["hide_title"] is True
    assert en["hide_title"] is True
    assert en["translation_source"] == "_pages/about.md"
    assert en["translation_status"] == "current"
    assert len(en["source_hash"]) == 64


def test_about_content_uses_one_valid_bilingual_data_source():
    data = about_data()

    validate_about_profile(ABOUT_PATH)
    expected = [
        "greeting",
        "intro",
        "aesthetics",
        "education",
        "research",
        "interests",
        "skills",
        "links",
    ]
    assert [item["id"] for item in data["zh"]["blocks"]] == expected
    assert [item["id"] for item in data["en"]["blocks"]] == expected
    assert data["display"] == {"hidden_blocks": ["education"]}
    assert block(data, "zh", "aesthetics")["heading"] == "灵魂基调"
    assert block(data, "en", "aesthetics")["heading"] == "How I’m Wired"
    assert [
        paragraph["id"]
        for paragraph in block(data, "zh", "aesthetics")["paragraphs"]
    ] == ["mbti", "thinking_style", "aesthetic_preferences"]
    assert block(data, "zh", "research")["heading"] == "研究方向"
    assert block(data, "en", "research")["heading"] == "Research"
    assert block(data, "zh", "interests")["heading"] == "平时喜欢"
    assert block(data, "en", "interests")["heading"] == "Things I Like"
    assert block(data, "zh", "skills")["heading"] == "还会这些"
    assert block(data, "en", "skills")["heading"] == "A Few Other Skills"
    assert block(data, "zh", "links")["heading"] == "找到我"
    assert block(data, "en", "links")["heading"] == "Find Me"


def test_about_education_fields_are_aligned_without_invented_affiliations():
    data = about_data()
    zh_items = block(data, "zh", "education")["items"]
    en_items = block(data, "en", "education")["items"]

    assert len(zh_items) == len(en_items) == 2
    assert [[field["id"] for field in item["fields"]] for item in zh_items] == [
        ["time", "institution", "affiliation", "stage"],
        ["time", "institution", "affiliation", "stage"],
    ]
    assert [field["value"] for field in zh_items[0]["fields"]] == [
        "2015–2019",
        "西安交通大学",
        "自动化（少年班）",
        "本科",
    ]
    assert [field["value"] for field in zh_items[1]["fields"]] == [
        "2019–2026",
        "南京大学",
        "计算机科学与技术",
        "直博",
    ]
    assert zh_items[0]["fields"][2]["label"] == "专业"
    assert zh_items[1]["fields"][2]["label"] == "院系"
    assert "电信学院" not in ABOUT_PATH.read_text(encoding="utf-8")


def test_about_research_interests_and_skills_use_the_approved_full_descriptions():
    data = about_data()

    assert len(block(data, "zh", "research")["items"]) == 3
    assert len(block(data, "en", "research")["items"]) == 3
    assert len(block(data, "zh", "interests")["items"]) == 11
    assert len(block(data, "en", "interests")["items"]) == 11
    assert len(block(data, "zh", "skills")["items"]) == 3
    assert len(block(data, "en", "skills")["items"]) == 3

    zh_interest_ids = [
        item["id"] for item in block(data, "zh", "interests")["items"]
    ]
    assert zh_interest_ids == [
        "board_games",
        "chess_and_cards",
        "acg",
        "league_of_legends",
        "minecraft",
        "3d_printing",
        "badminton",
        "traditional_archery",
        "swimming",
        "smart_home",
        "llm_applications",
    ]

    visible = ABOUT_PATH.read_text(encoding="utf-8")
    for expected in (
        "Board Game Arena",
        "https://boardgamearena.com/",
        "yiyuiii",
        "A1 mini",
        "Fusion 360",
        "Home Assistant",
        "ChatGPT",
        "Ark Coding Plan / Agent Plan",
        "Kimi",
        "30 磅",
        "周杰伦",
    ):
        assert expected in visible


def test_about_link_data_has_exactly_four_real_destinations():
    data = about_data()
    zh_links = block(data, "zh", "links")["items"]
    en_links = block(data, "en", "links")["items"]

    assert [item["id"] for item in zh_links] == [
        "github",
        "email",
        "rss",
        "paypal",
    ]
    assert [item["id"] for item in en_links] == [
        "github",
        "email",
        "rss",
        "paypal",
    ]
    assert [item["url"] for item in zh_links] == [
        "https://github.com/Yiyuiii",
        "mailto:yiyuiii@foxmail.com",
        "/feed.xml",
        "https://paypal.me/yiyuiii",
    ]
    assert [item["label"] for item in zh_links] == [
        "GitHub",
        "电子邮件",
        "RSS",
        "PayPal",
    ]
    assert [item["label"] for item in en_links] == [
        "GitHub",
        "Email",
        "RSS",
        "PayPal",
    ]


def test_about_data_excludes_private_inferred_and_obsolete_profile_copy():
    source = ABOUT_PATH.read_text(encoding="utf-8")

    for phrase in PRIVATE_OR_OBSOLETE_COPY:
        assert phrase not in source
    for removed_tool in ("Python", "PyTorch", "Linux"):
        assert removed_tool not in source


def test_about_route_files_are_thin_shells_for_one_shared_renderer():
    for path in ("_pages/about.md", "_pages/about.en.md"):
        _, body = parse_page(path)

        assert body.strip() == "{% include about-profile.liquid %}"
        assert "Ciallo" not in body
        assert "about-section" not in body
        assert "about-links.liquid" not in body


def test_about_renderer_supports_every_approved_block_type_and_safe_markdown():
    renderer = text("_includes/about-profile.liquid")

    assert "site.data.about[lang_key]" in renderer
    assert "site.data.about.display.hidden_blocks" in renderer
    assert "{% for block in profile.blocks %}" in renderer
    assert "{% unless hidden_blocks contains block.id %}" in renderer
    assert "{% case block.type %}" in renderer
    for block_type in ("greeting", "prose", "education", "details", "links"):
        assert f"when '{block_type}'" in renderer
    assert "about-{{ block.id }}" in renderer
    assert "about-{{ block.id }}-heading" in renderer
    assert renderer.count("about-greeting") == 1
    assert "<dl" in renderer
    assert "<dt" in renderer
    assert "<dd" in renderer
    assert "sr-only" in renderer
    assert "| escape | markdownify" in renderer
    assert "relative_url" in renderer
    assert "about-icon.liquid icon=item.icon" in renderer


def test_about_icons_are_decorative_and_selected_by_stable_keys():
    icons = text("_includes/about-icon.liquid")

    for icon in ("github", "email", "rss", "paypal"):
        assert f"include.icon == '{icon}'" in icons
    assert icons.count('aria-hidden="true"') == 4
    assert icons.count('focusable="false"') == 4
    assert icons.count('width="20"') == 4
    assert icons.count('height="20"') == 4
    assert not (ROOT / "_includes" / "about-links.liquid").exists()

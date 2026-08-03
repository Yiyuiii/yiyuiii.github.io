import json
from pathlib import Path

import pytest
import yaml

from scripts.translation_guard import (
    TranslationError,
    about_source_hash,
    check_documents,
    parse_document,
    source_hash,
    update_about_profile_hash,
    update_translation_hash,
    validate_about_profile,
    validate_site_text,
)


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures" / "translations"


def test_about_source_hash_ignores_yaml_formatting_and_mapping_order(tmp_path):
    first = tmp_path / "first.yml"
    second = tmp_path / "second.yml"
    first.write_text(
        """
# comment does not belong to the content tree
translation:
  source_hash: ignored
zh:
  blocks:
    - id: greeting
      type: greeting
      text: Ciallo
      aria_label: 关于 yiyuiii
en:
  blocks: []
""".lstrip(),
        encoding="utf-8",
    )
    second.write_text(
        """
en: {blocks: []}
zh:
  blocks:
  - aria_label: "关于 yiyuiii"
    text: 'Ciallo'
    type: greeting
    id: greeting
translation: {source_hash: different}
""".lstrip(),
        encoding="utf-8",
    )

    assert about_source_hash(first) == about_source_hash(second)


def test_about_source_hash_preserves_block_order(tmp_path):
    first = tmp_path / "first.yml"
    second = tmp_path / "second.yml"
    data = {
        "translation": {"source_hash": "ignored"},
        "zh": {
            "blocks": [
                {"id": "greeting", "type": "greeting", "text": "Ciallo"},
                {"id": "aesthetics", "type": "prose", "heading": "审美倾向"},
            ]
        },
        "en": {"blocks": []},
    }
    first.write_text(
        yaml.safe_dump(data, allow_unicode=True, sort_keys=False),
        encoding="utf-8",
    )
    data["zh"]["blocks"].reverse()
    second.write_text(
        yaml.safe_dump(data, allow_unicode=True, sort_keys=False),
        encoding="utf-8",
    )

    assert about_source_hash(first) != about_source_hash(second)


def valid_about_data():
    return {
        "display": {"hidden_blocks": ["education"]},
        "translation": {"source_hash": ""},
        "zh": {
            "blocks": [
                {
                    "id": "greeting",
                    "type": "greeting",
                    "text": "Ciallo",
                    "aria_label": "关于 yiyuiii",
                },
                {
                    "id": "education",
                    "type": "education",
                    "heading": "教育经历",
                    "items": [
                        {
                            "id": "school",
                            "fields": [
                                {"id": "time", "label": "时间", "value": "2015–2019"},
                                {"id": "institution", "label": "学校", "value": "大学"},
                                {"id": "affiliation", "label": "专业", "value": "自动化"},
                                {"id": "stage", "label": "阶段", "value": "本科"},
                            ],
                        }
                    ],
                },
                {
                    "id": "interests",
                    "type": "details",
                    "heading": "兴趣方向",
                    "items": [
                        {
                            "id": "board_games",
                            "name": "桌游",
                            "description": "常在 [BGA](https://boardgamearena.com/) 玩。",
                        }
                    ],
                },
                {
                    "id": "links",
                    "type": "links",
                    "heading": "我的链接",
                    "intro": {
                        "id": "intro",
                        "paragraphs": [
                            {
                                "id": "contact",
                                "style": "normal",
                                "inline_markdown": "通过[电子邮件](mailto:a@example.com)联系。",
                            }
                        ],
                    },
                    "items": [
                        {
                            "id": "github",
                            "icon": "github",
                            "label": "GitHub",
                            "url": "https://github.com/Yiyuiii",
                            "relative": False,
                            "new_tab": True,
                        }
                    ],
                },
            ]
        },
        "en": {
            "blocks": [
                {
                    "id": "greeting",
                    "type": "greeting",
                    "text": "Ciallo",
                    "aria_label": "About yiyuiii",
                },
                {
                    "id": "education",
                    "type": "education",
                    "heading": "Education",
                    "items": [
                        {
                            "id": "school",
                            "fields": [
                                {"id": "time", "label": "Time", "value": "2015–2019"},
                                {
                                    "id": "institution",
                                    "label": "University",
                                    "value": "University",
                                },
                                {
                                    "id": "affiliation",
                                    "label": "Program",
                                    "value": "Automation",
                                },
                                {"id": "stage", "label": "Degree", "value": "Bachelor's"},
                            ],
                        }
                    ],
                },
                {
                    "id": "interests",
                    "type": "details",
                    "heading": "Interests",
                    "items": [
                        {
                            "id": "board_games",
                            "name": "Board games",
                            "description": "I often play on [BGA](https://boardgamearena.com/).",
                        }
                    ],
                },
                {
                    "id": "links",
                    "type": "links",
                    "heading": "My Links",
                    "intro": {
                        "id": "intro",
                        "paragraphs": [
                            {
                                "id": "contact",
                                "style": "normal",
                                "inline_markdown": "Contact me by [email](mailto:a@example.com).",
                            }
                        ],
                    },
                    "items": [
                        {
                            "id": "github",
                            "icon": "github",
                            "label": "GitHub",
                            "url": "https://github.com/Yiyuiii",
                            "relative": False,
                            "new_tab": True,
                        }
                    ],
                },
            ]
        },
    }


def write_about(path, data):
    path.write_text(
        yaml.safe_dump(data, allow_unicode=True, sort_keys=False, width=1000),
        encoding="utf-8",
    )
    data["translation"]["source_hash"] = about_source_hash(path)
    path.write_text(
        yaml.safe_dump(data, allow_unicode=True, sort_keys=False, width=1000),
        encoding="utf-8",
    )


def test_about_profile_allows_translated_visible_text_with_parallel_structure(tmp_path):
    path = tmp_path / "about.yml"
    write_about(path, valid_about_data())

    validate_about_profile(path)


def test_about_profile_accepts_language_neutral_hidden_blocks(tmp_path):
    path = tmp_path / "about.yml"
    write_about(path, valid_about_data())

    validate_about_profile(path)


def test_about_profile_rejects_unknown_hidden_block_ids(tmp_path):
    path = tmp_path / "about.yml"
    data = valid_about_data()
    data["display"]["hidden_blocks"] = ["missing"]
    write_about(path, data)

    with pytest.raises(TranslationError, match="unknown hidden block"):
        validate_about_profile(path)


def test_about_profile_requires_unique_string_hidden_block_ids(tmp_path):
    path = tmp_path / "about.yml"
    data = valid_about_data()
    data["display"]["hidden_blocks"] = ["education", "education"]
    write_about(path, data)

    with pytest.raises(TranslationError, match="unique non-empty strings"):
        validate_about_profile(path)


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (lambda data: data["en"]["blocks"].reverse(), "id order"),
        (
            lambda data: data["en"]["blocks"][1].update(type="details"),
            "shared value",
        ),
        (
            lambda data: data["en"]["blocks"][1]["items"][0]["fields"].pop(),
            "length",
        ),
        (
            lambda data: data["en"]["blocks"][3]["items"][0].update(icon="email"),
            "shared value",
        ),
        (
            lambda data: data["en"]["blocks"][0].update(id="other"),
            "id order",
        ),
    ],
)
def test_about_profile_rejects_bilingual_structure_drift(tmp_path, mutate, message):
    path = tmp_path / "about.yml"
    data = valid_about_data()
    mutate(data)
    write_about(path, data)

    with pytest.raises(TranslationError, match=message):
        validate_about_profile(path)


@pytest.mark.parametrize("value", ["", "   ", "TODO", "TBD later", "待翻译"])
def test_about_profile_rejects_incomplete_english_strings(tmp_path, value):
    path = tmp_path / "about.yml"
    data = valid_about_data()
    data["en"]["blocks"][2]["items"][0]["description"] = value
    write_about(path, data)

    with pytest.raises(TranslationError, match="English"):
        validate_about_profile(path)


def test_about_profile_rejects_duplicate_nested_ids(tmp_path):
    path = tmp_path / "about.yml"
    data = valid_about_data()
    duplicate_zh = json.loads(
        json.dumps(data["zh"]["blocks"][2]["items"][0], ensure_ascii=False)
    )
    duplicate_en = json.loads(
        json.dumps(data["en"]["blocks"][2]["items"][0], ensure_ascii=False)
    )
    data["zh"]["blocks"][2]["items"].append(duplicate_zh)
    data["en"]["blocks"][2]["items"].append(duplicate_en)
    write_about(path, data)

    with pytest.raises(TranslationError, match="duplicates"):
        validate_about_profile(path)


@pytest.mark.parametrize(
    "invalid_id",
    ["min~ecraft", "bad-id", "BadId", "_leading", "trailing_", "two__underscores"],
)
def test_about_profile_requires_lower_snake_ids(tmp_path, invalid_id):
    path = tmp_path / "about.yml"
    data = valid_about_data()
    for language in ("zh", "en"):
        data[language]["blocks"][2]["items"][0]["id"] = invalid_id
    write_about(path, data)

    with pytest.raises(TranslationError, match="lowercase letters, digits"):
        validate_about_profile(path)


def test_about_profile_allows_ids_that_start_with_a_digit(tmp_path):
    path = tmp_path / "about.yml"
    data = valid_about_data()
    for language in ("zh", "en"):
        data[language]["blocks"][2]["items"][0]["id"] = "3d_printing"
    write_about(path, data)

    validate_about_profile(path)


def test_about_profile_rejects_keys_the_renderer_would_ignore(tmp_path):
    path = tmp_path / "about.yml"
    data = valid_about_data()
    data["zh"]["blocks"][2]["items"][0]["ignored"] = "不会显示"
    data["en"]["blocks"][2]["items"][0]["ignored"] = "Not rendered"
    write_about(path, data)

    with pytest.raises(TranslationError, match="keys"):
        validate_about_profile(path)


def test_about_profile_requires_intro_inside_the_links_block(tmp_path):
    path = tmp_path / "about.yml"
    data = valid_about_data()
    for language in ("zh", "en"):
        data[language]["blocks"][3].pop("intro")
    write_about(path, data)

    with pytest.raises(TranslationError, match="intro must contain"):
        validate_about_profile(path)


def test_about_profile_rejects_link_intro_ids_that_collide_with_blocks(tmp_path):
    path = tmp_path / "about.yml"
    data = valid_about_data()
    for language in ("zh", "en"):
        data[language]["blocks"][3]["intro"]["id"] = "education"
    write_about(path, data)

    with pytest.raises(TranslationError, match="duplicates 'education'"):
        validate_about_profile(path)


@pytest.mark.parametrize(
    ("url", "relative"),
    [
        ("javascript:alert(1)", False),
        ("data:text/html,unsafe", False),
        ("http://example.com", False),
        ("https://", False),
        ("mailto:", False),
        ("feed.xml", True),
        ("//example.com/feed.xml", True),
        ("/feed.xml", False),
    ],
)
def test_about_profile_rejects_unsafe_or_inconsistent_link_urls(
    tmp_path, url, relative
):
    path = tmp_path / "about.yml"
    data = valid_about_data()
    for language in ("zh", "en"):
        link = data[language]["blocks"][3]["items"][0]
        link["url"] = url
        link["relative"] = relative
    write_about(path, data)

    with pytest.raises(TranslationError, match="URL"):
        validate_about_profile(path)


def test_about_profile_rejects_unknown_link_icons(tmp_path):
    path = tmp_path / "about.yml"
    data = valid_about_data()
    for language in ("zh", "en"):
        data[language]["blocks"][3]["items"][0]["icon"] = "GitHub"
    write_about(path, data)

    with pytest.raises(TranslationError, match="icon"):
        validate_about_profile(path)


@pytest.mark.parametrize("field", ["relative", "new_tab"])
def test_about_profile_requires_boolean_link_behavior_flags(tmp_path, field):
    path = tmp_path / "about.yml"
    data = valid_about_data()
    for language in ("zh", "en"):
        data[language]["blocks"][3]["items"][0][field] = "false"
    write_about(path, data)

    with pytest.raises(TranslationError, match="boolean"):
        validate_about_profile(path)


@pytest.mark.parametrize(
    "value",
    [
        "<em>raw</em>",
        "![image](https://example.com/image.png)",
        "# heading",
        "- list",
        "`code`",
        "```code```",
        '[link](https://example.com "title")',
        "[link](http://example.com)",
    ],
)
def test_about_profile_rejects_markdown_outside_the_safe_subset(tmp_path, value):
    path = tmp_path / "about.yml"
    data = valid_about_data()
    data["zh"]["blocks"][2]["items"][0]["description"] = value
    data["en"]["blocks"][2]["items"][0]["description"] = value
    write_about(path, data)

    with pytest.raises(TranslationError, match="Markdown"):
        validate_about_profile(path)


def test_about_hash_refresh_requires_valid_complete_bilingual_data(tmp_path):
    path = tmp_path / "about.yml"
    data = valid_about_data()
    data["translation"]["source_hash"] = "stale"
    path.write_text(
        yaml.safe_dump(data, allow_unicode=True, sort_keys=False, width=1000),
        encoding="utf-8",
    )

    digest = update_about_profile_hash(path)

    updated = yaml.safe_load(path.read_text(encoding="utf-8"))
    assert digest == about_source_hash(path)
    assert updated["translation"]["source_hash"] == digest


def test_hash_is_stable_across_line_endings_unicode_and_yaml_order():
    first = source_hash(
        {
            "title": "Café",
            "tags": ["one", "two"],
            "body": "a  \r\nb\n",
        }
    )
    second = source_hash(
        {
            "body": "a\nb",
            "tags": ["one", "two"],
            "title": "Cafe\u0301",
        }
    )

    assert first == second
    assert len(first) == 64
    assert first == first.lower()


def test_hash_changes_when_tracked_body_or_frontmatter_changes():
    baseline = source_hash({"title": "Title", "body": "Body"})

    assert source_hash({"title": "Changed", "body": "Body"}) != baseline
    assert source_hash({"title": "Title", "body": "Changed"}) != baseline
    assert source_hash({"title": "Title", "body": "Body", "layout": "page"}) == baseline


def test_end_to_end_frontmatter_and_body_hash_is_key_order_independent(tmp_path):
    first = tmp_path / "first.md"
    second = tmp_path / "second.md"
    first.write_text(
        "---\ntitle: Café\ntags: [one, two]\n---\n\na  \nb\n",
        encoding="utf-8",
    )
    second.write_text(
        "---\ntags:\n  - one\n  - two\ntitle: Cafe\u0301\n---\n\na\nb\n",
        encoding="utf-8",
    )

    assert source_hash(parse_document(first).hash_input()) == source_hash(
        parse_document(second).hash_input()
    )


def test_write_hash_updates_only_translation_metadata_and_keeps_body(tmp_path):
    source = tmp_path / "source.md"
    translation = tmp_path / "translation.md"
    source.write_text(
        "---\ntitle: Source\ntranslation_key: item\nlang: zh\n---\n\n源正文。\n",
        encoding="utf-8",
    )
    translation.write_text(
        "---\ntitle: Translation\ntranslation_key: item\ntranslation_source: source.md\nlang: en\ntranslation_status: stale\nsource_hash: old\n---\n\nTranslated body.\n",
        encoding="utf-8",
    )

    update_translation_hash(translation, root=tmp_path)
    updated = parse_document(translation)

    assert updated.body == "\nTranslated body.\n"
    assert updated.frontmatter["translation_status"] == "current"
    assert updated.frontmatter["source_hash"] == source_hash(
        parse_document(source).hash_input()
    )


def test_production_rejects_stale_hash_and_status(tmp_path):
    source = tmp_path / "source.md"
    translation = tmp_path / "translation.md"
    source.write_text(
        "---\ntitle: Source\ntranslation_key: item\nlang: zh\n---\n\nCurrent.\n",
        encoding="utf-8",
    )
    translation.write_text(
        "---\ntitle: Translation\ntranslation_key: item\ntranslation_source: source.md\nlang: en\ntranslation_status: stale\nsource_hash: old\n---\n\nTranslated.\n",
        encoding="utf-8",
    )

    with pytest.raises(TranslationError, match="stale"):
        check_documents([source, translation], root=tmp_path, production=True)


def test_mismatched_translation_object_id_is_rejected(tmp_path):
    source = tmp_path / "source.md"
    translation = tmp_path / "translation.md"
    source.write_text(
        "---\ntitle: Source\ntranslation_key: actual\nlang: zh\n---\n\nSource.\n",
        encoding="utf-8",
    )
    translation.write_text(
        "---\ntitle: Translation\ntranslation_key: different\ntranslation_source: source.md\nlang: en\ntranslation_status: current\nsource_hash: ignored\n---\n\nTranslation.\n",
        encoding="utf-8",
    )

    with pytest.raises(TranslationError, match="translation_key"):
        check_documents([source, translation], root=tmp_path, production=True)


def test_duplicate_language_mapping_is_rejected(tmp_path):
    first = tmp_path / "first.md"
    second = tmp_path / "second.md"
    content = "---\ntitle: Item\ntranslation_key: duplicate\nlang: zh\n---\n\nBody.\n"
    first.write_text(content, encoding="utf-8")
    second.write_text(content, encoding="utf-8")

    with pytest.raises(TranslationError, match="duplicate"):
        check_documents([first, second], root=tmp_path, production=True)


def test_missing_translation_is_allowed(tmp_path):
    source = tmp_path / "source.md"
    source.write_text(
        "---\ntitle: Source only\ntranslation_key: source-only\nlang: zh\n---\n\nBody.\n",
        encoding="utf-8",
    )

    check_documents([source], root=tmp_path, production=True)


def test_post_revisions_require_strict_ordered_iso_strings(tmp_path):
    valid = tmp_path / "valid.md"
    valid.write_text(
        """---
title: Valid
date: 2022-11-11 00:00:00 +0800
lang: zh
revisions:
  - date: "2022-11-11"
    note: 初稿
  - date: "2026-07-29"
    note: 资料增补
---

Body.
""",
        encoding="utf-8",
    )

    check_documents([valid], root=tmp_path, production=True)

    invalid_cases = {
        "unquoted": """revisions:
  - date: 2022-11-11
    note: 初稿
""",
        "empty": "revisions: []\n",
        "reverse": """revisions:
  - date: "2026-07-29"
    note: 修订
  - date: "2022-11-11"
    note: 初稿
""",
        "mismatch": """revisions:
  - date: "2022-11-12"
    note: 初稿
""",
        "blank": """revisions:
  - date: "2022-11-11"
    note: " "
""",
    }
    for name, revisions in invalid_cases.items():
        path = tmp_path / f"{name}.md"
        path.write_text(
            "---\n"
            f"title: {name}\n"
            "date: 2022-11-11 00:00:00 +0800\n"
            "lang: zh\n"
            f"{revisions}"
            "---\n\nBody.\n",
            encoding="utf-8",
        )
        with pytest.raises(TranslationError, match="revisions"):
            check_documents([path], root=tmp_path, production=True)


def test_translated_posts_require_aligned_revision_dates(tmp_path):
    source = tmp_path / "source.md"
    translation = tmp_path / "translation.md"
    source.write_text(
        """---
title: Source
date: 2022-11-11 00:00:00 +0800
translation_key: item
lang: zh
revisions:
  - date: "2022-11-11"
    note: 初稿
  - date: "2026-07-29"
    note: 内容修订
---

Source.
""",
        encoding="utf-8",
    )
    source_document = parse_document(source)
    translation.write_text(
        f"""---
title: Translation
date: 2022-11-11 00:00:00 +0800
translation_key: item
translation_source: source.md
lang: en
translation_status: current
source_hash: {source_hash(source_document.hash_input())}
revisions:
  - date: "2022-11-11"
    note: First published
  - date: "2026-07-30"
    note: Content revision
---

Translation.
""",
        encoding="utf-8",
    )

    with pytest.raises(TranslationError, match="revision dates"):
        check_documents([source, translation], root=tmp_path, production=True)


def test_translated_posts_cannot_omit_source_revision_dates(tmp_path):
    source = tmp_path / "source.md"
    translation = tmp_path / "translation.md"
    source.write_text(
        """---
title: Source
date: 2022-11-11 00:00:00 +0800
translation_key: item
lang: zh
revisions:
  - date: "2022-11-11"
    note: 初稿
  - date: "2026-07-29"
    note: 内容修订
---

Source.
""",
        encoding="utf-8",
    )
    source_document = parse_document(source)
    translation.write_text(
        f"""---
title: Translation
date: 2022-11-11 00:00:00 +0800
translation_key: item
translation_source: source.md
lang: en
translation_status: current
source_hash: {source_hash(source_document.hash_input())}
---

Translation.
""",
        encoding="utf-8",
    )

    with pytest.raises(TranslationError, match="revision dates"):
        check_documents([source, translation], root=tmp_path, production=True)


def test_site_text_requires_parallel_keys_and_rejects_han_in_english():
    valid = {
        "zh": {"nav": {"writing": "随笔", "github": "GitHub"}},
        "en": {"nav": {"writing": "Writing", "github": "GitHub"}},
    }

    validate_site_text(valid)

    missing = json.loads(json.dumps(valid, ensure_ascii=False))
    del missing["en"]["nav"]["writing"]
    with pytest.raises(TranslationError, match="parallel keys"):
        validate_site_text(missing)

    leaked = json.loads(json.dumps(valid, ensure_ascii=False))
    leaked["en"]["nav"]["writing"] = "随笔"
    with pytest.raises(TranslationError, match="Chinese characters"):
        validate_site_text(leaked)


def test_committed_fixture_can_receive_a_deterministic_hash(tmp_path):
    source = tmp_path / "source.md"
    translation = tmp_path / "translation.md"
    source.write_text((FIXTURES / "source.md").read_text(encoding="utf-8"), encoding="utf-8")
    translation.write_text(
        (FIXTURES / "translation.md").read_text(encoding="utf-8"),
        encoding="utf-8",
    )

    update_translation_hash(translation, root=ROOT)
    document = parse_document(translation)

    assert document.frontmatter["source_hash"] != "PLACEHOLDER"
    assert yaml.safe_load(
        document.frontmatter_text
    )["translation_status"] == "current"

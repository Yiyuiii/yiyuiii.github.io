from pathlib import Path

import pytest
import yaml

from scripts.translation_guard import (
    TranslationError,
    check_post_contracts,
    load_translation_exemptions,
    parse_document,
    post_structure_signature,
    source_hash,
)


ROOT = Path(__file__).resolve().parents[1]


def write_post(root, name, frontmatter, body="Body.\n"):
    path = root / "_posts" / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "---\n"
        + yaml.safe_dump(frontmatter, allow_unicode=True, sort_keys=False)
        + "---\n\n"
        + body,
        encoding="utf-8",
    )
    return path


def source_frontmatter(**updates):
    data = {
        "title": "源文章",
        "uid": "202608010900",
        "author": "Yiyu Chen",
        "date": "2026-08-01 09:00:00 +0800",
        "lang": "zh",
        "permalink": "/posts/source-item/",
        "translation_key": "post-202608010900",
        "thumbnail": "/assets/posts/202608010900/cover.webp",
        "article_cover": {
            "alt": "源文章题图",
            "caption": (
                "题图：[来源](https://example.com/source)，"
                "[CC0 1.0](https://example.com/license)。"
            ),
        },
        "math": True,
    }
    data.update(updates)
    return data


def translation_frontmatter(source, source_path, **updates):
    data = {
        "title": "Translated article",
        "uid": source.frontmatter["uid"],
        "author": source.frontmatter["author"],
        "date": source.frontmatter["date"],
        "lang": "en",
        "permalink": "/en/posts/source-item/",
        "translation_key": source.frontmatter["translation_key"],
        "translation_url": source.frontmatter["permalink"],
        "translation_source": source_path.as_posix(),
        "translation_status": "current",
        "source_hash": source_hash(source.hash_input()),
        "thumbnail": source.frontmatter["thumbnail"],
        "article_cover": {
            "alt": "Cover image for the translated article",
            "caption": (
                "Cover: [source](https://example.com/source), "
                "[CC0 1.0](https://example.com/license)."
            ),
        },
        "math": True,
    }
    data.update(updates)
    return data


def paired_posts(tmp_path, *, translated_body=None, translation_updates=None):
    source_body = """## Section

![说明](/assets/posts/202608010900/figure.webp)

Inline $x + y$ and display:

$$
x = y
$$

```python
print("stable")
```

Keep `inline_token` and [external](https://example.com/reference).

| A | B |
|---|---|
| 1 | 2 |

{: #stable-anchor}
"""
    source_data = source_frontmatter(translation_url="/en/posts/source-item/")
    source_path = write_post(tmp_path, "2026-08-01-source.zh.md", source_data, source_body)
    source = parse_document(source_path)
    translation_data = translation_frontmatter(
        source,
        source_path.relative_to(tmp_path),
        **(translation_updates or {}),
    )
    translation_path = write_post(
        tmp_path,
        "2026-08-01-source.en.md",
        translation_data,
        translated_body or source_body.replace("Section", "Section in English"),
    )
    return source_path, translation_path


def test_committed_posts_have_stable_identity_urls_and_no_translation_exemptions():
    paths = sorted((ROOT / "_posts").glob("*.md"))
    documents = [parse_document(path) for path in paths]
    exemptions = load_translation_exemptions(
        ROOT / "_data" / "translation_exemptions.yml",
        root=ROOT,
    )

    groups = {}
    for document in documents:
        groups.setdefault(document.frontmatter["translation_key"], []).append(document)

    assert len(groups) == 18
    singleton_keys = {key for key, members in groups.items() if len(members) == 1}
    assert exemptions == {}
    assert singleton_keys == set()
    assert all(len(members) == 2 for members in groups.values())
    for document in documents:
        data = document.frontmatter
        assert isinstance(data["uid"], str) and data["uid"].isdigit()
        assert data["translation_key"] == f"post-{data['uid']}"
        assert data["permalink"].startswith(
            "/en/posts/" if data["lang"] == "en" else "/posts/"
        )
        assert data["permalink"].endswith("/")
        if len(groups[data["translation_key"]]) == 1:
            assert "translation_url" not in data
        else:
            assert data["translation_url"].startswith("/")
            assert data["translation_url"].endswith("/")

    check_post_contracts(documents, exemptions=exemptions, root=ROOT, production=True)


def test_production_rejects_a_new_singleton_even_with_an_exact_exemption(tmp_path):
    source_path = write_post(tmp_path, "2026-08-01-new.md", source_frontmatter())
    source = parse_document(source_path)

    with pytest.raises(TranslationError, match="missing en counterpart"):
        check_post_contracts([source], exemptions={}, root=tmp_path, production=True)

    exemption = {
        source.frontmatter["translation_key"]: {
            "source_language": "zh",
            "source": source_path.relative_to(tmp_path).as_posix(),
            "missing_language": "en",
        }
    }
    with pytest.raises(
        TranslationError, match="production translation exemptions must remain empty"
    ):
        check_post_contracts(
            [source],
            exemptions=exemption,
            root=tmp_path,
            production=True,
        )

    # Non-production tooling may still parse a historically shaped record,
    # but the release gate above can never use it to publish a singleton.
    check_post_contracts(
        [source], exemptions=exemption, root=tmp_path, production=False
    )


def test_completed_pair_requires_reciprocal_urls_and_removes_legacy_exemption(tmp_path):
    source_path, translation_path = paired_posts(tmp_path)
    documents = [parse_document(source_path), parse_document(translation_path)]

    check_post_contracts(documents, exemptions={}, root=tmp_path, production=True)

    stale_exemption = {
        "post-202608010900": {
            "source_language": "zh",
            "source": source_path.relative_to(tmp_path).as_posix(),
            "missing_language": "en",
        }
    }
    with pytest.raises(TranslationError, match="stale exemption"):
        check_post_contracts(
            documents,
            exemptions=stale_exemption,
            root=tmp_path,
            production=False,
        )

    broken = parse_document(translation_path)
    broken.frontmatter["translation_url"] = "/wrong/"
    with pytest.raises(TranslationError, match="translation_url"):
        check_post_contracts(
            [documents[0], broken],
            exemptions={},
            root=tmp_path,
            production=True,
        )


@pytest.mark.parametrize(
    ("changed", "message"),
    [
        ("![说明](/assets/posts/202608010900/other.webp)", "images"),
        ("Inline $x - y$ and display:", "math"),
        ('print("changed")', "code fences"),
        ("`changed_token`", "inline code"),
        ("[external](https://example.com/changed)", "external links"),
        ("| 1 | 2 | 3 |", "table shapes"),
        ("### Section in English", "heading outline"),
        ("{: #other-anchor}", "explicit anchors"),
    ],
)
def test_completed_pair_rejects_protected_structure_drift(tmp_path, changed, message):
    source_path, translation_path = paired_posts(tmp_path)
    source = parse_document(source_path)
    translation = parse_document(translation_path)
    replacements = {
        "images": "![说明](/assets/posts/202608010900/figure.webp)",
        "math": "Inline $x + y$ and display:",
        "code fences": 'print("stable")',
        "inline code": "`inline_token`",
        "external links": "[external](https://example.com/reference)",
        "table shapes": "| 1 | 2 |",
        "heading outline": "## Section in English",
        "explicit anchors": "{: #stable-anchor}",
    }
    translation = translation.__class__(
        path=translation.path,
        frontmatter=translation.frontmatter,
        body=translation.body.replace(replacements[message], changed),
        frontmatter_text=translation.frontmatter_text,
    )

    with pytest.raises(TranslationError, match=message):
        check_post_contracts(
            [source, translation], exemptions={}, root=tmp_path, production=True
        )


def test_structure_signature_localizes_text_but_preserves_protected_tokens():
    zh = """## 中文标题
![中文替代文字](/assets/a.webp)
$x+y$
```text
literal
```
{: #shared}
"""
    en = zh.replace("中文标题", "English heading").replace(
        "中文替代文字", "English alternative text"
    )

    assert post_structure_signature(zh) == post_structure_signature(en)


def test_mermaid_signature_allows_only_parenthesized_node_label_localization():
    zh = """```mermaid
graph LR
D1(骰子一)
A1(打出卡牌)
D1 --> A1
```
"""
    en = """```mermaid
graph LR
D1(Die one)
A1(Play the card)
D1 --> A1
```
"""

    assert post_structure_signature(zh) == post_structure_signature(en)


@pytest.mark.parametrize(
    "changed",
    [
        """```mermaid
graph LR
D2(Die one)
A1(Play the card)
D2 --> A1
```
""",
        """```mermaid
graph LR
D1(Die one)
A1(Play the card)
```
""",
        """```mermaid
graph LR
D1(Die one)
A1(Play the card)
A1 --> D1
```
""",
        """```mermaid
graph TD
D1(Die one)
A1(Play the card)
D1 --> A1
```
""",
        """```mermaid
graph LR
D1((Die one))
A1(Play the card)
D1 --> A1
```
""",
    ],
    ids=(
        "changed-node-id",
        "deleted-edge",
        "reversed-edge",
        "changed-graph-direction",
        "changed-node-shape",
    ),
)
def test_mermaid_signature_rejects_non_label_drift(changed):
    source = """```mermaid
graph LR
D1(骰子一)
A1(打出卡牌)
D1 --> A1
```
"""

    assert post_structure_signature(source) != post_structure_signature(changed)


def test_non_mermaid_fence_still_requires_literal_content():
    source = """```text
D1(中文标签)
```
"""
    translation = """```text
D1(English label)
```
"""

    assert post_structure_signature(source) != post_structure_signature(translation)


def test_internal_post_links_can_map_to_the_same_translation_identity():
    zh = "[相关文章](/posts/related/#shared)"
    en = "[Related article](/en/posts/related/#shared)"
    mapping = {
        "/posts/related/": "post:202608010901",
        "/en/posts/related/": "post:202608010901",
    }

    assert post_structure_signature(
        zh, internal_link_map=mapping
    ) == post_structure_signature(en, internal_link_map=mapping)
    assert post_structure_signature(zh) != post_structure_signature(en)


def test_source_hash_tracks_shared_post_metadata_but_not_routing_bookkeeping():
    baseline = source_frontmatter(body="Body")

    for key in ("uid", "date", "author", "thumbnail", "article_cover", "math"):
        changed = dict(baseline)
        if key == "math":
            changed[key] = False
        elif key == "article_cover":
            changed[key] = {"alt": "changed", "caption": "changed"}
        else:
            changed[key] = "changed"
        assert source_hash(changed) != source_hash(baseline), key

    routing = dict(baseline, permalink="/different/", translation_url="/en/different/")
    assert source_hash(routing) == source_hash(baseline)


def test_article_cover_allows_localized_copy_with_shared_image_and_link_order(tmp_path):
    source_path, translation_path = paired_posts(tmp_path)

    check_post_contracts(
        [parse_document(source_path), parse_document(translation_path)],
        exemptions={},
        root=tmp_path,
        production=True,
    )


def test_article_cover_rejects_caption_link_drift(tmp_path):
    source_path, translation_path = paired_posts(tmp_path)
    source = parse_document(source_path)
    translation = parse_document(translation_path)
    translation.frontmatter["article_cover"]["caption"] = translation.frontmatter[
        "article_cover"
    ]["caption"].replace("https://example.com/license", "https://example.com/other")

    with pytest.raises(TranslationError, match="article cover caption links"):
        check_post_contracts(
            [source, translation], exemptions={}, root=tmp_path, production=True
        )


@pytest.mark.parametrize(
    "cover",
    [
        None,
        {"alt": "", "caption": "Caption"},
        {"alt": "![unsafe]", "caption": "Caption"},
        {"alt": "Safe", "caption": "<span>unsafe</span>"},
        {"alt": "Safe", "caption": "![image](https://example.com/a.webp)"},
        {"alt": "Safe", "caption": "[source](http://example.com/source)"},
        {"alt": "Safe", "caption": "Caption", "ignored": "value"},
    ],
)
def test_article_cover_rejects_missing_incomplete_or_unsafe_metadata(tmp_path, cover):
    source_path, translation_path = paired_posts(tmp_path)
    source = parse_document(source_path)
    translation = parse_document(translation_path)
    translation.frontmatter["article_cover"] = cover

    with pytest.raises(TranslationError, match="article_cover"):
        check_post_contracts(
            [source, translation], exemptions={}, root=tmp_path, production=True
        )

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


def test_committed_singletons_have_stable_identity_explicit_urls_and_exact_exemptions():
    paths = sorted((ROOT / "_posts").glob("*.md"))
    documents = [parse_document(path) for path in paths]
    exemptions = load_translation_exemptions(
        ROOT / "_data" / "translation_exemptions.yml",
        root=ROOT,
    )

    assert len(documents) == 11
    assert len(exemptions) == 11
    assert {document.frontmatter["translation_key"] for document in documents} == set(
        exemptions
    )
    for document in documents:
        data = document.frontmatter
        assert isinstance(data["uid"], str) and data["uid"].isdigit()
        assert data["translation_key"] == f"post-{data['uid']}"
        assert data["permalink"].startswith(
            "/en/posts/" if data["lang"] == "en" else "/posts/"
        )
        assert data["permalink"].endswith("/")
        assert "translation_url" not in data

    check_post_contracts(documents, exemptions=exemptions, root=ROOT, production=True)


def test_new_singleton_is_rejected_but_an_exact_legacy_exemption_is_allowed(tmp_path):
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
    check_post_contracts(
        [source],
        exemptions=exemption,
        root=tmp_path,
        production=True,
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
            production=True,
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

    for key in ("uid", "date", "author", "thumbnail", "math"):
        changed = dict(baseline)
        changed[key] = "changed" if key != "math" else False
        assert source_hash(changed) != source_hash(baseline), key

    routing = dict(baseline, permalink="/different/", translation_url="/en/different/")
    assert source_hash(routing) == source_hash(baseline)

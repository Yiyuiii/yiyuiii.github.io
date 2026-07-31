from pathlib import Path
import re

import yaml


ROOT = Path(__file__).resolve().parents[1]
PUBLICATIONS = ROOT / "_data" / "publications.yml"


def load_publications():
    return yaml.safe_load(PUBLICATIONS.read_text(encoding="utf-8"))


def test_publication_inventory_is_verified_and_closed():
    items = load_publications()

    assert len(items) == 8
    assert len({item["key"] for item in items}) == 8

    serialized = yaml.safe_dump(items, allow_unicode=True).lower()
    for forbidden in ("taco", "mambo", "under review", "under submission"):
        assert forbidden not in serialized

    for item in items:
        assert item["status"] == "published"
        assert set(item["title"]) == {"zh", "en"}
        assert all(item["title"].values())
        assert set(item["authors"]) == {"zh", "en"}
        assert all(item["authors"].values())
        assert "Yiyu Chen" in item["authors"]["en"]
        assert set(item["venue"]) == {"zh", "en"}
        assert all(item["venue"].values())
        english_metadata = " ".join(
            [
                item["title"]["en"],
                *item["authors"]["en"],
                item["venue"]["en"],
            ]
        )
        assert not re.search(r"[\u3400-\u9fff]", english_metadata)
        assert isinstance(item["year"], int)
        assert isinstance(item["order"], int)
        assert item["links"]
        assert all(link["url"].startswith("https://") for link in item["links"])


def test_publication_links_and_sort_order_are_explicit():
    items = load_publications()

    assert all(link["kind"] for item in items for link in item["links"])
    assert len({link["url"] for item in items for link in item["links"]}) == sum(
        len(item["links"]) for item in items
    )
    assert items == sorted(items, key=lambda item: (item["order"], item["key"]))


def test_meta_rl_survey_has_the_verified_2024_recognition():
    items = load_publications()
    paper = next(item for item in items if item["key"] == "meta-rl-survey-2024")

    assert paper["recognition"] == {
        "label": {
            "zh": "2024年高被关注综述论文",
            "en": "2024 Top-20 High-Attention Review Paper",
        },
        "url": "https://mp.weixin.qq.com/s/0c-6egiMkVL0nn7jbSP0Cg",
    }
    assert all(
        "recognition" not in item
        for item in items
        if item["key"] != "meta-rl-survey-2024"
    )


def test_only_verified_self_contributions_are_present():
    items = {item["key"]: item for item in load_publications()}
    expected = {
        "zh": "（共同第一作者）",
        "en": "(co-first author)",
    }

    assert items["hdbo-survey-2025"]["self_contribution"] == expected
    assert items["radar-rl-2023"]["self_contribution"] == expected

    for key, item in items.items():
        assert "note_zh" not in item
        assert "note_en" not in item
        if key not in {"hdbo-survey-2025", "radar-rl-2023"}:
            assert "self_contribution" not in item

    serialized = yaml.safe_dump(items, allow_unicode=True).lower()
    assert "extended abstract" not in serialized


def test_zte_paper_keeps_original_author_names_on_both_routes():
    items = load_publications()
    paper = next(item for item in items if item["key"] == "radar-rl-2023")

    assert paper["authors"]["zh"] == ["Junpeng Yu", "Yiyu Chen"]
    assert paper["authors"]["en"] == ["Junpeng Yu", "Yiyu Chen"]
    assert paper["self_contribution"] == {
        "zh": "（共同第一作者）",
        "en": "(co-first author)",
    }

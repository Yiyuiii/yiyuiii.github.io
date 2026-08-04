import re
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
ZH = ROOT / "_posts" / "2026-08-02-《SETI》桌游规则：从摆桌到完成第一局.md"
EN = ROOT / "_posts" / "2026-08-02-learning-seti-board-game.md"
ASSET_PREFIX = "/assets/posts/202608021600/"

NEW_RULE_IMAGES = (
    "probe-movement.webp",
    "orbit-action.webp",
    "landing-action.webp",
    "probe-telescope-tech.webp",
    "alien-mascamites-board.webp",
    "alien-anomalies-board.webp",
    "alien-oumuamua-board.webp",
    "alien-centaurians-board.webp",
    "alien-exertians-board.webp",
    "solo-components.webp",
    "solo-rival-turn.webp",
    "alien-origin-ark-board.webp",
    "alien-glyphids-board.webp",
    "alien-amoeba-board.webp",
)


def body(path):
    return path.read_text(encoding="utf-8").split("---", 2)[2]


def local_seti_images(source):
    return re.findall(
        rf"!\[[^\]]*\]\({re.escape(ASSET_PREFIX)}([^\s)]+)\)", source
    )


def test_rule_images_appear_once_and_in_the_same_bilingual_order():
    image_orders = []

    for path in (ZH, EN):
        source = body(path)
        images = local_seti_images(source)
        selected = tuple(name for name in images if name in NEW_RULE_IMAGES)
        assert selected == NEW_RULE_IMAGES
        assert all(source.count(f"{ASSET_PREFIX}{name}") == 1 for name in NEW_RULE_IMAGES)
        image_orders.append(images)

    assert image_orders[0] == image_orders[1]


def test_guide_keeps_base_species_solo_and_expansion_species_coverage():
    required = {
        ZH: (
            "## 十四、基础单人游戏",
            "#### 硫铵虫",
            "#### 异常点",
            "#### 奥陌陌",
            "#### 半人马族",
            "#### 钻探者",
            "#### 起源方舟",
            "#### 符文族",
            "#### 阿米巴",
        ),
        EN: (
            "## 14. Base-Game Solo Play",
            "#### Mascamites",
            "#### Anomalies",
            "#### ‘Oumuamua",
            "#### Centaurians",
            "#### Exertians",
            "#### Origin Ark",
            "#### Glyphids",
            "#### Amoeba",
        ),
    }

    for path, phrases in required.items():
        source = body(path)
        assert all(phrase in source for phrase in phrases)
        assert source.count('<details markdown="1">') == 2
        assert source.count("</details>") == 2


def test_chinese_expansion_species_keep_their_published_fragment_ids():
    source = body(ZH)

    assert "#### 起源方舟 {#section}" in source
    assert "#### 符文族 {#section-1}" in source
    assert "#### 阿米巴 {#section-2}" in source


def test_new_rule_images_are_recorded_in_the_article_asset_manifest():
    manifest = yaml.safe_load(
        (ROOT / "docs" / "article-assets" / "202608021600.yml").read_text(
            encoding="utf-8"
        )
    )
    entries = {Path(item["asset"]).name: item for item in manifest["assets"]}

    for name in NEW_RULE_IMAGES:
        assert name in entries
        assert entries[name]["dimensions"]
        assert re.fullmatch(r"[0-9a-f]{64}", entries[name]["sha256"])
        assert (ROOT / entries[name]["asset"]).is_file()

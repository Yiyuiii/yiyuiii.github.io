import hashlib
import re
from pathlib import Path

import yaml
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ZH = ROOT / "_posts" / "2026-08-10-《工业革命：匹兹堡》规则教学：从摆桌到第一次时代结算.md"
EN = ROOT / "_posts" / "2026-08-10-learning-brass-pittsburgh-board-game.md"
MANIFEST = ROOT / "docs" / "article-assets" / "202608102107.yml"
ASSET_PREFIX = "/assets/posts/202608102107/"

RULE_IMAGES = (
    "board-setup.webp",
    "player-mat.webp",
    "turn-flow.webp",
    "resource-transport.webp",
    "network-action.webp",
    "sell-action.webp",
    "special-industries.webp",
    "era-scoring-example.webp",
)


def body(path):
    return path.read_text(encoding="utf-8").split("---", 2)[2]


def local_rule_images(source):
    return tuple(
        re.findall(rf"!\[[^\]]*\]\({re.escape(ASSET_PREFIX)}([^\s)]+)\)", source)
    )


def test_rule_images_appear_once_and_in_the_same_bilingual_order():
    image_orders = []

    for path in (ZH, EN):
        source = body(path)
        images = local_rule_images(source)
        assert images == RULE_IMAGES
        assert all(source.count(f"{ASSET_PREFIX}{name}") == 1 for name in RULE_IMAGES)
        image_orders.append(images)

    assert image_orders[0] == image_orders[1]


def test_public_draft_boundary_is_explicit_in_both_languages():
    required = {
        ZH: (
            "当前公开的 **2–4 人多人规则**",
            "2026-06-01",
            "`Rulebook v2026.01`",
            "粉色文字尚未定稿",
            "单人模式仍在开发",
            "本文只整理文件中已经写明的多人规则",
        ),
        EN: (
            "currently public **2–4 player rules**",
            "2026-06-01",
            "`Rulebook v2026.01`",
            "pink text is non-final",
            "solo play remains in development",
            "covers only the published multiplayer procedure",
        ),
    }

    for path, phrases in required.items():
        source = body(path)
        assert all(phrase in source for phrase in phrases)


def test_turn_sequence_and_all_six_actions_stay_complete():
    required = {
        ZH: (
            "第一时代第 1 轮",
            "每位玩家只执行 1 个行动",
            "| 建造 |",
            "| 网络 |",
            "| 发展 |",
            "| 出售 |",
            "| 贷款 |",
            "| 跳过 |",
            "一轮结束",
            "无法支付负收入",
        ),
        EN: (
            "round 1 of era 1",
            "each player takes only 1 action",
            "| Build |",
            "| Network |",
            "| Develop |",
            "| Sell |",
            "| Loan |",
            "| Pass |",
            "End of a Round",
            "Unable to Pay Negative Income",
        ),
    }

    for path, phrases in required.items():
        source = body(path)
        assert all(phrase in source for phrase in phrases)


def test_network_transport_and_oil_rules_remain_separate():
    required = {
        ZH: (
            "“属于你的网络”和“能够运输”是两项不同检查",
            "必须从其中一块免费取用",
            "预备管线不能运输原油",
            "第二块连接不再弃一张牌",
        ),
        EN: (
            '“In your network” and “able to transport” are therefore separate checks',
            "you must take one from an eligible tile for free",
            "A Reserve Pipeline cannot carry oil",
            "Do not discard another card for it",
        ),
    }

    for path, phrases in required.items():
        source = body(path)
        assert all(phrase in source for phrase in phrases)


def test_special_links_crown_jewels_and_era_cleanup_stay_covered():
    required = {
        ZH: (
            "### 四类重型列车",
            "**资源型**",
            "**威士忌型**",
            "**双倍连接型**",
            "**替换型**",
            "### 四类管线",
            "**收入管线**",
            "**金钱管线**",
            "**胜利点管线**",
            "**预备管线**",
            "**石油城（Oil City）**",
            "**多相交流发电机（Polyphase Alternator）**",
            "**机车厂（Locomotive Works）**",
            "**摩天大楼（Skyscraper）**",
            "第一时代只移除已经计分的轻型列车",
            "第二时代移除全部列车",
            "胜利点最高者获胜；平手先比较收入轨上更高的位置，再比较剩余金钱",
        ),
        EN: (
            "### Four Heavy Train Types",
            "**Resource:**",
            "**Whiskey:**",
            "**Double Link:**",
            "**Replacement:**",
            "### Four Pipeline Types",
            "**Income Pipeline:**",
            "**Money Pipeline:**",
            "**VP Pipeline:**",
            "**Reserve Pipeline:**",
            "**Oil City:**",
            "**Polyphase Alternator:**",
            "**Locomotive Works:**",
            "**Skyscraper:**",
            "After era 1, remove scored Light Trains",
            "After era 2, remove every train",
            "Break ties by higher income-track position, then by most money",
        ),
    }

    for path, phrases in required.items():
        source = body(path)
        assert all(phrase in source for phrase in phrases)


def test_three_player_first_round_is_executable_in_both_languages():
    required = {
        ZH: (
            "## 十一、一个完整的三人首轮",
            "**甲建造煤炭产业。**",
            "**乙铺轻型列车。**",
            "**丙贷款。**",
            "随后各自补回 8 张手牌",
            "丙以 0 美元排到下一轮前方",
        ),
        EN: (
            "## 11. A Complete Three-Player First Round",
            "**A builds Coal.**",
            "**B places a Light Train.**",
            "**C takes a Loan.**",
            "after which everyone refills to 8 cards",
            "C’s \\$0 moves to the front of next round",
        ),
    }

    for path, phrases in required.items():
        source = body(path)
        assert all(phrase in source for phrase in phrases)


def test_article_asset_manifest_matches_files_exactly():
    manifest = yaml.safe_load(MANIFEST.read_text(encoding="utf-8"))
    entries = {Path(item["asset"]).name: item for item in manifest["assets"]}
    expected = {"cover-brass-pittsburgh-official-square.webp", *RULE_IMAGES}

    assert set(entries) == expected

    for name, entry in entries.items():
        asset = ROOT / entry["asset"]
        expected_hash = entry["sha256"]

        assert asset.is_file()
        assert re.fullmatch(r"[0-9a-f]{64}", expected_hash)
        assert hashlib.sha256(asset.read_bytes()).hexdigest() == expected_hash

        with Image.open(asset) as image:
            assert list(image.size) == entry["dimensions"]

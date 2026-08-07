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

ICON_GUIDE_IMAGES = (
    "icon-index.webp",
    "sector-state.webp",
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


def test_icon_guides_and_board_reading_stay_in_both_languages():
    required = {
        ZH: (
            "### 先学会读图标",
            "### 先读懂一个扇区",
            "历史胜者记录",
            "**版图读法：**",
            "解锁状态是永久的",
        ),
        EN: (
            "### Read the Icon Language First",
            "### Read a Sector Before Using It",
            "historical winner record",
            "**Board reading:**",
            "Unlocks are permanent",
        ),
    }

    for path in (ZH, EN):
        source = body(path)
        images = local_seti_images(source)
        selected = tuple(name for name in images if name in ICON_GUIDE_IMAGES)
        assert selected == ICON_GUIDE_IMAGES
        assert all(source.count(f"{ASSET_PREFIX}{name}") == 1 for name in ICON_GUIDE_IMAGES)
        assert all(phrase in source for phrase in required[path])
        board_reading = "**版图读法：**" if path == ZH else "**Board reading:**"
        assert source.count(board_reading) == 8


def test_every_official_icon_family_and_board_layout_has_an_explicit_reader_key():
    required = {
        ZH: (
            "### 先认版图布局",
            "圆盘缺口也是位置",
            "槽旁可放超额信号",
            "首位绕行奖励、首位着陆数据和天然卫星格",
            "20、30 分触发中立里程碑",
            "左侧是探测器与发射提示",
            "三色发现位与冗余区",
            "不能查看牌库后挑选",
            "三色科技图标可任选一种",
            "同一科技堆不能拿第二块",
            "灰色带勾扇区表示赢得任意颜色扇区",
            "只用于识别来源，不会触发额外效果",
            "机构牌从上到下依次是",
        ),
        EN: (
            "### Read the Board Layout First",
            "gaps between discs are also spaces",
            "excess signals may sit beside it",
            "First-orbit rewards, first-landing data, and moon spaces",
            "Neutral milestones trigger at 20 and 30 points",
            "probe and launch reminders",
            "three colored discovery spaces and overflow areas",
            "never lets you inspect the deck and choose",
            "the three-color icon allows any type",
            "never take a second tile from the same stack",
            "a checked gray sector means win any color",
            "identifies their source and triggers no extra effect",
            "From top to bottom, an organization shows",
        ),
    }

    for path in (ZH, EN):
        source = body(path)
        assert all(phrase in source for phrase in required[path])


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
        assert source.count('<details markdown="1">') == 3
        assert source.count("</details>") == 3


def test_solo_and_organization_edge_cases_stay_correct_in_both_languages():
    required = {
        ZH: (
            "本应增加收入时，改为推进 4 格",
            "不会获得金色里程碑的终局分数",
            "目标与普通触发任务彼此独立",
            "奥陌陌专属对手行动牌",
            "远日点集团与寰宇战略",
            "愿景标记位于分数记录条上",
            "高级行动牌已全部加入",
            "只有通过物种专属行动牌才能解锁警戒牌",
            "对手持有的每枚符文值 3 分",
            "只有 0 或 1 个细胞器奖励",
        ),
        EN: (
            "would increase income, advance it 4 spaces instead",
            "never scores gold tiles at game end",
            "Objectives and ordinary triggerable missions are separate",
            "‘Oumuamua rival card",
            "Helion Assembly and Cosmos Strategy Group",
            "Vision token is on the score track",
            "every advanced action card has already been added",
            "unlocks alert cards only through its species action card",
            "each rune it holds is worth 3 points",
            "only 0 or 1 organelle reward",
        ),
    }
    forbidden = {
        ZH: (
            "取得科技图标时前进 4 格",
            "奥陌陌的信号总放在奥陌陌版块",
        ),
        EN: (
            "a technology icon advances it by 4",
            "always places an ‘Oumuamua signal on its tile",
        ),
    }

    for path in (ZH, EN):
        source = body(path)
        assert all(phrase in source for phrase in required[path])
        assert all(phrase not in source for phrase in forbidden[path])


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

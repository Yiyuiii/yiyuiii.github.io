from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
EXTERNAL_URL = "https://diax7.github.io/redeem-apple-gift-cards-without-typing/"


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def external_item():
    data = yaml.safe_load(text("_data/toys.yml"))
    items = [item for group in data["groups"] for item in group["items"]]
    return next(item for item in items if item["id"] == "apple-gift-card-scanner")


def test_manifest_marks_the_scanner_as_a_bilingual_external_destination():
    item = external_item()
    assert item["external_url"] == EXTERNAL_URL
    assert item["title"] == {
        "zh": "Apple 礼品码转相机可扫描卡片（外部）",
        "en": "Apple gift code to camera-scannable card (external)",
    }
    assert "手动输入的文字礼品码" in item["description"]["zh"]
    assert "摄像头扫描录入" in item["description"]["zh"]
    assert "otherwise need typing" in item["description"]["en"]
    assert "scan with its camera" in item["description"]["en"]
    assert "第三方页面" in item["description"]["zh"]
    assert "third-party page" in item["description"]["en"]
    assert "新标签页" in item["external_label"]["zh"]
    assert "new tab" in item["external_label"]["en"]


def test_renderer_uses_one_safe_link_without_an_embedded_component_or_iframe():
    include = text("_includes/toy-index.liquid")
    assert "{% if toy.external_url %}" in include
    assert 'class="toy-entry toy-entry--external"' in include
    assert 'href="{{ toy.external_url | escape }}"' in include
    assert 'target="_blank"' in include
    assert 'rel="external noopener noreferrer"' in include
    assert "toy-entry__external-label" in include
    assert "<iframe" not in include
    assert "toy-apple-gift-card" not in include


def test_site_does_not_ship_or_request_the_private_font_or_local_runtime():
    loader = text("assets/js/toy-loader.js")
    assert "apple-gift-card-scanner" not in loader
    assert "toy-apple-gift-card.js" not in loader
    assert not (ROOT / "assets/js/toy-apple-gift-card.js").exists()
    assert not (ROOT / "_includes/toy-apple-gift-card.liquid").exists()
    assert not (ROOT / "_data/toy_apple_gift_card.yml").exists()
    assert not list(ROOT.rglob("Scancardium*.ttf"))


def test_maintenance_note_records_the_navigation_and_ownership_boundary():
    note = text("docs/toy-apple-gift-card.md")
    assert EXTERNAL_URL in note
    assert "不使用 `iframe`" in note
    assert "不预连接" in note
    assert "本站不会读取" in note

from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_latency_copy_and_node_metadata_are_bilingual_and_complete():
    data = yaml.safe_load(text("_data/toy_network_latency.yml"))
    assert set(data) == {"copy", "nodes"}
    assert set(data["copy"]) == {"zh", "en"}
    assert set(data["copy"]["zh"]) == set(data["copy"]["en"])

    nodes = data["nodes"]
    assert [node["id"] for node in nodes] == [
        "dnspod-anycast",
        "alidns-global",
        "cloudflare-nearest",
        "vultr-tokyo",
        "vultr-singapore",
        "vultr-seoul",
        "vultr-frankfurt",
        "vultr-los-angeles",
        "vultr-new-jersey",
    ]
    assert len(nodes) == len({node["id"] for node in nodes})
    expected_fields = {
        "id",
        "title",
        "location",
        "network",
        "source_name",
        "source_url",
        "method",
        "features",
    }
    for node in nodes:
        assert set(node) in (expected_fields, expected_fields | {"provider"})
        assert node["source_url"].startswith("https://")
        for field in ("title", "location", "network", "method", "features"):
            assert set(node[field]) == {"zh", "en"}
            assert all(node[field][language].strip() for language in ("zh", "en"))

    overseas_titles = {
        "vultr-tokyo": ("日本 · 东京", "Japan · Tokyo"),
        "vultr-singapore": ("新加坡 · 新加坡", "Singapore · Singapore"),
        "vultr-seoul": ("韩国 · 首尔", "South Korea · Seoul"),
        "vultr-frankfurt": ("德国 · 法兰克福", "Germany · Frankfurt"),
        "vultr-los-angeles": ("美国 · 洛杉矶", "United States · Los Angeles"),
        "vultr-new-jersey": ("美国 · 新泽西", "United States · New Jersey"),
    }
    by_id = {node["id"]: node for node in nodes}
    assert by_id["dnspod-anycast"]["title"]["zh"] == "全球自动接入 · 腾讯 DNSPod"
    assert "北京、上海、广州、中国香港和北美" in by_id["dnspod-anycast"]["location"]["zh"]
    assert "actual landing point is not visible" in by_id["dnspod-anycast"]["location"]["en"]
    assert by_id["alidns-global"]["title"]["zh"] == "全球自动接入 · 阿里公共 DNS"
    for node_id, (zh_prefix, en_prefix) in overseas_titles.items():
        assert by_id[node_id]["provider"] == "vultr"
        assert by_id[node_id]["title"]["zh"].startswith(zh_prefix)
        assert by_id[node_id]["title"]["en"].startswith(en_prefix)
    assert all("provider" not in by_id[node_id] for node_id in (
        "dnspod-anycast", "alidns-global", "cloudflare-nearest"
    ))


def test_latency_component_is_opt_in_and_exposes_source_and_privacy_boundaries():
    include = text("_includes/toy-network-latency.liquid")
    script = text("assets/js/toy-network-latency.js")
    logic = text("assets/js/toy-network-latency-logic.js")

    assert "data-latency-test-start" in include
    assert "data-latency-quick-start" not in include
    assert "data-latency-stability-start" not in include
    assert "data-network-latency-copy" in include
    assert "data-latency-live-row" in include
    assert "data-latency-live" in include
    assert 'data-latency-indicator="p50"' in include
    assert 'data-latency-indicator="jitter"' in include
    assert "copy.metric_placeholder" in include
    assert "copy.not_requested" not in include
    assert "copy.quality_thresholds" in include
    assert "copy.quality_legend_label" in include
    assert 'class="toy-network-latency__quality-band"' in include
    assert 'data-quality="{{ band.quality }}"' in include
    assert "copy.core_metric_help" not in include
    assert "copy.diagnostics_node_title" in include
    assert "copy.nodes_title" not in include
    assert "data-latency-node-result" not in include
    assert "data-latency-chart-line" in include
    assert 'rel="external noopener noreferrer"' in include
    assert "copy.overview" not in include
    assert "copy.path_notice" not in include
    assert "copy.visitor_help" not in include
    assert "copy.dashboard_help" not in include
    assert "copy.test_title" not in include
    assert "copy.test_help" not in include
    assert "network-latency-test" not in include
    assert "toy-network-latency__control-bar" in include
    assert "copy.vultr_notice" not in include
    assert "copy.providers[node.provider]" in include
    assert "copy.privacy" in include
    assert "localStorage" not in script
    assert "sessionStorage" not in script
    assert "document.cookie" not in script
    assert "Math.random" not in script
    assert 'testButton?.addEventListener("click"' in script
    assert "const LIVE_SAMPLES = 60" in script
    assert "const nodeTasks = expectedIds.map((id) => runNode(id, run));" in script
    assert "for (let round" not in script
    assert "stabilitySelect" not in script
    assert "run.completedSamples += 1" in script
    assert "renderNode(nodeId);" in script
    assert "if (!samples.length)" in script
    assert "renderChart();" in script
    assert 'setIndicator(row, "p50", summary.p50, [50, 100, 200])' in script
    assert 'setIndicator(row, "jitter", summary.jitter, [8, 20, 40])' in script
    assert "globalScope.fetch" in script
    assert 'credentials: "omit"' in logic
    assert 'referrerPolicy: "no-referrer"' in logic
    assert "CN2" not in logic
    assert "AS9929" not in logic
    assert "CMIN2" not in logic

    copy_data = text("_data/toy_network_latency.yml")
    for removed_phrase in (
        "IPIP.NET 的免费服务没有可用性承诺",
        "公网归属用于近似判断地区和运营商",
        "能测到什么",
        "通过低流量 HTTPS 请求并发比较 9 个公共网络入口",
        "每行显示两个越低越好的指标",
        "约 60 秒全节点并发测试",
        "P50：绿色",
        "4g 档",
        "浏览器连接估计不等同于",
        "下面的等级只描述本次实测表现",
        "任何慢节点都不会阻塞其它节点",
        "千兆带宽表示吞吐能力，并不保证低延迟",
    ):
        assert removed_phrase not in copy_data


def test_latency_endpoints_are_exactly_allowlisted_in_logic_and_csp():
    logic = text("assets/js/toy-network-latency-logic.js")
    head = text("_includes/head.liquid")
    origins = [
        "https://myip.ipip.net",
        "https://api.ip.sb",
        "https://speed.cloudflare.com",
        "https://doh.pub",
        "https://dns.alidns.com",
        "https://hnd-jp-ping.vultr.com",
        "https://sgp-ping.vultr.com",
        "https://sel-kor-ping.vultr.com",
        "https://fra-de-ping.vultr.com",
        "https://lax-ca-us-ping.vultr.com",
        "https://nj-us-ping.vultr.com",
    ]
    for origin in origins:
        assert origin in logic
        assert origin in head
    assert "*.vultr.com" not in head


def test_latency_document_records_measurement_and_route_identity_limits():
    document = text("docs/toy-network-latency.md")
    for phrase in (
        "HTTPS 往返耗时",
        "不能识别具体承载线路",
        "IPIP.NET",
        "IP.SB Free IP API",
        "Cloudflare Speedtest",
        "DNSPod",
        "Alibaba Public DNS",
        "Vultr Looking Glass",
        "全部 9 个节点",
        "逐个样本",
        "Constant",
        "不持久化",
    ):
        assert phrase in document

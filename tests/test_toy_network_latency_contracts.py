from pathlib import Path
from urllib.parse import urlsplit

import yaml


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_latency_copy_and_node_metadata_are_bilingual_and_complete():
    data = yaml.safe_load(text("_data/toy_network_latency.yml"))
    assert set(data) == {"copy", "node_defaults", "nodes"}
    assert set(data["copy"]) == {"zh", "en"}
    assert set(data["copy"]["zh"]) == set(data["copy"]["en"])
    assert set(data["node_defaults"]) == {"hosthatch", "akamai_linode", "vultr"}
    assert "2022 年收购 Linode" in data["copy"]["zh"]["providers"]["akamai_linode"]["description"]
    assert "不是 CDN 就近边缘" in data["copy"]["zh"]["providers"]["akamai_linode"]["description"]
    assert "not nearby CDN edges" in data["copy"]["en"]["providers"]["akamai_linode"]["description"]

    nodes = data["nodes"]
    default_node_ids = [
        "dnspod-anycast",
        "alidns-global",
        "cloudflare-nearest",
        "hosthatch-hong-kong",
        "hosthatch-tokyo",
        "vultr-tokyo",
        "linode-tokyo",
        "hosthatch-singapore",
        "vultr-frankfurt",
        "vultr-los-angeles",
    ]
    assert len(nodes) == 79
    assert len(nodes) == len({node["id"] for node in nodes})
    assert {node["group"] for node in nodes} == {
        "automatic", "asia", "oceania", "europe", "north_america",
        "south_america", "africa",
    }
    default_nodes = [node for node in nodes if node["default_enabled"]]
    assert {node["id"] for node in default_nodes} == set(default_node_ids)
    assert [
        node["id"] for node in sorted(default_nodes, key=lambda node: node["default_order"])
    ] == default_node_ids
    assert len({node["default_order"] for node in default_nodes}) == len(default_nodes)
    assert all("default_order" not in node for node in nodes if not node["default_enabled"])
    assert sum(node.get("provider") == "hosthatch" for node in nodes) == 13
    assert sum(node.get("provider") == "vultr" for node in nodes) == 32
    assert sum(node.get("provider") == "akamai_linode" for node in nodes) == 31
    base_fields = {
        "id",
        "title",
        "location",
        "source_url",
        "default_enabled",
        "group",
    }
    for node in nodes:
        assert base_fields <= set(node)
        assert node["source_url"].startswith("https://")
        defaults = data["node_defaults"].get(node.get("provider"), {})
        for field in ("title", "location", "network", "method", "features"):
            value = node.get(field, defaults.get(field))
            assert set(value) == {"zh", "en"}
            assert all(value[language].strip() for language in ("zh", "en"))
        assert node.get("source_name", defaults.get("source_name", "")).strip()

    overseas_titles = {
        "hosthatch-hong-kong": (
            "中国香港 · 香港", "Hong Kong SAR · Hong Kong", "hosthatch"
        ),
        "hosthatch-tokyo": ("日本 · 东京", "Japan · Tokyo", "hosthatch"),
        "hosthatch-los-angeles": (
            "美国 · 洛杉矶", "United States · Los Angeles", "hosthatch"
        ),
        "vultr-tokyo": ("日本 · 东京", "Japan · Tokyo", "vultr"),
        "vultr-singapore": ("新加坡 · 新加坡", "Singapore · Singapore", "vultr"),
        "vultr-seoul": ("韩国 · 首尔", "South Korea · Seoul", "vultr"),
        "vultr-frankfurt": ("德国 · 法兰克福", "Germany · Frankfurt", "vultr"),
        "vultr-toronto": ("加拿大 · 多伦多", "Canada · Toronto", "vultr"),
        "vultr-sao-paulo": ("巴西 · 圣保罗", "Brazil · São Paulo", "vultr"),
        "linode-tokyo": ("日本 · 东京", "Japan · Tokyo", "akamai_linode"),
        "linode-toronto": ("加拿大 · 多伦多", "Canada · Toronto", "akamai_linode"),
        "linode-sao-paulo": ("巴西 · 圣保罗", "Brazil · São Paulo", "akamai_linode"),
    }
    by_id = {node["id"]: node for node in nodes}
    assert by_id["dnspod-anycast"]["title"]["zh"] == "全球自动接入 · 腾讯 DNSPod"
    assert "北京、上海、广州、中国香港和北美" in by_id["dnspod-anycast"]["location"]["zh"]
    assert "actual landing point is not visible" in by_id["dnspod-anycast"]["location"]["en"]
    assert by_id["alidns-global"]["title"]["zh"] == "全球自动接入 · 阿里公共 DNS"
    for node_id, (zh_prefix, en_prefix, provider) in overseas_titles.items():
        assert by_id[node_id]["provider"] == provider
        assert by_id[node_id]["title"]["zh"].startswith(zh_prefix)
        assert by_id[node_id]["title"]["en"].startswith(en_prefix)
    assert all("provider" not in by_id[node_id] for node_id in (
        "dnspod-anycast", "alidns-global", "cloudflare-nearest",
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
    assert "data-latency-node-selector" in include
    assert "data-latency-node-toggle" in include
    assert "data-latency-selection-default" in include
    assert "data-latency-selection-all" in include
    assert "data-latency-selection-none" in include
    assert 'sort: "default_order"' in include
    assert "display_nodes" in include
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
    assert "const nodeTasks = nodeIds.map((id) => runNode(id, run));" in script
    assert "input.defaultChecked" in script
    assert "nodeIds.length * LIVE_SAMPLES" in script
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
    data = yaml.safe_load(text("_data/toy_network_latency.yml"))
    logic = text("assets/js/toy-network-latency-logic.js")
    head = text("_includes/head.liquid")
    fixed_origins = {
        f"{urlsplit(node['source_url']).scheme}://{urlsplit(node['source_url']).netloc}"
        for node in data["nodes"]
        if node.get("provider")
    }
    assert len(fixed_origins) == 76
    origins = {
        "https://myip.ipip.net",
        "https://api.ip.sb",
        "https://speed.cloudflare.com",
        "https://doh.pub",
        "https://dns.alidns.com",
        *fixed_origins,
    }
    for origin in origins:
        assert origin.removeprefix("https://") in logic
        assert origin in head
    assert "*.vultr.com" not in head
    assert "*.hosthatch.com" not in head
    assert "*.linode.com" not in head


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
        "HostHatch Looking Glass",
        "Akamai Cloud Speed Test",
        "目录现有 79 个节点",
        "默认启用 10 个代表节点",
        "不是会自动选择最近入口的 Akamai CDN 边缘",
        "逐个样本",
        "Constant",
        "不持久化",
    ):
        assert phrase in document

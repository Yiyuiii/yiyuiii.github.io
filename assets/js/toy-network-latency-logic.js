(() => {
  "use strict";

  const globalScope = typeof window === "undefined" ? globalThis : window;
  const HOSTHATCH_NODES = Object.freeze([
    ["hosthatch-hong-kong", "lg.hkg.hosthatch.com"],
    ["hosthatch-singapore", "lg.sgp.hosthatch.com"],
    ["hosthatch-tokyo", "lg.tok.hosthatch.com"],
    ["hosthatch-seoul", "lg.sel.hosthatch.com"],
    ["hosthatch-sydney", "lg.syd.hosthatch.com"],
    ["hosthatch-amsterdam", "lg.ams.hosthatch.com"],
    ["hosthatch-stockholm", "lg.sto.hosthatch.com"],
    ["hosthatch-oslo", "lg.osl.hosthatch.com"],
    ["hosthatch-london", "lg.lon.hosthatch.com"],
    ["hosthatch-vienna", "lg.vie.hosthatch.com"],
    ["hosthatch-zurich", "lg.zrh.hosthatch.com"],
    ["hosthatch-new-york", "lg.nyc.hosthatch.com"],
    ["hosthatch-los-angeles", "lg.lax.hosthatch.com"],
  ]);
  const VULTR_NODES = Object.freeze([
    ["vultr-tokyo", "hnd-jp-ping.vultr.com"],
    ["vultr-singapore", "sgp-ping.vultr.com"],
    ["vultr-seoul", "sel-kor-ping.vultr.com"],
    ["vultr-frankfurt", "fra-de-ping.vultr.com"],
    ["vultr-los-angeles", "lax-ca-us-ping.vultr.com"],
    ["vultr-new-jersey", "nj-us-ping.vultr.com"],
    ["vultr-bangalore", "blr-in-ping.vultr.com"],
    ["vultr-delhi", "del-in-ping.vultr.com"],
    ["vultr-mumbai", "bom-in-ping.vultr.com"],
    ["vultr-tel-aviv", "tlv-il-ping.vultr.com"],
    ["vultr-melbourne", "mel-au-ping.vultr.com"],
    ["vultr-sydney", "syd-au-ping.vultr.com"],
    ["vultr-amsterdam", "ams-nl-ping.vultr.com"],
    ["vultr-london", "lon-gb-ping.vultr.com"],
    ["vultr-madrid", "mad-es-ping.vultr.com"],
    ["vultr-manchester", "man-uk-ping.vultr.com"],
    ["vultr-milan", "mxp-it-ping.vultr.com"],
    ["vultr-paris", "par-fr-ping.vultr.com"],
    ["vultr-stockholm", "sto-se-ping.vultr.com"],
    ["vultr-warsaw", "waw-pl-ping.vultr.com"],
    ["vultr-atlanta", "ga-us-ping.vultr.com"],
    ["vultr-chicago", "il-us-ping.vultr.com"],
    ["vultr-dallas", "tx-us-ping.vultr.com"],
    ["vultr-honolulu", "hon-hi-us-ping.vultr.com"],
    ["vultr-miami", "fl-us-ping.vultr.com"],
    ["vultr-seattle", "wa-us-ping.vultr.com"],
    ["vultr-silicon-valley", "sjo-ca-us-ping.vultr.com"],
    ["vultr-mexico-city", "mex-mx-ping.vultr.com"],
    ["vultr-toronto", "tor-ca-ping.vultr.com"],
    ["vultr-santiago", "scl-cl-ping.vultr.com"],
    ["vultr-sao-paulo", "sao-br-ping.vultr.com"],
    ["vultr-johannesburg", "jnb-za-ping.vultr.com"],
  ]);
  const AKAMAI_LINODE_NODES = Object.freeze([
    ["linode-atlanta", "speedtest.atlanta.linode.com"],
    ["linode-chicago", "speedtest.chicago.linode.com"],
    ["linode-dallas", "speedtest.dallas.linode.com"],
    ["linode-fremont", "speedtest.fremont.linode.com"],
    ["linode-los-angeles", "speedtest.los-angeles.linode.com"],
    ["linode-miami", "speedtest.miami.linode.com"],
    ["linode-newark", "speedtest.newark.linode.com"],
    ["linode-sao-paulo", "speedtest.sao-paulo.linode.com"],
    ["linode-seattle", "speedtest.seattle.linode.com"],
    ["linode-toronto", "speedtest.toronto1.linode.com"],
    ["linode-washington", "speedtest.washington.linode.com"],
    ["linode-amsterdam", "speedtest.amsterdam.linode.com"],
    ["linode-frankfurt", "speedtest.frankfurt.linode.com"],
    ["linode-frankfurt-expansion", "de-fra-2.speedtest.linode.com"],
    ["linode-london", "speedtest.london.linode.com"],
    ["linode-london-expansion", "gb-lon.speedtest.linode.com"],
    ["linode-madrid", "speedtest.madrid.linode.com"],
    ["linode-milan", "speedtest.milan.linode.com"],
    ["linode-paris", "speedtest.paris.linode.com"],
    ["linode-stockholm", "speedtest.stockholm.linode.com"],
    ["linode-chennai", "speedtest.chennai.linode.com"],
    ["linode-jakarta", "speedtest.jakarta.linode.com"],
    ["linode-mumbai", "speedtest.mumbai1.linode.com"],
    ["linode-mumbai-expansion", "in-bom-2.speedtest.linode.com"],
    ["linode-osaka", "speedtest.osaka.linode.com"],
    ["linode-singapore", "speedtest.singapore.linode.com"],
    ["linode-singapore-expansion", "sg-sin-2.speedtest.linode.com"],
    ["linode-tokyo", "speedtest.tokyo2.linode.com"],
    ["linode-tokyo-expansion", "jp-tyo-3.speedtest.linode.com"],
    ["linode-melbourne", "au-mel.speedtest.linode.com"],
    ["linode-sydney", "speedtest.sydney.linode.com"],
  ]);
  const NODE_DEFINITIONS = Object.freeze([
    Object.freeze({
      id: "dnspod-anycast",
      endpoint: "https://doh.pub/dns-query",
      probe: "doh-opaque",
    }),
    Object.freeze({
      id: "alidns-global",
      endpoint: "https://dns.alidns.com/dns-query",
      probe: "doh-opaque",
    }),
    Object.freeze({
      id: "cloudflare-nearest",
      endpoint: "https://speed.cloudflare.com/__down",
      probe: "zero-byte-cors",
    }),
    ...HOSTHATCH_NODES.map(([id, hostname]) => Object.freeze({
      id,
      endpoint: `https://${hostname}/api/health`,
      probe: "small-get-opaque",
    })),
    ...VULTR_NODES.map(([id, hostname]) => Object.freeze({
      id,
      endpoint: `https://${hostname}/`,
      probe: "head-cors",
    })),
    ...AKAMAI_LINODE_NODES.map(([id, hostname]) => Object.freeze({
      id,
      endpoint: `https://${hostname}/`,
      probe: "head-opaque",
    })),
  ]);
  const NODE_BY_ID = new Map(NODE_DEFINITIONS.map((node) => [node.id, node]));
  const VISITOR_SOURCES = Object.freeze([
    Object.freeze({
      id: "ipip",
      endpoint: "https://myip.ipip.net/json",
    }),
    Object.freeze({
      id: "ipsb",
      endpoint: "https://api.ip.sb/geoip",
    }),
  ]);
  const DNS_QUERY_SUFFIX = Object.freeze([
    0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x07, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
    0x03, 0x63, 0x6f, 0x6d, 0x00, 0x00, 0x01, 0x00, 0x01,
  ]);

  const percentile = (values, quantile) => {
    const sorted = (Array.isArray(values) ? values : [])
      .filter((value) => Number.isFinite(value) && value >= 0)
      .slice()
      .sort((left, right) => left - right);
    if (!sorted.length) return null;
    if (!Number.isFinite(quantile) || quantile < 0 || quantile > 1) {
      throw new RangeError("quantile must be between 0 and 1");
    }
    const position = (sorted.length - 1) * quantile;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + ((sorted[upper] - sorted[lower]) * (position - lower));
  };

  const classify = (summary) => {
    if (!summary || summary.successCount < 3) return "unavailable";
    if (
      summary.failureRate > 0.1
      || summary.jitter > 40
      || summary.longestFailureStreak >= 2
    ) return "unstable";
    if (summary.p95 <= 50 && summary.jitter <= 8 && summary.failureCount === 0) {
      return "excellent";
    }
    if (summary.p95 <= 100 && summary.jitter <= 20 && summary.failureRate <= 0.05) {
      return "good";
    }
    return "elevated";
  };

  const summarize = (rawSamples) => {
    const samples = Array.isArray(rawSamples) ? rawSamples.slice() : [];
    const successful = samples.filter((value) => Number.isFinite(value) && value >= 0);
    const failureCount = samples.length - successful.length;
    const differences = [];
    let longestBadStreak = 0;
    let longestFailureStreak = 0;
    let currentBadStreak = 0;
    let currentFailureStreak = 0;
    samples.forEach((value, index) => {
      const valid = Number.isFinite(value) && value >= 0;
      const previous = samples[index - 1];
      if (valid && Number.isFinite(previous) && previous >= 0) {
        differences.push(Math.abs(value - previous));
      }
      currentBadStreak = !valid || value > 100 ? currentBadStreak + 1 : 0;
      currentFailureStreak = valid ? 0 : currentFailureStreak + 1;
      longestBadStreak = Math.max(longestBadStreak, currentBadStreak);
      longestFailureStreak = Math.max(longestFailureStreak, currentFailureStreak);
    });
    const summary = {
      failureCount,
      failureRate: samples.length ? failureCount / samples.length : 0,
      jitter: differences.length
        ? differences.reduce((total, value) => total + value, 0) / differences.length
        : null,
      longestBadStreak,
      longestFailureStreak,
      maximum: successful.length ? Math.max(...successful) : null,
      over100: successful.filter((value) => value > 100).length,
      over200: successful.filter((value) => value > 200).length,
      over300: successful.filter((value) => value > 300).length,
      p50: percentile(successful, 0.5),
      p95: percentile(successful, 0.95),
      successCount: successful.length,
      totalCount: samples.length,
    };
    return Object.freeze({ ...summary, grade: classify(summary) });
  };

  const base64Url = (bytes) => {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return globalScope.btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/gu, "");
  };

  const buildProbeRequest = (nodeId, sequence) => {
    const node = NODE_BY_ID.get(nodeId);
    if (!node) throw new Error("unknown latency node");
    if (!Number.isSafeInteger(sequence) || sequence < 0) throw new RangeError("invalid sequence");
    const token = `${Date.now().toString(36)}-${sequence.toString(36)}`;
    const common = {
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    };
    if (node.probe === "doh-opaque") {
      const transaction = sequence & 0xffff;
      const query = new Uint8Array(2 + DNS_QUERY_SUFFIX.length);
      query[0] = (transaction >> 8) & 0xff;
      query[1] = transaction & 0xff;
      query.set(DNS_QUERY_SUFFIX, 2);
      return Object.freeze({
        init: Object.freeze({ ...common, method: "GET", mode: "no-cors" }),
        url: `${node.endpoint}?dns=${base64Url(query)}`,
      });
    }
    const url = new URL(node.endpoint);
    if (node.probe === "zero-byte-cors") {
      url.searchParams.set("bytes", "0");
      url.searchParams.set("measId", token);
      return Object.freeze({
        init: Object.freeze({ ...common, method: "GET", mode: "cors" }),
        url: url.href,
      });
    }
    url.searchParams.set("r", token);
    if (node.probe === "small-get-opaque") {
      return Object.freeze({
        init: Object.freeze({ ...common, method: "GET", mode: "no-cors" }),
        url: url.href,
      });
    }
    return Object.freeze({
      init: Object.freeze({
        ...common,
        method: "HEAD",
        mode: node.probe === "head-opaque" ? "no-cors" : "cors",
      }),
      url: url.href,
    });
  };

  const compactText = (values) => [...new Set(
    values.filter((value) => value !== null && value !== undefined)
      .map((value) => String(value).trim())
      .filter(Boolean),
  )].join(" · ");

  const normalizeVisitor = (sourceId, payload) => {
    if (!payload || typeof payload !== "object") return null;
    if (sourceId === "ipip") {
      const data = payload.ret === "ok" && payload.data && typeof payload.data === "object"
        ? payload.data
        : null;
      const location = Array.isArray(data?.location) ? data.location : [];
      const ip = String(data?.ip || "").trim();
      if (!ip) return null;
      return Object.freeze({
        ip,
        ipVersion: ip.includes(":") ? "IPv6" : "IPv4",
        network: compactText([location[4], location[3]]),
        region: compactText(location.slice(0, 3)),
      });
    }
    if (sourceId === "ipsb") {
      const ip = String(payload.ip || "").trim();
      if (!ip) return null;
      return Object.freeze({
        ip,
        ipVersion: ip.includes(":") ? "IPv6" : "IPv4",
        network: compactText([
          Number.isFinite(payload.asn) ? `AS${payload.asn}` : "",
          payload.asn_organization,
          payload.isp,
          payload.organization,
        ]),
        region: compactText([payload.city, payload.region, payload.country]),
      });
    }
    return null;
  };

  globalScope.yiyuiiiNetworkLatencyLogic = Object.freeze({
    VISITOR_SOURCES,
    NODE_DEFINITIONS,
    buildProbeRequest,
    classify,
    normalizeVisitor,
    percentile,
    summarize,
  });
})();

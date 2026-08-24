import assert from "node:assert/strict";
import test from "node:test";

await import("../assets/js/toy-network-latency-logic.js");
const logic = globalThis.yiyuiiiNetworkLatencyLogic;

test("the latency node catalog is fixed to 79 audited HTTPS endpoints", () => {
  assert.ok(Object.isFrozen(logic));
  assert.deepEqual(logic.NODE_DEFINITIONS.map((node) => node.id), [
    "dnspod-anycast",
    "alidns-global",
    "cloudflare-nearest",
    "hosthatch-hong-kong",
    "hosthatch-singapore",
    "hosthatch-tokyo",
    "hosthatch-seoul",
    "hosthatch-sydney",
    "hosthatch-amsterdam",
    "hosthatch-stockholm",
    "hosthatch-oslo",
    "hosthatch-london",
    "hosthatch-vienna",
    "hosthatch-zurich",
    "hosthatch-new-york",
    "hosthatch-los-angeles",
    "vultr-tokyo",
    "vultr-singapore",
    "vultr-seoul",
    "vultr-frankfurt",
    "vultr-los-angeles",
    "vultr-new-jersey",
    "vultr-bangalore",
    "vultr-delhi",
    "vultr-mumbai",
    "vultr-tel-aviv",
    "vultr-melbourne",
    "vultr-sydney",
    "vultr-amsterdam",
    "vultr-london",
    "vultr-madrid",
    "vultr-manchester",
    "vultr-milan",
    "vultr-paris",
    "vultr-stockholm",
    "vultr-warsaw",
    "vultr-atlanta",
    "vultr-chicago",
    "vultr-dallas",
    "vultr-honolulu",
    "vultr-miami",
    "vultr-seattle",
    "vultr-silicon-valley",
    "vultr-mexico-city",
    "vultr-toronto",
    "vultr-santiago",
    "vultr-sao-paulo",
    "vultr-johannesburg",
    "linode-atlanta",
    "linode-chicago",
    "linode-dallas",
    "linode-fremont",
    "linode-los-angeles",
    "linode-miami",
    "linode-newark",
    "linode-sao-paulo",
    "linode-seattle",
    "linode-toronto",
    "linode-washington",
    "linode-amsterdam",
    "linode-frankfurt",
    "linode-frankfurt-expansion",
    "linode-london",
    "linode-london-expansion",
    "linode-madrid",
    "linode-milan",
    "linode-paris",
    "linode-stockholm",
    "linode-chennai",
    "linode-jakarta",
    "linode-mumbai",
    "linode-mumbai-expansion",
    "linode-osaka",
    "linode-singapore",
    "linode-singapore-expansion",
    "linode-tokyo",
    "linode-tokyo-expansion",
    "linode-melbourne",
    "linode-sydney",
  ]);
  assert.deepEqual(
    logic.NODE_DEFINITIONS.map((node) => new URL(node.endpoint).protocol),
    Array(79).fill("https:"),
  );
  assert.deepEqual(logic.VISITOR_SOURCES, [
    { id: "ipip", endpoint: "https://myip.ipip.net/json" },
    { id: "ipsb", endpoint: "https://api.ip.sb/geoip" },
  ]);
});

test("visitor responses normalize IPIP first and preserve the IP.SB fallback detail", () => {
  assert.deepEqual(logic.normalizeVisitor("ipip", {
    ret: "ok",
    data: {
      ip: "203.0.113.9",
      location: ["中国", "浙江省", "杭州市", "家庭宽带", "联通"],
    },
  }), {
    ip: "203.0.113.9",
    ipVersion: "IPv4",
    network: "联通 · 家庭宽带",
    region: "中国 · 浙江省 · 杭州市",
  });
  assert.deepEqual(logic.normalizeVisitor("ipsb", {
    asn: 64500,
    asn_organization: "Example Transit",
    city: "Hangzhou",
    country: "CN",
    ip: "2001:db8::9",
    isp: "Example ISP",
    organization: "Example Subscriber",
    region: "Zhejiang",
  }), {
    ip: "2001:db8::9",
    ipVersion: "IPv6",
    network: "AS64500 · Example Transit · Example ISP · Example Subscriber",
    region: "Hangzhou · Zhejiang · CN",
  });
  assert.equal(logic.normalizeVisitor("ipip", { ret: "error" }), null);
  assert.equal(logic.normalizeVisitor("unknown", {}), null);
});

test("probe requests use no credentials, no referrer, and bounded methods", () => {
  const dns = logic.buildProbeRequest("dnspod-anycast", 0x1234);
  assert.match(dns.url, /^https:\/\/doh\.pub\/dns-query\?dns=[A-Za-z0-9_-]+$/u);
  assert.equal(dns.init.method, "GET");
  assert.equal(dns.init.mode, "no-cors");
  assert.equal(dns.init.credentials, "omit");
  assert.equal(dns.init.referrerPolicy, "no-referrer");

  const cloudflare = logic.buildProbeRequest("cloudflare-nearest", 2);
  assert.equal(new URL(cloudflare.url).searchParams.get("bytes"), "0");
  assert.equal(cloudflare.init.method, "GET");
  assert.equal(cloudflare.init.mode, "cors");

  const vultr = logic.buildProbeRequest("vultr-tokyo", 3);
  assert.equal(new URL(vultr.url).hostname, "hnd-jp-ping.vultr.com");
  assert.equal(vultr.init.method, "HEAD");
  assert.equal(vultr.init.mode, "cors");

  const johannesburg = logic.buildProbeRequest("vultr-johannesburg", 4);
  assert.equal(new URL(johannesburg.url).hostname, "jnb-za-ping.vultr.com");
  assert.equal(johannesburg.init.method, "HEAD");
  assert.equal(johannesburg.init.mode, "cors");

  const hongKong = logic.buildProbeRequest("hosthatch-hong-kong", 5);
  assert.equal(new URL(hongKong.url).hostname, "lg.hkg.hosthatch.com");
  assert.equal(new URL(hongKong.url).pathname, "/api/health");
  assert.equal(hongKong.init.method, "GET");
  assert.equal(hongKong.init.mode, "no-cors");

  const linode = logic.buildProbeRequest("linode-tokyo", 6);
  assert.equal(new URL(linode.url).hostname, "speedtest.tokyo2.linode.com");
  assert.equal(linode.init.method, "HEAD");
  assert.equal(linode.init.mode, "no-cors");
  assert.throws(() => logic.buildProbeRequest("unknown", 1), /unknown latency node/u);
  assert.throws(() => logic.buildProbeRequest("vultr-tokyo", -1), /invalid sequence/u);
});

test("percentiles use linear interpolation and reject invalid quantiles", () => {
  assert.equal(logic.percentile([0, 10], 0.5), 5);
  assert.equal(logic.percentile([40, 10, 30, 20], 0.95), 38.5);
  assert.equal(logic.percentile([], 0.5), null);
  assert.throws(() => logic.percentile([1], 2), /quantile/u);
});

test("summaries keep failures as gaps and calculate adjacent variation honestly", () => {
  const summary = logic.summarize([20, 22, null, 80, 84]);
  assert.equal(summary.successCount, 4);
  assert.equal(summary.failureCount, 1);
  assert.equal(summary.totalCount, 5);
  assert.equal(summary.jitter, 3);
  assert.equal(summary.maximum, 84);
  assert.equal(summary.longestFailureStreak, 1);
  assert.equal(summary.longestBadStreak, 1);
});

test("grades describe measured performance without claiming a route identity", () => {
  assert.equal(logic.summarize([20, 22, 21, 23, 24]).grade, "excellent");
  assert.equal(logic.summarize([70, 75, 80, 82, 78]).grade, "good");
  assert.equal(logic.summarize([210, 212, 214, 211, 213]).grade, "elevated");
  assert.equal(logic.summarize([20, null, null, 24, 22]).grade, "unstable");
  assert.equal(logic.summarize([20, 21]).grade, "unavailable");
});

test("spike and consecutive-abnormal counters retain gaming-relevant outliers", () => {
  const summary = logic.summarize([30, 120, 220, 320, null, 40]);
  assert.equal(summary.over100, 3);
  assert.equal(summary.over200, 2);
  assert.equal(summary.over300, 1);
  assert.equal(summary.longestBadStreak, 4);
});

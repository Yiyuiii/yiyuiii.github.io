import { expect, test } from "@playwright/test";

await import("../../assets/js/toy-network-latency-logic.js");
const latencyLogic = globalThis.yiyuiiiNetworkLatencyLogic;
const endpointHosts = new Set([
  ...latencyLogic.VISITOR_SOURCES,
  ...latencyLogic.NODE_DEFINITIONS,
].map(({ endpoint }) => new URL(endpoint).hostname));
const visitorHosts = new Set(["myip.ipip.net", "api.ip.sb"]);
const probeHosts = new Set([...endpointHosts].filter((hostname) => !visitorHosts.has(hostname)));
const defaultNodeIds = [
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
];
const nodeById = new Map(latencyLogic.NODE_DEFINITIONS.map((node) => [node.id, node]));
const defaultProbeHosts = new Set(defaultNodeIds.map((id) => (
  new URL(nodeById.get(id).endpoint).hostname
)));

const installEndpointStubs = async (
  page,
  requests,
  {
    cloudflareFallback = false,
    delayedHost = "",
    failAllVisitors = false,
    failedVisitorHost = "",
    visitorDelay = 0,
  } = {},
) => {
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (endpointHosts.has(url.hostname)) {
      requests.push({
        hostname: url.hostname,
        method: request.method(),
        pathname: url.pathname,
        time: performance.now(),
      });
    }
  });
  await page.route("https://**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!endpointHosts.has(url.hostname)) {
      await route.continue();
      return;
    }
    const corsHeaders = {
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      "content-type": "application/octet-stream",
    };
    if (visitorHosts.has(url.hostname) && visitorDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, visitorDelay));
    }
    if (url.hostname === failedVisitorHost || (failAllVisitors && visitorHosts.has(url.hostname))) {
      await route.fulfill({ body: "unavailable", headers: corsHeaders, status: 503 });
      return;
    }
    if (url.hostname === "myip.ipip.net" && url.pathname === "/json") {
      await route.fulfill({
        headers: { ...corsHeaders, "content-type": "application/json" },
        json: {
          ret: "ok",
          data: {
            ip: "203.0.113.9",
            location: ["中国", "浙江省", "杭州市", "家庭宽带", "中国联通"],
          },
        },
        status: 200,
      });
      return;
    }
    if (url.hostname === "api.ip.sb" && url.pathname === "/geoip") {
      await route.fulfill({
        headers: { ...corsHeaders, "content-type": "application/json" },
        json: {
          asn: 64500,
          asn_organization: "Example Transit",
          city: "Hangzhou",
          ip: "203.0.113.9",
          country: "CN",
          isp: "Example ISP",
          organization: "Example Subscriber",
          region: "Zhejiang",
        },
        status: 200,
      });
      return;
    }
    if (url.hostname === delayedHost) {
      await new Promise((resolve) => setTimeout(resolve, 1400));
    }
    const headers = cloudflareFallback && url.hostname === "speed.cloudflare.com"
      ? {
        ...corsHeaders,
        "access-control-expose-headers": "cf-meta-asn, cf-meta-city, cf-meta-country, cf-meta-ip",
        "cf-meta-asn": "13335",
        "cf-meta-city": "Hong Kong",
        "cf-meta-country": "HK",
        "cf-meta-ip": "2001:db8::9",
      }
      : corsHeaders;
    await route.fulfill({ body: "", headers, status: 200 });
  });
};

const openLatencyTool = async (page) => {
  const disclosure = page.locator("#network-latency");
  await disclosure.locator(":scope > summary").click();
  await expect(disclosure).toHaveAttribute("data-toy-load-state", "ready");
  return disclosure;
};

const sampleCell = (disclosure, nodeId) => disclosure
  .locator(`[data-latency-live-row="${nodeId}"] [data-latency-live="samples"]`);

const expectAtLeastSamples = async (disclosure, nodeId, minimum, timeout = 7000) => {
  await expect.poll(async () => {
    const value = (await sampleCell(disclosure, nodeId).textContent())?.trim() || "";
    const match = /^(\d+)\/(\d+)$/u.exec(value);
    return match ? Math.min(Number(match[1]), Number(match[2])) : 0;
  }, { timeout }).toBeGreaterThanOrEqual(minimum);
};

test("default nodes start together and publish live list and chart samples", async ({ page }) => {
  test.slow();
  const requests = [];
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { downlink: 10, effectiveType: "4g", rtt: 50 },
    });
  });
  await installEndpointStubs(page, requests);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/toys/");
  const disclosure = await openLatencyTool(page);

  expect(requests).toEqual([]);
  await expect(disclosure.locator("h4")).toContainText(["当前网络", "节点网络延迟"]);
  await expect(disclosure.locator(
    ".toy-network-latency__selector + .toy-network-latency__section > h4",
  )).toHaveText("当前网络");
  await expect(disclosure.locator("[data-latency-test-start]")).toHaveText("开始测试");
  await expect(disclosure).not.toContainText("约 60 秒全节点并发测试");
  await expect(disclosure).not.toContainText("能测到什么");
  await expect(disclosure).not.toContainText("IPIP.NET 的免费服务没有可用性承诺");
  await expect(disclosure).not.toContainText("每行显示两个越低越好的指标");
  await expect(disclosure.locator(
    "[data-latency-live-row]:visible .toy-network-latency__compact-metric [data-latency-live]",
  )).toHaveText(Array(20).fill("—"));
  await expect(disclosure.locator("[data-latency-selection-count]")).toHaveText("10/79 已启用");
  await expect(disclosure.locator("[data-latency-node-toggle]")).toHaveCount(79);
  await expect(disclosure.locator("[data-latency-node-toggle]:checked")).toHaveCount(10);
  const visibleRows = disclosure.locator("[data-latency-live-row]:visible");
  await expect(visibleRows).toHaveCount(10);
  expect(await visibleRows.evaluateAll((rows) => (
    rows.map((row) => row.dataset.latencyLiveRow)
  ))).toEqual(defaultNodeIds);
  await expect(disclosure.locator(".toy-network-latency__quality-list")).not.toContainText(
    "无法获取",
  );
  await expect(disclosure.locator("[data-network-visitor] dd")).toHaveText(Array(4).fill("—"));
  await expect(disclosure.locator("[data-visitor-source]")).toHaveText("—");
  await expect(disclosure).not.toContainText("点击测试后获取");
  await expect(disclosure).not.toContainText("P50：绿色");
  await expect(disclosure.locator(".toy-network-latency__quality-legend-row")).toHaveCount(2);
  await expect(disclosure.locator(".toy-network-latency__quality-legend-row > strong")).toHaveText([
    "P50", "波动",
  ]);
  await expect(disclosure.locator(".toy-network-latency__quality-band")).toHaveCount(8);
  for (const quality of ["excellent", "good", "elevated", "unstable"]) {
    await expect(disclosure.locator(
      `.toy-network-latency__quality-band[data-quality="${quality}"]`,
    )).toHaveCount(2);
  }
  const legendColors = await disclosure.locator(
    ".toy-network-latency__quality-band .toy-network-latency__indicator",
  ).evaluateAll((indicators) => indicators.map((indicator) => (
    getComputedStyle(indicator).backgroundColor
  )));
  expect(new Set(legendColors.slice(0, 4)).size).toBe(4);
  expect(legendColors.slice(4)).toEqual(legendColors.slice(0, 4));
  const legendIndicatorColumns = await disclosure.locator(
    ".toy-network-latency__quality-legend-row",
  ).evaluateAll((rows) => rows.map((row) => (
    [...row.querySelectorAll(".toy-network-latency__indicator")]
      .map((indicator) => Math.round(indicator.getBoundingClientRect().left * 10) / 10)
  )));
  expect(legendIndicatorColumns[1]).toEqual(legendIndicatorColumns[0]);
  const legendBox = await disclosure.locator(
    ".toy-network-latency__quality-legend",
  ).evaluate((legend) => ({
    clientWidth: legend.clientWidth,
    scrollWidth: legend.scrollWidth,
  }));
  expect(legendBox.scrollWidth).toBeLessThanOrEqual(legendBox.clientWidth);
  const storageBefore = await page.evaluate(() => ({
    cookie: document.cookie,
    local: Object.entries(localStorage),
    session: Object.entries(sessionStorage),
  }));

  const startedAt = performance.now();
  await disclosure.locator("[data-latency-test-start]").click();
  const rows = disclosure.locator("[data-latency-live-row]");
  await expect(rows).toHaveCount(79);
  await expect(disclosure.locator("[data-latency-live-row]:visible")).toHaveCount(10);
  for (const nodeId of defaultNodeIds) {
    await expectAtLeastSamples(disclosure, nodeId, 2);
    await expect(disclosure.locator(
      `[data-latency-live-row="${nodeId}"] [data-latency-indicator="p50"]`,
    )).toHaveAttribute("data-quality", /^(?:excellent|good|elevated|unstable)$/u);
    await expect(disclosure.locator(
      `[data-latency-live-row="${nodeId}"] [data-latency-indicator="jitter"]`,
    )).toHaveAttribute("data-quality", /^(?:excellent|good|elevated|unstable)$/u);
  }
  await expect(disclosure.locator("[data-latency-status]")).toContainText("/600 个样本");

  expect(requests.filter(({ hostname, pathname }) => (
    hostname === "myip.ipip.net" && pathname === "/json"
  ))).toHaveLength(1);
  expect(requests.filter(({ hostname }) => hostname === "api.ip.sb")).toEqual([]);
  for (const hostname of defaultProbeHosts) {
    const hostRequests = requests.filter(({ hostname: seen, time }) => (
      seen === hostname && time >= startedAt
    ));
    expect(hostRequests.length).toBeGreaterThanOrEqual(3);
    for (let index = 1; index < hostRequests.length; index += 1) {
      expect(hostRequests[index].time - hostRequests[index - 1].time).toBeGreaterThanOrEqual(850);
    }
  }
  expect(requests.filter(({ hostname }) => (
    probeHosts.has(hostname) && !defaultProbeHosts.has(hostname)
  ))).toEqual([]);
  expect(requests.filter(({ hostname, method }) => (
    hostname.endsWith(".vultr.com") && method !== "HEAD"
  ))).toEqual([]);
  expect(requests.filter(({ hostname, method }) => (
    hostname.endsWith(".hosthatch.com") && method !== "GET"
  ))).toEqual([]);
  expect(requests.filter(({ hostname, method }) => (
    hostname.endsWith(".linode.com") && method !== "HEAD"
  ))).toEqual([]);
  expect(requests.filter(({ hostname, method }) => (
    ["doh.pub", "dns.alidns.com", "speed.cloudflare.com"].includes(hostname)
      && method !== "GET"
  ))).toEqual([]);

  const chartLines = disclosure.locator("[data-latency-chart-line]");
  await expect(chartLines).toHaveCount(79);
  await expect(disclosure.locator("[data-latency-chart-line]:visible")).toHaveCount(10);
  for (const nodeId of defaultNodeIds) {
    await expect(disclosure.locator(
      `[data-latency-chart-line="${nodeId}"]`,
    )).toHaveAttribute("d", /^M .+L /u);
  }
  await expect(disclosure.locator(
    ".toy-network-latency__legend [data-latency-series]:visible .toy-network-latency__legend-swatch",
  )).toHaveCount(10);
  await expect(disclosure.locator('[data-visitor-field="ip"]')).toHaveText("203.0.113.9 · IPv4");
  await expect(disclosure.locator('[data-visitor-field="network"]')).toHaveText(
    "中国联通 · 家庭宽带",
  );
  await expect(disclosure.locator('[data-visitor-field="browser_connection"]')).toHaveText(
    "RTT 50 ms · 下行 10 Mbps",
  );
  expect(await disclosure.locator(
    '[data-visitor-field="browser_connection"]',
  ).evaluate((element) => getComputedStyle(element).fontWeight)).toBe("400");
  await expect(disclosure.locator("[data-visitor-source]")).toHaveText("IPIP.NET");
  await expect(disclosure.locator(".toy-network-latency__diagnostics")).toHaveCount(79);
  await expect(disclosure.locator(
    "[data-latency-live-row]:visible .toy-network-latency__diagnostics",
  )).toHaveCount(10);
  await expect(disclosure.locator(".toy-network-latency__nodes")).toHaveCount(0);
  const firstDetails = disclosure.locator(".toy-network-latency__diagnostics").first();
  await firstDetails.locator("summary").click();
  await expect(firstDetails).toContainText("节点来源与特性");
  await expect(firstDetails).toContainText("Tencent Cloud DNSPod Public DNS");
  const hongKongDetails = disclosure.locator(
    '[data-latency-live-row="hosthatch-hong-kong"] .toy-network-latency__diagnostics',
  );
  await hongKongDetails.locator("summary").click();
  await expect(hongKongDetails).toContainText("Equinix HK1");
  await expect(hongKongDetails).toContainText("HostHatch Looking Glass");
  await expect(hongKongDetails).toContainText("HostHatch 是什么");
  const linodeDetails = disclosure.locator(
    '[data-latency-live-row="linode-tokyo"] .toy-network-latency__diagnostics',
  );
  await linodeDetails.locator("summary").click();
  await expect(linodeDetails).toContainText("Akamai / Linode 是什么");
  await expect(linodeDetails).toContainText("于 2022 年收购 Linode");
  await expect(linodeDetails).toContainText("不是 CDN 就近边缘");
  await expect(linodeDetails).toContainText("Akamai Cloud Speed Test");
  const vultrDetails = disclosure.locator(
    '[data-latency-live-row="vultr-tokyo"] .toy-network-latency__diagnostics',
  );
  await vultrDetails.locator("summary").click();
  await expect(vultrDetails).toContainText("Vultr 是什么");
  await expect(vultrDetails).toContainText("Constant 于 2014 年推出的国际云服务商");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await disclosure.locator("[data-latency-stop]").click();
  const countAfterStop = requests.length;
  await page.waitForTimeout(1200);
  expect(requests).toHaveLength(countAfterStop);
  await expect(disclosure.locator("[data-network-latency]")).toHaveAttribute(
    "data-latency-running",
    "false",
  );
  expect(await page.evaluate(() => ({
    cookie: document.cookie,
    local: Object.entries(localStorage),
    session: Object.entries(sessionStorage),
  }))).toEqual(storageBefore);
});

test("node selection supports clear, all, defaults, and a single optional node", async ({ page }) => {
  const requests = [];
  await installEndpointStubs(page, requests);
  await page.goto("/toys/");
  const disclosure = await openLatencyTool(page);
  const selector = disclosure.locator("[data-latency-node-selector]");
  await selector.locator("summary").click();

  await expect(selector.locator("fieldset")).toHaveCount(7);
  await selector.locator("[data-latency-selection-none]").click();
  await expect(disclosure.locator("[data-latency-selection-count]")).toHaveText("0/79 已启用");
  await expect(disclosure.locator("[data-latency-live-row]:visible")).toHaveCount(0);
  await expect(disclosure.locator("[data-latency-test-start]")).toBeDisabled();
  await expect(disclosure.locator("[data-latency-status]")).toHaveText("请至少启用一个节点。");

  await selector.locator("[data-latency-selection-all]").click();
  await expect(disclosure.locator("[data-latency-node-toggle]:checked")).toHaveCount(79);
  await expect(disclosure.locator("[data-latency-live-row]:visible")).toHaveCount(79);
  await expect(disclosure.locator("[data-latency-selection-count]")).toHaveText("79/79 已启用");

  await selector.locator("[data-latency-selection-default]").click();
  await expect(disclosure.locator("[data-latency-node-toggle]:checked")).toHaveCount(10);
  await expect(disclosure.locator("[data-latency-live-row]:visible")).toHaveCount(10);

  await selector.locator("[data-latency-selection-none]").click();
  await selector.locator('[data-latency-node-toggle][value="vultr-sydney"]').check();
  await expect(disclosure.locator("[data-latency-selection-count]")).toHaveText("1/79 已启用");
  await expect(disclosure.locator("[data-latency-live-row]:visible h5")).toHaveText(
    "澳大利亚 · 悉尼 · Vultr",
  );

  await disclosure.locator("[data-latency-test-start]").click();
  await expectAtLeastSamples(disclosure, "vultr-sydney", 2);
  await expect(disclosure.locator("[data-latency-status]")).toContainText("/60 个样本");
  await expect(disclosure.locator("[data-latency-node-toggle]:disabled")).toHaveCount(79);
  await expect(selector.locator("button:disabled")).toHaveCount(3);
  expect(requests.filter(({ hostname }) => hostname === "syd-au-ping.vultr.com").length)
    .toBeGreaterThanOrEqual(3);
  expect(requests.filter(({ hostname }) => (
    probeHosts.has(hostname) && hostname !== "syd-au-ping.vultr.com"
  ))).toEqual([]);

  await disclosure.locator("[data-latency-stop]").click();
  await expect(disclosure.locator("[data-latency-node-toggle]:disabled")).toHaveCount(0);
});

test("an unavailable IPIP request falls back once to IP.SB", async ({ page }) => {
  const requests = [];
  await installEndpointStubs(page, requests, { failedVisitorHost: "myip.ipip.net" });
  await page.goto("/toys/");
  const disclosure = await openLatencyTool(page);

  await disclosure.locator("[data-latency-test-start]").click();
  await expect(disclosure.locator('[data-visitor-field="ip"]')).toHaveText(
    "203.0.113.9 · IPv4",
    { timeout: 6000 },
  );
  await expect(disclosure.locator('[data-visitor-field="network"]')).toHaveText(
    "AS64500 · Example Transit · Example ISP · Example Subscriber",
  );
  await expect(disclosure.locator("[data-visitor-source]")).toHaveText("IP.SB");
  expect(requests.filter(({ hostname }) => hostname === "myip.ipip.net")).toHaveLength(1);
  expect(requests.filter(({ hostname }) => hostname === "api.ip.sb")).toHaveLength(1);
  await disclosure.locator("[data-latency-stop]").click();
});

test("visitor placeholders become unavailable only after both sources fail", async ({ page }) => {
  const requests = [];
  await installEndpointStubs(page, requests, { failAllVisitors: true });
  await page.goto("/toys/");
  const disclosure = await openLatencyTool(page);

  await expect(disclosure.locator("[data-network-visitor] dd")).toHaveText(Array(4).fill("—"));
  await disclosure.locator("[data-latency-test-start]").click();
  await expect(disclosure.locator("[data-visitor-source]")).toHaveText("无法获取");
  for (const field of ["ip", "network", "region"]) {
    await expect(disclosure.locator(`[data-visitor-field="${field}"]`)).toHaveText("无法获取");
  }
  expect(requests.filter(({ hostname }) => hostname === "myip.ipip.net")).toHaveLength(1);
  expect(requests.filter(({ hostname }) => hostname === "api.ip.sb")).toHaveLength(1);
  await disclosure.locator("[data-latency-stop]").click();
});

test("Cloudflare IP fallback survives faster and slower visitor-source failures", async ({ browser }) => {
  for (const { delayedHost, visitorDelay } of [
    { delayedHost: "", visitorDelay: 500 },
    { delayedHost: "speed.cloudflare.com", visitorDelay: 0 },
  ]) {
    const page = await browser.newPage();
    const requests = [];
    await installEndpointStubs(page, requests, {
      cloudflareFallback: true,
      delayedHost,
      failAllVisitors: true,
      visitorDelay,
    });
    await page.goto("/toys/");
    const disclosure = await openLatencyTool(page);

    await disclosure.locator("[data-latency-test-start]").click();
    await expect(disclosure.locator('[data-visitor-field="ip"]')).toHaveText(
      "2001:db8::9 · IPv6",
      { timeout: 6000 },
    );
    await expect(disclosure.locator('[data-visitor-field="network"]')).toHaveText("AS13335");
    await expect(disclosure.locator('[data-visitor-field="region"]')).toHaveText(
      "Hong Kong · HK",
    );
    await expect(disclosure.locator("[data-visitor-source]")).toHaveText(
      "Cloudflare 节点（仅部分信息）",
    );
    expect(requests.filter(({ hostname }) => hostname === "myip.ipip.net")).toHaveLength(1);
    expect(requests.filter(({ hostname }) => hostname === "api.ip.sb")).toHaveLength(1);
    await disclosure.locator("[data-latency-stop]").click();
    await page.close();
  }
});

test("a slow node does not hold back live results from the other nodes", async ({ page }) => {
  const requests = [];
  await installEndpointStubs(page, requests, { delayedHost: "hnd-jp-ping.vultr.com" });
  await page.goto("/en/toys/");
  const disclosure = await openLatencyTool(page);

  await disclosure.locator("[data-latency-test-start]").click();
  await expectAtLeastSamples(disclosure, "hosthatch-singapore", 2, 6000);
  await expect(sampleCell(disclosure, "vultr-tokyo")).toHaveText("—");
  await expect(disclosure.locator(
    '[data-latency-live-row="hosthatch-singapore"] [data-latency-indicator="p50"]',
  )).toHaveAttribute("data-quality", /^(?:excellent|good|elevated|unstable)$/u);
  await expect(disclosure.locator(
    '[data-latency-live-row="vultr-tokyo"] [data-latency-indicator="p50"]',
  )).toHaveAttribute("data-quality", "unavailable");
  await expect(disclosure.locator(
    '[data-latency-chart-line="hosthatch-singapore"]',
  )).toHaveAttribute("d", /^M .+L /u);
  await expect(disclosure.locator(
    '[data-latency-chart-line="vultr-tokyo"]',
  )).toHaveAttribute("d", "");

  await disclosure.locator(":scope > summary").click();
  const countAfterCollapse = requests.length;
  await page.waitForTimeout(1600);
  expect(requests).toHaveLength(countAfterCollapse);
  await expect(disclosure.locator("[data-network-latency]")).toHaveAttribute(
    "data-latency-running",
    "false",
  );
});

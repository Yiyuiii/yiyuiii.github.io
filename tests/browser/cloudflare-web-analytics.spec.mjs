import { expect, test } from "@playwright/test";

const CANONICAL_HOSTNAME = "yiyuiii.top";
const TOKEN = "10a1ef244b7d40a394ed6ce25332ea00";
const BEACON_URL = "https://static.cloudflareinsights.com/beacon.min.js";

const canonicalOrigin = () => {
  const url = new URL(process.env.SITE_URL || "http://127.0.0.1:62091");
  url.hostname = CANONICAL_HOSTNAME;
  return url.origin;
};

const proxyCanonicalHostToPreview = async (context) => {
  const previewOrigin = process.env.SITE_URL || "http://127.0.0.1:62091";
  await context.route(`${canonicalOrigin()}/**`, async (route) => {
    const requested = new URL(route.request().url());
    const upstream = new URL(`${requested.pathname}${requested.search}`, previewOrigin);
    const response = await route.fetch({ url: upstream.href });
    await route.fulfill({ response });
  });
};

test("loopback preview exposes the disclosure without sending analytics", async ({ page }) => {
  const externalRequests = [];
  page.on("request", (request) => {
    const hostname = new URL(request.url()).hostname;
    if (hostname.endsWith("cloudflareinsights.com")) {
      externalRequests.push(request.url());
    }
  });

  await page.goto("/");

  await expect(page.locator("script[data-cloudflare-web-analytics]")).toHaveCount(1);
  await expect(page.locator("script[data-cf-beacon]")).toHaveCount(0);
  await expect(page.locator(".site-footer__analytics")).toContainText(
    "不使用 Cookie、本地存储或跨站访客指纹",
  );
  expect(externalRequests).toEqual([]);
});

test("canonical hostname injects the supplied Cloudflare beacon exactly once", async ({
  browser,
}) => {
  const context = await browser.newContext({ baseURL: canonicalOrigin() });
  await proxyCanonicalHostToPreview(context);
  const beaconRequests = [];
  await context.route(BEACON_URL, async (route) => {
    beaconRequests.push(route.request().url());
    await route.fulfill({
      contentType: "application/javascript",
      headers: { "access-control-allow-origin": "*" },
      body: `globalThis.__cloudflareBeaconConfig = document.querySelector(
        "script[data-cf-beacon]"
      )?.getAttribute("data-cf-beacon");`,
    });
  });

  const page = await context.newPage();
  await page.goto("/");

  const beacon = page.locator(`script[src="${BEACON_URL}"][data-cf-beacon]`);
  await expect(beacon).toHaveCount(1);
  await expect(beacon).toHaveAttribute("type", "module");
  await expect.poll(() => page.evaluate(() => globalThis.__cloudflareBeaconConfig)).toBe(
    JSON.stringify({ token: TOKEN }),
  );
  expect(beaconRequests).toEqual([BEACON_URL]);

  await context.close();
});

test("a blocked Cloudflare script does not break the page", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: canonicalOrigin() });
  await proxyCanonicalHostToPreview(context);
  await context.route(BEACON_URL, (route) => route.abort("blockedbyclient"));
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "你好 👋" })).toBeVisible();
  await expect(page.locator(".site-footer__analytics")).toBeVisible();
  expect(pageErrors).toEqual([]);

  await context.close();
});

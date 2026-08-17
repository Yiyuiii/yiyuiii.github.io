import { expect, test } from "@playwright/test";

const EXTERNAL_URL = "https://diax7.github.io/redeem-apple-gift-cards-without-typing/";

for (const [route, title, label] of [
  ["/toys/", "Apple 礼品码转相机可扫描卡片（外部）", "前往 diax7.github.io（新标签页）"],
  ["/en/toys/", "Apple gift code to camera-scannable card (external)", "Visit diax7.github.io (new tab)"],
]) {
  test(`${route} exposes one explicit external converter link without contacting it`, async ({ page }) => {
    const upstreamRequests = [];
    page.on("request", (request) => {
      if (new URL(request.url()).hostname === "diax7.github.io") {
        upstreamRequests.push(request.url());
      }
    });

    await page.goto(route);
    const link = page.locator("#apple-gift-card-scanner.toy-entry--external");
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("href", EXTERNAL_URL);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "external noopener noreferrer");
    await expect(link.locator(".toy-entry__title")).toHaveText(title);
    await expect(link.locator(".toy-entry__external-label")).toContainText(label);
    await expect(link.locator("input, textarea, iframe, script, .toy-entry__body")).toHaveCount(0);
    await expect(link).not.toHaveAttribute("data-toy-disclosure", /.*/u);
    await expect(link).not.toHaveAttribute("data-toy-assets", /.*/u);
    expect(upstreamRequests).toEqual([]);
  });
}

test("one click opens only the fixed upstream destination in a new tab", async ({ context, page }) => {
  await context.route("https://diax7.github.io/**", async (route) => {
    await route.fulfill({
      body: "<!doctype html><title>Upstream test double</title>",
      contentType: "text/html",
      status: 200,
    });
  });
  await page.goto("/toys/");

  const popupPromise = page.waitForEvent("popup");
  await page.locator("#apple-gift-card-scanner").click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  expect(popup.url()).toBe(EXTERNAL_URL);
  await expect(page).toHaveURL(/\/toys\/$/u);
  await popup.close();
});

test("the external destination remains usable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: process.env.SITE_URL || "http://localhost:62091",
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  try {
    await page.goto("/toys/");
    const link = page.locator("#apple-gift-card-scanner");
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", EXTERNAL_URL);
  } finally {
    await context.close();
  }
});

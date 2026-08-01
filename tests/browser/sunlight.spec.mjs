import { expect, test } from "@playwright/test";

const STORAGE_KEY = "yiyuiii.sunlight.v1";
const viewports = [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 800 },
];

const articleRoute =
  "/posts/%E5%A4%A7%E5%88%9B%E9%80%A0%E6%97%B6%E4%BB%A3-%E8%B5%84%E6%BA%90-%E5%88%86%E5%80%BC%E9%87%8F%E5%8C%96%E8%AE%A1%E7%AE%97%E6%80%9D%E8%B7%AF/";

test("sunlight defaults on and keeps the action order", async ({ page }) => {
  await page.goto("/");

  const button = page.locator("#sunlight-toggle");
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(button).toHaveAttribute("aria-label", "关闭阳光背景");
  await expect(page.locator("html")).toHaveAttribute("data-sunlight", "on");
  expect(
    await page.locator("body").evaluate(
      (node) => getComputedStyle(node, "::before").content,
    ),
  ).not.toBe("none");

  const order = await page.locator(".site-actions").evaluate((actions) =>
    [...actions.children]
      .filter((node) => node.matches("button, a"))
      .map((node) => node.id || node.className),
  );
  expect(order).toEqual(["search-toggle", "sunlight-toggle", "language-switch"]);
});

test("sunlight toggles by keyboard and persists after refresh", async ({ page }) => {
  await page.goto("/");
  const button = page.locator("#sunlight-toggle");

  await button.focus();
  await page.keyboard.press("Space");
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(button).toHaveAttribute("aria-label", "开启阳光背景");
  await expect(page.locator("#sunlight-status")).toHaveText("阳光背景已关闭");
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(
    "off",
  );
  expect(
    await page.locator("body").evaluate(
      (node) => getComputedStyle(node, "::before").content,
    ),
  ).toBe("none");

  await page.reload();
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("html")).toHaveAttribute("data-sunlight", "off");

  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#sunlight-status")).toHaveText("阳光背景已开启");
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(
    "on",
  );
});

test("an invalid stored value safely defaults to on", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "invalid"), STORAGE_KEY);
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-sunlight", "on");
  await expect(page.locator("#sunlight-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(
    "invalid",
  );
});

test("without JavaScript the effect stays on and the control stays hidden", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: process.env.SITE_URL || "http://localhost:62091",
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/");

  await expect(page.locator("#sunlight-toggle")).toBeHidden();
  await expect(page.locator("html")).not.toHaveAttribute("data-sunlight", /.+/);
  expect(
    await page.locator("body").evaluate(
      (node) => getComputedStyle(node, "::before").content,
    ),
  ).not.toBe("none");
  await context.close();
});

test("404 pages expose neither sunlight control nor effect", async ({ page }) => {
  const response = await page.goto("/missing-sunlight-contract-page/");
  expect(response.status()).toBe(404);

  await expect(page.locator("#sunlight-toggle")).toHaveCount(0);
  await expect(page.locator('script[src*="sunlight.js"]')).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-sunlight", /.+/);
  expect(
    await page.locator("body").evaluate(
      (node) => getComputedStyle(node, "::before").content,
    ),
  ).toBe("none");
});

test("sunlight action and status copy follow the page language", async ({ page }) => {
  for (const [route, offAction, offStatus] of [
    ["/", "关闭阳光背景", "阳光背景已关闭"],
    ["/en/", "Turn off the sunlight background", "Sunlight background is off"],
  ]) {
    await page.goto(route);
    await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
    await page.reload();
    const button = page.locator("#sunlight-toggle");
    await expect(button).toHaveAttribute("aria-label", offAction);
    await button.click();
    await expect(page.locator("#sunlight-status")).toHaveText(offStatus);
  }
});

for (const viewport of viewports) {
  test(`sunlight source follows the avatar without overflow at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const geometry = await page.evaluate(() => {
      const avatar = document.querySelector(".site-header .site-brand__avatar");
      const probe = document.createElement("span");
      probe.style.cssText = [
        "position:absolute",
        "left:var(--sunlight-x)",
        "top:var(--sunlight-y)",
        "width:0",
        "height:0",
        "pointer-events:none",
      ].join(";");
      document.body.append(probe);
      const avatarBox = avatar.getBoundingClientRect();
      const probeBox = probe.getBoundingClientRect();
      const result = {
        xDelta: Math.abs(probeBox.left - (avatarBox.left + avatarBox.width / 2)),
        yDelta: Math.abs(probeBox.top - (avatarBox.top + avatarBox.height / 2)),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
      probe.remove();
      return result;
    });

    expect(geometry.xDelta).toBeLessThanOrEqual(0.6);
    expect(geometry.yDelta).toBeLessThanOrEqual(0.6);
    expect(geometry.overflow).toBe(false);
  });
}

for (const route of ["/", articleRoute]) {
  test(`sunlight remains behind readable content on ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(route);

    const reading = await page.locator("main").evaluate((main) => {
      const firstText = main.querySelector("h1, p");
      const style = getComputedStyle(firstText);
      return {
        visible: firstText.getBoundingClientRect().height > 0,
        color: style.color,
        pseudoPointerEvents: getComputedStyle(document.body, "::before").pointerEvents,
        pseudoZIndex: getComputedStyle(document.body, "::before").zIndex,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });

    expect(reading.visible).toBe(true);
    expect(reading.color).not.toBe("rgba(0, 0, 0, 0)");
    expect(reading.pseudoPointerEvents).toBe("none");
    expect(reading.pseudoZIndex).toBe("-1");
    expect(reading.overflow).toBe(false);
  });
}

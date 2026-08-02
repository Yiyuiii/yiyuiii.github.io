import { expect, test } from "@playwright/test";

const AMBIENT_STORAGE_KEY = "yiyuiii.sunlight.v1";
const THEME_STORAGE_KEY = "yiyuiii.theme.v1";
const viewports = [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 800 },
];

const articleRoute =
  "/posts/%E5%A4%A7%E5%88%9B%E9%80%A0%E6%97%B6%E4%BB%A3-%E8%B5%84%E6%BA%90-%E5%88%86%E5%80%BC%E9%87%8F%E5%8C%96%E8%AE%A1%E7%AE%97%E6%80%9D%E8%B7%AF/";
const mermaidArticleRoute =
  "/posts/%E5%9B%9B%E5%AD%A3%E7%89%A9%E8%AF%AD%E9%87%8F%E5%8C%96%E5%88%86%E6%9E%90%E6%94%BB%E7%95%A5/";

const clearPreferences = async (page) => {
  await page.evaluate(
    ([ambientKey, themeKey]) => {
      localStorage.removeItem(ambientKey);
      localStorage.removeItem(themeKey);
    },
    [AMBIENT_STORAGE_KEY, THEME_STORAGE_KEY],
  );
};

test("light and sunlight are the progressive defaults with the revised action order", async ({
  page,
}) => {
  await page.goto("/");

  const ambientButton = page.locator("#sunlight-toggle");
  const themeButton = page.locator("#theme-toggle");
  await expect(ambientButton).toBeVisible();
  await expect(ambientButton).toHaveAttribute("aria-pressed", "true");
  await expect(ambientButton).toHaveAttribute("aria-label", "关闭日光背景");
  await expect(page.locator("#sunlight-fallback-link")).toBeHidden();
  await expect(page.locator(".site-brand__name")).toHaveAttribute("href", "/");
  await expect(themeButton).toBeVisible();
  await expect(themeButton).toHaveAttribute("aria-pressed", "false");
  await expect(themeButton).toHaveAttribute("aria-label", "切换到夜晚样式");
  await expect(page.locator("html")).toHaveAttribute("data-sunlight", "on");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  const visuals = await page.locator("body").evaluate((node) => ({
    glow: getComputedStyle(node, "::before").content,
    rays: getComputedStyle(node, "::after").content,
    animationName: getComputedStyle(node, "::after").animationName,
    animationDuration: getComputedStyle(node, "::after").animationDuration,
  }));
  expect(visuals.glow).not.toBe("none");
  expect(visuals.rays).not.toBe("none");
  expect(visuals.animationName).toBe("celestial-rays-turn");
  expect(visuals.animationDuration).toBe("360s");

  const order = await page.locator(".site-actions").evaluate((actions) =>
    [...actions.children]
      .filter((node) => node.matches("button, a"))
      .map((node) => node.id || node.className),
  );
  expect(order).toEqual(["search-toggle", "theme-toggle", "language-switch"]);
});

test("theme switching immediately replaces sunlight with moonlight", async ({ page }) => {
  await page.goto("/");
  const ambientButton = page.locator("#sunlight-toggle");
  const themeButton = page.locator("#theme-toggle");

  const lightVisual = await page.locator("body").evaluate((node) => ({
    glow: getComputedStyle(node, "::before").backgroundImage,
    rays: getComputedStyle(node, "::after").backgroundImage,
  }));
  await themeButton.click();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(themeButton).toHaveAttribute("aria-pressed", "true");
  await expect(themeButton).toHaveAttribute("aria-label", "切换到明亮样式");
  await expect(page.locator("#theme-status")).toHaveText("已切换到夜晚样式");
  await expect(ambientButton).toHaveAttribute("aria-label", "关闭月光背景");
  await expect(page.locator(".theme-toggle__sun")).toBeVisible();
  await expect(page.locator(".theme-toggle__moon")).toBeHidden();
  expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe(
    "dark",
  );

  const darkVisual = await page.locator("body").evaluate((node) => ({
    glow: getComputedStyle(node, "::before").backgroundImage,
    rays: getComputedStyle(node, "::after").backgroundImage,
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
  }));
  expect(darkVisual.glow).not.toBe(lightVisual.glow);
  expect(darkVisual.rays).not.toBe(lightVisual.rays);
  expect(darkVisual.colorScheme).toBe("dark");
});

test("avatar toggles ambient light independently and both preferences persist", async ({
  page,
}) => {
  await page.goto("/");
  const ambientButton = page.locator("#sunlight-toggle");
  const themeButton = page.locator("#theme-toggle");

  await themeButton.click();
  await ambientButton.focus();
  await page.keyboard.press("Space");
  await expect(ambientButton).toBeFocused();
  await expect(ambientButton).toHaveAttribute("aria-pressed", "false");
  await expect(ambientButton).toHaveAttribute("aria-label", "开启月光背景");
  await expect(page.locator("#sunlight-status")).toHaveText("月光背景已关闭");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), AMBIENT_STORAGE_KEY),
  ).toBe("off");
  expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe(
    "dark",
  );
  const offVisuals = await page.locator("body").evaluate((node) => ({
    glow: getComputedStyle(node, "::before").content,
    rays: getComputedStyle(node, "::after").content,
    animationName: getComputedStyle(node, "::after").animationName,
  }));
  expect(offVisuals).toEqual({ glow: "none", rays: "none", animationName: "none" });

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-sunlight", "off");
  await expect(ambientButton).toHaveAttribute("aria-label", "开启月光背景");

  await themeButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute("data-sunlight", "off");
  await expect(ambientButton).toHaveAttribute("aria-label", "开启日光背景");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), AMBIENT_STORAGE_KEY),
  ).toBe("off");

  await ambientButton.click();
  await expect(page.locator("#sunlight-status")).toHaveText("日光背景已开启");
});

test("invalid stored values stay untouched and safely use both defaults", async ({ page }) => {
  await page.addInitScript(
    ([ambientKey, themeKey]) => {
      localStorage.setItem(ambientKey, "invalid-ambient");
      localStorage.setItem(themeKey, "invalid-theme");
    },
    [AMBIENT_STORAGE_KEY, THEME_STORAGE_KEY],
  );
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-sunlight", "on");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(
    await page.evaluate(
      ([ambientKey, themeKey]) => [
        localStorage.getItem(ambientKey),
        localStorage.getItem(themeKey),
      ],
      [AMBIENT_STORAGE_KEY, THEME_STORAGE_KEY],
    ),
  ).toEqual(["invalid-ambient", "invalid-theme"]);
});

test("without JavaScript the avatar remains a home link and controls remain hidden", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: process.env.SITE_URL || "http://localhost:62091",
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/");

  await expect(page.locator("#sunlight-fallback-link")).toBeVisible();
  await expect(page.locator("#sunlight-fallback-link")).toHaveAttribute("href", "/");
  await expect(page.locator("#sunlight-toggle")).toBeHidden();
  await expect(page.locator("#theme-toggle")).toBeHidden();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
  await expect(page.locator("html")).not.toHaveAttribute("data-sunlight", /.+/);
  const visuals = await page.locator("body").evaluate((node) => ({
    glow: getComputedStyle(node, "::before").content,
    rays: getComputedStyle(node, "::after").content,
  }));
  expect(visuals.glow).not.toBe("none");
  expect(visuals.rays).not.toBe("none");
  await context.close();
});

test("reduced motion keeps the glow but stops the ray rotation", async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: process.env.SITE_URL || "http://localhost:62091",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/");

  const visuals = await page.locator("body").evaluate((node) => ({
    glow: getComputedStyle(node, "::before").content,
    rays: getComputedStyle(node, "::after").content,
    animationName: getComputedStyle(node, "::after").animationName,
  }));
  expect(visuals.glow).not.toBe("none");
  expect(visuals.rays).not.toBe("none");
  expect(visuals.animationName).toBe("none");
  await context.close();
});

test("404 pages expose neither appearance controls nor celestial effects", async ({ page }) => {
  const response = await page.goto("/missing-sunlight-contract-page/");
  expect(response.status()).toBe(404);

  await expect(page.locator("#sunlight-toggle")).toHaveCount(0);
  await expect(page.locator("#theme-toggle")).toHaveCount(0);
  await expect(page.locator('script[src*="sunlight.js"]')).toHaveCount(0);
  await expect(page.locator('script[src*="theme.js"]')).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-sunlight", /.+/);
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
  const visuals = await page.locator("body").evaluate((node) => ({
    glow: getComputedStyle(node, "::before").content,
    rays: getComputedStyle(node, "::after").content,
  }));
  expect(visuals).toEqual({ glow: "none", rays: "none" });
});

test("appearance actions and statuses follow the page language in both themes", async ({
  page,
}) => {
  for (const [route, copy] of [
    [
      "/",
      {
        sunOff: "关闭日光背景",
        moonOff: "关闭月光背景",
        moonStatus: "月光背景已关闭",
        themeDark: "切换到夜晚样式",
      },
    ],
    [
      "/en/",
      {
        sunOff: "Turn off the sunlight background",
        moonOff: "Turn off the moonlight background",
        moonStatus: "Moonlight background is off",
        themeDark: "Switch to the night appearance",
      },
    ],
  ]) {
    await page.goto(route);
    await clearPreferences(page);
    await page.reload();
    const ambientButton = page.locator("#sunlight-toggle");
    const themeButton = page.locator("#theme-toggle");
    await expect(ambientButton).toHaveAttribute("aria-label", copy.sunOff);
    await expect(themeButton).toHaveAttribute("aria-label", copy.themeDark);
    await themeButton.click();
    await expect(ambientButton).toHaveAttribute("aria-label", copy.moonOff);
    await ambientButton.click();
    await expect(page.locator("#sunlight-status")).toHaveText(copy.moonStatus);
  }
});

for (const viewport of viewports) {
  test(`celestial source follows the avatar without overflow at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    if (viewport.width === 390) await page.locator("#theme-toggle").click();

    const geometry = await page.evaluate(() => {
      const avatar = document.querySelector("#sunlight-toggle .site-brand__avatar");
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
        rayWidth: Number.parseFloat(getComputedStyle(document.body, "::after").width),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
      probe.remove();
      return result;
    });

    expect(geometry.xDelta).toBeLessThanOrEqual(0.6);
    expect(geometry.yDelta).toBeLessThanOrEqual(0.6);
    expect(geometry.rayWidth).toBeLessThanOrEqual(viewport.width <= 390 ? 672.5 : 1472.5);
    expect(geometry.overflow).toBe(false);
  });
}

for (const route of ["/", articleRoute]) {
  test(`sunlight and moonlight remain behind readable content on ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(route);
    await page.locator("#theme-toggle").click();

    const reading = await page.locator("main").evaluate((main) => {
      const firstText = main.querySelector("h1, p");
      const style = getComputedStyle(firstText);
      return {
        visible: firstText.getBoundingClientRect().height > 0,
        color: style.color,
        glowPointerEvents: getComputedStyle(document.body, "::before").pointerEvents,
        raysPointerEvents: getComputedStyle(document.body, "::after").pointerEvents,
        glowZIndex: getComputedStyle(document.body, "::before").zIndex,
        raysZIndex: getComputedStyle(document.body, "::after").zIndex,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });

    expect(reading.visible).toBe(true);
    expect(reading.color).not.toBe("rgba(0, 0, 0, 0)");
    expect(reading.glowPointerEvents).toBe("none");
    expect(reading.raysPointerEvents).toBe("none");
    expect(reading.glowZIndex).toBe("-1");
    expect(reading.raysZIndex).toBe("-1");
    expect(reading.overflow).toBe(false);
  });
}

test("dark search keeps readable input and placeholder colors", async ({ page }) => {
  await page.goto("/");
  await page.locator("#theme-toggle").click();
  await page.getByRole("button", { name: "搜索" }).click();

  const colors = await page.locator("#site-search-input").evaluate((input) => ({
    color: getComputedStyle(input).color,
    background: getComputedStyle(input).backgroundColor,
    placeholder: getComputedStyle(input, "::placeholder").color,
  }));
  expect(colors.color).toBe("rgb(238, 242, 237)");
  expect(colors.background).toBe("rgb(21, 25, 23)");
  expect(colors.placeholder).not.toBe(colors.background);
});

test("an already rendered Mermaid diagram follows runtime theme changes", async ({ page }) => {
  await page.goto(mermaidArticleRoute);
  const diagram = page.locator(".mermaid svg").first();
  await expect(diagram).toBeVisible({ timeout: 20_000 });
  const lightFill = await diagram
    .locator(".node rect, .node polygon, .node circle")
    .first()
    .evaluate((node) => getComputedStyle(node).fill);
  await diagram.evaluate((svg) => {
    svg.dataset.beforeThemeChange = "true";
  });

  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.locator('.mermaid svg:not([data-before-theme-change="true"])').first(),
  ).toBeVisible({ timeout: 20_000 });
  const darkDiagram = page
    .locator('.mermaid svg:not([data-before-theme-change="true"])')
    .first();
  const darkFill = await darkDiagram
    .locator(".node rect, .node polygon, .node circle")
    .first()
    .evaluate((node) => getComputedStyle(node).fill);

  expect(darkFill).not.toBe(lightFill);
  expect(
    await page.evaluate(() => window.determineComputedTheme?.()),
  ).toBe("dark");
  await expect(page.locator("pre > code.language-mermaid").first()).toBeHidden();
});

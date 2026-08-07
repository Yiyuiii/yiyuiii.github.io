import { expect, test } from "@playwright/test";

const TEN_KEY = "yiyuiii.toy.ten-second.v1";
const REACTION_KEY = "yiyuiii.toy.reaction-time.v1";

const historyPayload = (samples, falseStarts = 0) => ({
  version: 1,
  samples,
  completedTotal: samples.length,
  falseStarts,
});

const preloadHistories = async (page, ten, reaction) => {
  await page.addInitScript(({ tenKey, reactionKey, tenValue, reactionValue }) => {
    localStorage.setItem(tenKey, JSON.stringify(tenValue));
    localStorage.setItem(reactionKey, JSON.stringify(reactionValue));
  }, {
    tenKey: TEN_KEY,
    reactionKey: REACTION_KEY,
    tenValue: ten,
    reactionValue: reaction,
  });
};

const openToy = async (page, id) => {
  const disclosure = page.locator(`#${id}`);
  await disclosure.locator(":scope > summary").click();
  await expect(disclosure).toHaveAttribute("open", "");
  return disclosure;
};

test("saved timing histories render accessible rolling-median SVGs and tables", async ({
  page,
}) => {
  await preloadHistories(
    page,
    historyPayload([9_700, 10_200, 9_900, 10_100, 10_050]),
    historyPayload([280, 260, 250, 240, 230], 2),
  );
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/toys/");

  const ten = await openToy(page, "ten-second");
  const tenHistory = ten.locator("[data-challenge-history]");
  await expect(ten.locator("[data-toy-ten-second] > .toy-challenge__note")).toContainText(
    "当前浏览器最多保存 100 次完成记录",
  );
  await expect(tenHistory.locator("[data-history-persistence]")).toBeHidden();
  await expect(tenHistory.locator("[data-history-stats]")).toBeVisible();
  await expect(tenHistory.locator('[data-history-value="retained"]')).toHaveText("5 / 5");
  const tenChart = tenHistory.locator("svg[role=img]");
  await expect(tenChart).toBeVisible();
  await expect(tenChart.locator("title")).toHaveText("盲估十秒误差趋势");
  await expect(tenChart.locator("desc")).toContainText("当前保留 5 次记录");
  await expect(tenChart.locator(".toy-history-chart__trend")).toHaveCount(1);
  await tenHistory.locator("[data-history-records] > summary").click();
  await expect(tenHistory.locator("[data-history-table-body] tr")).toHaveCount(5);

  const reaction = await openToy(page, "reaction-time");
  const reactionHistory = reaction.locator("[data-challenge-history]");
  await expect(reaction.locator("[data-toy-reaction-time] > .toy-challenge__note")).toContainText(
    "当前浏览器最多保存 100 次完成记录",
  );
  await expect(reactionHistory.locator("[data-history-persistence]")).toBeHidden();
  await expect(reactionHistory.locator('[data-history-value="falseStarts"]')).toContainText("2 次");
  await expect(reactionHistory.locator(".toy-history-chart__trend")).toHaveCount(1);

  const widths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);

  await page.goto("/en/toys/");
  const english = await openToy(page, "ten-second");
  await expect(english.locator("[data-toy-ten-second] > .toy-challenge__note")).toContainText(
    "stored only in this browser",
  );
  await expect(english.locator("[data-history-persistence]")).toBeHidden();
  await expect(english.locator("svg title")).toHaveText("Ten-second estimate error trend");
  await expect(english.locator('[data-history-value="retained"]')).toHaveText("5 / 5");
});

test("clearing one history preserves the other history and site preferences", async ({
  page,
}) => {
  await preloadHistories(
    page,
    historyPayload([9_900, 10_100]),
    historyPayload([250, 275], 1),
  );
  await page.goto("/toys/");
  await page.evaluate(() => {
    localStorage.setItem("yiyuiii.theme.v1", "dark");
    localStorage.setItem("yiyuiii.sunlight.v1", "off");
  });

  const ten = await openToy(page, "ten-second");
  await ten.locator("[data-history-clear]").click();
  await expect(ten.locator("[data-history-confirmation]")).toBeVisible();
  await ten.locator("[data-history-confirm-clear]").click();
  await expect(ten.locator("[data-history-empty]")).toBeVisible();
  await expect(ten.locator("[data-history-clear-status]")).toContainText("已清空");

  const stored = await page.evaluate(({ tenKey, reactionKey }) => ({
    reaction: JSON.parse(localStorage.getItem(reactionKey)),
    sunlight: localStorage.getItem("yiyuiii.sunlight.v1"),
    ten: localStorage.getItem(tenKey),
    theme: localStorage.getItem("yiyuiii.theme.v1"),
  }), { tenKey: TEN_KEY, reactionKey: REACTION_KEY });
  expect(stored.ten).toBeNull();
  expect(stored.reaction.samples).toEqual([250, 275]);
  expect(stored.theme).toBe("dark");
  expect(stored.sunlight).toBe("off");
});

test("blocked storage falls back to page-memory statistics without disabling timing", async ({
  page,
}) => {
  await page.addInitScript(({ keys }) => {
    const nativeGetItem = Storage.prototype.getItem;
    const nativeSetItem = Storage.prototype.setItem;
    Storage.prototype.getItem = function getItem(key) {
      if (keys.includes(String(key))) throw new DOMException("blocked", "SecurityError");
      return nativeGetItem.call(this, key);
    };
    Storage.prototype.setItem = function setItem(key, value) {
      if (keys.includes(String(key))) throw new DOMException("blocked", "SecurityError");
      return nativeSetItem.call(this, key, value);
    };
  }, { keys: [TEN_KEY, REACTION_KEY] });
  await page.goto("/toys/");

  const ten = await openToy(page, "ten-second");
  await expect(ten.locator("[data-history-persistence]")).toContainText("仅在本次打开页面期间有效");
  const primary = ten.locator("[data-ten-primary]");
  await primary.click();
  await page.waitForTimeout(25);
  await primary.click();
  await expect(ten.locator("[data-history-stats]")).toBeVisible();
  await expect(ten.locator("[data-history-table-body] tr")).toHaveCount(1);
  await expect(ten.locator("[data-toy-ten-second]")).toHaveAttribute("data-state", "finished");
});

test("malformed saved history is replaced by the next valid completion", async ({ page }) => {
  await page.goto("/toys/");
  await page.evaluate((key) => localStorage.setItem(key, "{broken"), TEN_KEY);
  await page.reload();
  const ten = await openToy(page, "ten-second");
  await expect(ten.locator("[data-history-empty]")).toBeVisible();
  const primary = ten.locator("[data-ten-primary]");
  await primary.click();
  await page.waitForTimeout(20);
  await primary.click();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), TEN_KEY);
  expect(saved.version).toBe(1);
  expect(saved.samples).toHaveLength(1);
});

test("browser color rendering preserves quantized typed endpoints", async ({ page }) => {
  await page.goto("/toys/");
  await openToy(page, "color-challenge");
  const endpoints = await page.evaluate(() => {
    const logic = globalThis.yiyuiiiToyColorChallengeLogic;
    const sample = (variation, level) => {
      const pair = logic.verifiedFallback(variation, level, 3, false);
      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.fillStyle = `rgb(${pair.normalRgb.join(" ")})`;
      context.fillRect(0, 0, 1, 1);
      context.fillStyle = `rgb(${pair.oddRgb.join(" ")})`;
      context.fillRect(1, 0, 1, 1);
      const pixels = [...context.getImageData(0, 0, 2, 1).data];
      return {
        expected: [pair.normalRgb, pair.oddRgb],
        matches: logic.pairMatchesLevel(
          variation,
          level,
          pair.normalRgb,
          pair.oddRgb,
          { hueSector: 3, neutral: false },
        ),
        pixels: [pixels.slice(0, 3), pixels.slice(4, 7)],
      };
    };
    return logic.VARIATIONS.flatMap((variation) => [
      sample(variation, logic.LEVEL_MIN),
      sample(variation, logic.LEVEL_MAX),
    ]);
  });
  for (const endpoint of endpoints) {
    expect(endpoint.matches).toBe(true);
    expect(endpoint.pixels).toEqual(endpoint.expected);
  }
});

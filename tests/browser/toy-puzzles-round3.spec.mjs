import { expect, test } from "@playwright/test";

const openToy = async (page, id) => {
  const disclosure = page.locator(`#${id}`);
  await disclosure.locator(":scope > summary").click();
  await expect(disclosure).toHaveAttribute("open", "");
  return disclosure;
};

const deterministicContext = async (browser) => {
  const context = await browser.newContext({
    baseURL: process.env.SITE_URL || "http://localhost:62091",
  });
  await context.addInitScript(() => {
    Object.defineProperty(Crypto.prototype, "getRandomValues", {
      configurable: true,
      value(array) {
        array.fill(0);
        return array;
      },
    });
  });
  return context;
};

const make24Operation = async (root, leftId, operator, rightId) => {
  await root.locator(`[data-make24-value="${leftId}"]`).click();
  await root.locator(`[data-make24-operator="${operator}"]`).click();
  await root.locator(`[data-make24-value="${rightId}"]`).click();
};

test("Make 24 supports an exact three-step solution, undo, reset, and pool drafts", async ({
  browser,
}) => {
  const context = await deterministicContext(browser);
  const page = await context.newPage();
  try {
    await page.goto("/toys/");
    const root = (await openToy(page, "make-24")).locator("[data-toy-make-24]");
    await expect(root).toHaveAttribute("data-state", "playing");
    await expect(root.locator("[data-make24-value]")).toHaveText(["1", "1", "1", "8"]);
    await expect(root.locator("[data-make24-settings-summary]")).toHaveText(
      "整数过程 · 556 组",
    );

    await root.locator('[data-make24-value="value-0"]').press("Enter");
    await root.locator('[data-make24-operator="+"]').press("Enter");
    await root.locator('[data-make24-value="value-1"]').press("Enter");
    await make24Operation(root, "value-4", "+", "value-2");
    await make24Operation(root, "value-5", "*", "value-3");
    await expect(root).toHaveAttribute("data-state", "won");
    await expect(root.locator("[data-make24-step-list] li")).toHaveText([
      "1 + 1 = 2",
      "2 + 1 = 3",
      "3 × 8 = 24",
    ]);
    await expect(root.locator("[data-make24-status]")).toHaveText("三步正好得到 24。");

    await root.locator("[data-make24-undo]").click();
    await expect(root).toHaveAttribute("data-state", "playing");
    await expect(root.locator("[data-make24-value]")).toHaveText(["8", "3"]);
    await expect(root.locator("[data-make24-status]")).toHaveText("已撤销一步；还剩 2 个数。");
    await root.locator("[data-make24-reset]").click();
    await expect(root.locator("[data-make24-value]")).toHaveText(["1", "1", "1", "8"]);
    await expect(root.locator("[data-make24-step-list] li")).toHaveCount(0);

    await expect(root.locator("[data-make24-answer]")).toBeHidden();
    await root.locator("[data-make24-reveal]").click();
    await expect(root).toHaveAttribute("data-state", "revealed");
    await expect(root.locator("[data-make24-answer-list] li")).toHaveText([
      "1 + 1 = 2",
      "1 + 2 = 3",
      "8 × 3 = 24",
    ]);
    await expect(root.locator("[data-make24-answer]")).toBeFocused();
    await expect(root.locator("[data-make24-value]").first()).toBeDisabled();
    await expect(root.locator("[data-make24-undo]")).toBeDisabled();
    await expect(root.locator("[data-make24-reveal]")).toBeDisabled();
    await expect(root.locator("[data-make24-reset]")).toBeEnabled();
    await expect(root.locator("[data-make24-status]")).toHaveText(
      "已显示一种解法，本次尝试结束。",
    );
    await root.locator("[data-make24-reset]").click();
    await expect(root).toHaveAttribute("data-state", "playing");
    await expect(root.locator("[data-make24-answer]")).toBeHidden();

    const settings = root.locator("[data-make24-settings]");
    await settings.locator(":scope > summary").click();
    await settings.locator("[data-make24-pool]").selectOption("fraction");
    await expect(settings.locator("[data-make24-pool-count]")).toHaveText("10 组不同数字");
    await settings.locator("[data-make24-settings-apply]").click();
    await expect(root.locator("[data-make24-settings-summary]")).toHaveText("需要分数 · 10 组");
    await expect(root.locator("[data-make24-value]")).toHaveText(["1", "3", "4", "6"]);
  } finally {
    await context.close();
  }
});

test("Lights Out supports roving focus, keyboard presses, exact completion, and won undo", async ({
  browser,
}) => {
  const context = await deterministicContext(browser);
  const page = await context.newPage();
  try {
    await page.goto("/toys/");
    const root = (await openToy(page, "lights-out")).locator("[data-toy-lights-out]");
    const cells = root.locator("[data-lights-cell]");
    await expect(cells).toHaveCount(16);
    await expect(root.locator('[data-lights-cell][tabindex="0"]')).toHaveCount(1);
    await expect(root.locator('[data-lights-cell="0"]')).toHaveAttribute("aria-rowindex", "1");
    await expect(root.locator('[data-lights-cell="0"]')).toHaveAttribute("aria-colindex", "1");

    await root.locator('[data-lights-cell="0"]').press("ArrowRight");
    await expect(root.locator('[data-lights-cell="1"]')).toBeFocused();
    await root.locator('[data-lights-cell="1"]').press("Enter");
    await expect(root.locator("[data-lights-moves]")).toHaveText("1");
    await root.locator('[data-lights-cell="1"]').press("Space");
    await expect(root.locator("[data-lights-moves]")).toHaveText("2");
    await root.locator("[data-lights-reset]").click();
    await expect(root.locator("[data-lights-moves]")).toHaveText("0");

    const solutionMask = await page.evaluate(() => (
      globalThis.yiyuiiiToyLightsOutLogic.getBoardPools(4).medium[0].solutionMask
    ));
    for (let index = 0; index < 16; index += 1) {
      if ((solutionMask & (1 << index)) !== 0) {
        await root.locator(`[data-lights-cell="${index}"]`).click();
      }
    }
    await expect(root).toHaveAttribute("data-state", "won");
    await expect(root.locator("[data-lights-lit]")).toHaveText("0");
    await expect(root.locator("[data-lights-status]")).toContainText("本题最少需要");
    await expect(root.locator("[data-lights-undo]")).toBeFocused();

    const wonMoves = Number(await root.locator("[data-lights-moves]").textContent());
    await root.locator("[data-lights-undo]").click();
    await expect(root).toHaveAttribute("data-state", "playing");
    await expect(root.locator("[data-lights-moves]")).toHaveText(String(wonMoves - 1));
    await expect(root.locator("[data-lights-lit]")).not.toHaveText("0");
  } finally {
    await context.close();
  }
});

test("Lights Out settings expose size-specific exact bands and replace the board only on apply", async ({
  page,
}) => {
  await page.goto("/toys/");
  const root = (await openToy(page, "lights-out")).locator("[data-toy-lights-out]");
  const settings = root.locator("[data-lights-settings]");
  await settings.locator(":scope > summary").click();
  await settings.locator("[data-lights-size]").selectOption("3");
  await settings.locator("[data-lights-band]").selectOption("long");
  await expect(settings.locator("[data-lights-long-option]")).toHaveText("6–9 步");
  await expect(settings.locator("[data-lights-pool-count]")).toHaveText("130 个不同局面");
  await expect(root.locator("[data-lights-cell]")).toHaveCount(16);

  await settings.locator("[data-lights-settings-apply]").click();
  await expect(root.locator("[data-lights-cell]")).toHaveCount(9);
  await expect(root.locator("[data-lights-settings-summary]")).toHaveText(
    "3 × 3 · 6–9 步 · 130 个局面",
  );
  await expect(root.locator("[data-lights-grid]")).toHaveAttribute(
    "aria-label",
    "3 × 3 翻灯棋盘",
  );
});

test("both new puzzles remain compact and touchable at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/toys/");
  for (const id of ["make-24", "lights-out"]) await openToy(page, id);
  await page.locator("[data-make24-settings] > summary").click();
  await page.locator("[data-lights-settings] > summary").click();

  const metrics = await page.evaluate(() => {
    const makeRoot = document.querySelector("[data-toy-make-24]");
    const lightsRoot = document.querySelector("[data-toy-lights-out]");
    const controls = [
      ...makeRoot.querySelectorAll("button, select"),
      ...lightsRoot.querySelectorAll("button, select"),
    ];
    return {
      lightsGrid: lightsRoot.querySelector("[data-lights-grid]").getBoundingClientRect().width,
      lightsRoot: lightsRoot.getBoundingClientRect().width,
      makeValues: makeRoot.querySelector("[data-make24-values]").getBoundingClientRect().width,
      makeRoot: makeRoot.getBoundingClientRect().width,
      minimumControlHeight: Math.min(...controls.map((node) => node.getBoundingClientRect().height)),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(metrics.lightsGrid).toBeLessThanOrEqual(metrics.lightsRoot);
  expect(metrics.makeValues).toBeLessThanOrEqual(metrics.makeRoot);
  expect(metrics.minimumControlHeight).toBeGreaterThanOrEqual(44);
  expect(metrics.overflow).toBeLessThanOrEqual(0);
});

test("new puzzle controls hide cleanly when secure randomness or JavaScript is unavailable", async ({
  browser,
}) => {
  const failedRandomContext = await browser.newContext({
    baseURL: process.env.SITE_URL || "http://localhost:62091",
  });
  await failedRandomContext.addInitScript(() => {
    Object.defineProperty(Crypto.prototype, "getRandomValues", {
      configurable: true,
      value() {
        throw new Error("stubbed random source failure");
      },
    });
  });
  const failedRandomPage = await failedRandomContext.newPage();
  try {
    await failedRandomPage.goto("/en/toys/");
    for (const [id, rootSelector, interactiveSelector] of [
      ["make-24", "[data-toy-make-24]", "[data-make24-interactive]"],
      ["lights-out", "[data-toy-lights-out]", "[data-lights-interactive]"],
    ]) {
      const root = (await openToy(failedRandomPage, id)).locator(rootSelector);
      await expect(root).toHaveAttribute("data-state", "unavailable");
      await expect(root.locator(interactiveSelector)).toBeHidden();
      await expect(root.locator("[data-challenge-unavailable]")).toBeVisible();
    }
  } finally {
    await failedRandomContext.close();
  }

  const noScriptContext = await browser.newContext({
    baseURL: process.env.SITE_URL || "http://localhost:62091",
    javaScriptEnabled: false,
  });
  const noScriptPage = await noScriptContext.newPage();
  try {
    await noScriptPage.goto("/toys/");
    for (const [id, interactiveSelector] of [
      ["make-24", "[data-make24-interactive]"],
      ["lights-out", "[data-lights-interactive]"],
    ]) {
      const disclosure = noScriptPage.locator(`#${id}`);
      await disclosure.locator(":scope > summary").click();
      await expect(disclosure.locator(interactiveSelector)).toBeHidden();
      await expect(disclosure.locator(".toy-challenge__noscript")).toBeVisible();
    }
  } finally {
    await noScriptContext.close();
  }
});

test("English puzzle copies are complete and do not fall back to Chinese", async ({ page }) => {
  await page.goto("/en/toys/");
  const makeRoot = (await openToy(page, "make-24")).locator("[data-toy-make-24]");
  const lightsRoot = (await openToy(page, "lights-out")).locator("[data-toy-lights-out]");
  await expect(makeRoot).toContainText("Use all four numbers exactly once");
  await expect(makeRoot.locator("[data-make24-reset]")).toHaveText("Reset puzzle");
  await expect(lightsRoot).toContainText("Turn every light off");
  await expect(lightsRoot.locator("[data-lights-grid]")).toHaveAttribute(
    "aria-label",
    "4 × 4 Lights Out board",
  );
  await expect(lightsRoot.locator('[data-lights-cell="0"]')).toHaveAttribute(
    "aria-label",
    /Row 1, column 1, (on|off)/,
  );
});

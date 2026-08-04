import { expect, test } from "@playwright/test";

const toyIds = [
  "color-challenge",
  "ten-second",
  "reaction-time",
  "random-password",
  "random-number",
];

const storageSnapshot = async () => {
  const databases = typeof indexedDB.databases === "function"
    ? (await indexedDB.databases())
      .map(({ name, version }) => `${name || ""}:${version || ""}`)
      .sort()
    : [];
  return {
    cookie: document.cookie,
    databases,
    local: Object.entries(localStorage).sort(([left], [right]) => left.localeCompare(right)),
    session: Object.entries(sessionStorage).sort(([left], [right]) => left.localeCompare(right)),
  };
};

const beginLocalOnlyAudit = async (page, allowedStorageKeys = []) => {
  await page.evaluate(() => {
    globalThis.__toyStorageMutations = [];
    const nativeSetItem = Storage.prototype.setItem;
    const nativeRemoveItem = Storage.prototype.removeItem;
    const nativeClear = Storage.prototype.clear;
    Storage.prototype.setItem = function setItem(key, value) {
      globalThis.__toyStorageMutations.push({ method: "set", key: String(key) });
      return nativeSetItem.call(this, key, value);
    };
    Storage.prototype.removeItem = function removeItem(key) {
      globalThis.__toyStorageMutations.push({ method: "remove", key: String(key) });
      return nativeRemoveItem.call(this, key);
    };
    Storage.prototype.clear = function clear() {
      globalThis.__toyStorageMutations.push({ method: "clear", key: null });
      return nativeClear.call(this);
    };
  });
  const before = await page.evaluate(storageSnapshot);
  const requests = [];
  const recordRequest = (request) => requests.push(request.url());
  page.on("request", recordRequest);

  return async () => {
    page.off("request", recordRequest);
    const after = await page.evaluate(storageSnapshot);
    const mutations = await page.evaluate(() => globalThis.__toyStorageMutations);
    const allowed = new Set(allowedStorageKeys);
    expect(requests).toEqual([]);
    expect(mutations.some(({ method }) => method === "clear")).toBe(false);
    expect(mutations.every(({ key }) => key !== null && allowed.has(key))).toBe(true);
    expect(after.cookie).toBe(before.cookie);
    expect(after.databases).toEqual(before.databases);
    expect(after.session).toEqual(before.session);
    expect(after.local.filter(([key]) => !allowed.has(key))).toEqual(
      before.local.filter(([key]) => !allowed.has(key)),
    );
  };
};

const openToy = async (page, id) => {
  const disclosure = page.locator(`#${id}`);
  await disclosure.locator(":scope > summary").click();
  await expect(disclosure).toHaveAttribute("open", "");
  return disclosure;
};

const clickDifferentColor = async (page) => {
  const cells = page.locator("[data-toy-color-challenge] [data-color-index]");
  await expect(cells).toHaveCount(16);
  const oddIndex = await cells.evaluateAll((buttons) => {
    const colors = buttons.map((button) => getComputedStyle(button).backgroundColor);
    const counts = new Map();
    for (const color of colors) counts.set(color, (counts.get(color) || 0) + 1);
    return colors.findIndex((color) => counts.get(color) === 1);
  });
  expect(oddIndex).toBeGreaterThanOrEqual(0);
  await cells.nth(oddIndex).click();
  await expect(cells.nth(oddIndex)).toHaveAttribute("data-result", "correct");
};

const clickMatchingColor = async (page) => {
  const cells = page.locator("[data-toy-color-challenge] [data-color-index]");
  const normalIndex = await cells.evaluateAll((buttons) => {
    const colors = buttons.map((button) => getComputedStyle(button).backgroundColor);
    const counts = new Map();
    for (const color of colors) counts.set(color, (counts.get(color) || 0) + 1);
    return colors.findIndex((color) => counts.get(color) > 1);
  });
  expect(normalIndex).toBeGreaterThanOrEqual(0);
  await cells.nth(normalIndex).click();
  await expect(cells.nth(normalIndex)).toHaveAttribute("data-result", "incorrect");
};

for (const route of ["/toys/", "/en/toys/"]) {
  test(`${route} renders all five local interactions`, async ({ page }) => {
    await page.goto(route);
    const finishAudit = await beginLocalOnlyAudit(page);
    for (const id of toyIds) {
      const disclosure = await openToy(page, id);
      await expect(disclosure.locator("[data-challenge-interactive], .toy-tool")).toBeVisible();
      await disclosure.locator(":scope > summary").click();
    }
    await finishAudit();
  });
}

test("color challenge scores negative answers and advances by a three-question majority", async ({
  page,
}) => {
  await page.goto("/toys/");
  await openToy(page, "color-challenge");
  const finishAudit = await beginLocalOnlyAudit(page);
  const root = page.locator("[data-toy-color-challenge]");
  const next = root.locator("[data-color-next]");

  await expect(root).toHaveAttribute("data-state", "ready");
  await expect(root).toHaveAttribute("data-difficulty", "8");
  await clickMatchingColor(page);
  await expect(root.locator("[data-color-score]")).toHaveText("-1");
  const scoreAfterWrong = await root.locator("[data-color-score]").textContent();
  await root.locator('[data-color-index][data-result="incorrect"]').dispatchEvent("click");
  await expect(root.locator("[data-color-score]")).toHaveText(scoreAfterWrong);
  await next.click();
  await clickDifferentColor(page);
  await expect(next).toBeEnabled();
  await next.click();
  await clickDifferentColor(page);
  await next.click();
  await expect(root).toHaveAttribute("data-difficulty", "9");
  await expect(root.locator("[data-color-score]")).toHaveText("1");
  await expect(root.locator("[data-challenge-status]")).toBeEmpty();

  await finishAudit();
});

test("color challenge applies typed hue and fixed-level settings as a new local game", async ({
  page,
}) => {
  await page.goto("/toys/");
  await openToy(page, "color-challenge");
  const finishAudit = await beginLocalOnlyAudit(page);
  const root = page.locator("[data-toy-color-challenge]");
  const settings = root.locator("[data-color-settings]");

  await clickMatchingColor(page);
  await expect(root.locator("[data-color-score]")).toHaveText("-1");
  await settings.locator(":scope > summary").click();
  await settings.locator('[data-color-preset="hue"]').click();
  await settings.locator('[data-color-hue-scope][value="custom"]').check();
  for (const sector of await settings.locator("[data-color-hue-sector]").all()) {
    await sector.uncheck();
  }
  await settings.locator('[data-color-hue-sector][value="4"]').check();
  await settings.locator('[data-color-progression][value="fixed"]').check();
  await settings.locator("[data-color-fixed-level]").fill("12");
  await settings.locator("[data-color-apply]").click();

  await expect(settings).not.toHaveAttribute("open", "");
  await expect(settings.locator("[data-color-settings-summary]")).toHaveText(
    "色相 · 1 段色相 · 固定 12/25",
  );
  await expect(root).toHaveAttribute("data-mode", "fixed");
  await expect(root).toHaveAttribute("data-variation", "hue");
  await expect(root).toHaveAttribute("data-difficulty", "11");
  await expect(root.locator("[data-color-score]")).toHaveText("0");

  await finishAudit();
});

test("color challenge settings remain touchable without horizontal overflow at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/toys/");
  await openToy(page, "color-challenge");
  const root = page.locator("[data-toy-color-challenge]");
  const settings = root.locator("[data-color-settings]");
  await settings.locator(":scope > summary").click();
  await settings.locator('[data-color-hue-scope][value="custom"]').check();

  const metrics = await page.evaluate(() => {
    const labels = [...document.querySelectorAll("[data-color-custom-hues] label")];
    const hueGrid = document.querySelector("[data-color-custom-hues]");
    return {
      columns: getComputedStyle(hueGrid).gridTemplateColumns.split(" ").length,
      minimumHueHeight: Math.min(...labels.map((label) => label.getBoundingClientRect().height)),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(metrics.columns).toBe(2);
  expect(metrics.minimumHueHeight).toBeGreaterThanOrEqual(44);
  expect(metrics.overflow).toBeLessThanOrEqual(0);
});

test("ten-second estimate supports start, stop, restart, and fold cancellation", async ({
  page,
}) => {
  await page.goto("/toys/");
  const disclosure = await openToy(page, "ten-second");
  const finishAudit = await beginLocalOnlyAudit(page, ["yiyuiii.toy.ten-second.v1"]);
  const root = disclosure.locator("[data-toy-ten-second]");
  const primary = root.locator("[data-ten-primary]");
  const restart = root.locator("[data-ten-restart]");

  await primary.click();
  await expect(root).toHaveAttribute("data-state", "running");
  await expect(restart).toBeVisible();
  await restart.click();
  await expect(root).toHaveAttribute("data-state", "running");
  await page.waitForTimeout(40);
  await primary.click();
  await expect(root).toHaveAttribute("data-state", "finished");
  await expect(root.locator("[data-challenge-status]")).not.toBeEmpty();

  await primary.click();
  await expect(root).toHaveAttribute("data-state", "running");
  await disclosure.locator(":scope > summary").click();
  await expect(disclosure).not.toHaveAttribute("open", "");
  await expect(root).toHaveAttribute("data-state", "cancelled");

  await finishAudit();
});

test("reaction challenge handles early presses, a valid signal, and fold cancellation", async ({
  page,
}) => {
  test.slow();
  await page.goto("/toys/");
  const disclosure = await openToy(page, "reaction-time");
  const finishAudit = await beginLocalOnlyAudit(page, ["yiyuiii.toy.reaction-time.v1"]);
  const root = disclosure.locator("[data-toy-reaction-time]");
  const primary = root.locator("[data-reaction-primary]");

  await primary.click();
  await expect(root).toHaveAttribute("data-state", "waiting");
  await primary.click();
  await expect(root).toHaveAttribute("data-state", "tooSoon");

  await primary.click();
  await expect(root).toHaveAttribute("data-state", "waiting");
  await expect(root).toHaveAttribute("data-state", "ready", { timeout: 5000 });
  await primary.click();
  await expect(root).toHaveAttribute("data-state", "finished");
  await expect(root.locator("[data-challenge-status]")).not.toBeEmpty();

  await primary.click();
  await expect(root).toHaveAttribute("data-state", "waiting");
  await disclosure.locator(":scope > summary").click();
  await expect(root).toHaveAttribute("data-state", "cancelled");
  await page.waitForTimeout(4100);
  await expect(root).toHaveAttribute("data-state", "cancelled");

  await finishAudit();
});

test("random password generation enforces selected groups and stays local", async ({
  page,
}) => {
  await page.goto("/toys/");
  const disclosure = await openToy(page, "random-password");
  const finishAudit = await beginLocalOnlyAudit(page);
  const root = disclosure.locator("[data-toy-random-password]");
  const output = root.locator("[data-password-output]");

  await root.locator("[data-password-length]").focus();
  await page.keyboard.press("Enter");
  await expect(root.locator("[data-password-output-wrap]")).toBeVisible();
  const password = await output.inputValue();
  expect(password).toHaveLength(20);
  expect(password).toMatch(/[a-z]/);
  expect(password).toMatch(/[A-Z]/);
  expect(password).toMatch(/[0-9]/);
  expect(password).toMatch(/[!@#$%^&*()\-_=+\[\]{};:,.?]/);
  expect(password).not.toMatch(/[lIoO01]/);

  const passwordCopy = await root.locator("[data-password-copy-data]").evaluate(
    (node) => JSON.parse(node.textContent || "null"),
  );
  await expect(output).toHaveAttribute("type", "password");
  await root.locator("[data-password-visibility]").click();
  await expect(output).toHaveAttribute("type", "text");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
  });
  await root.locator("[data-password-copy]").click();
  await expect(output).toBeFocused();
  expect(await output.evaluate((field) => (
    field.selectionStart === 0 && field.selectionEnd === field.value.length
  ))).toBe(true);
  await expect(root.locator("[data-password-status]")).toHaveText(
    passwordCopy.copy_failed,
  );

  for (const group of await root.locator("[data-password-group]").all()) {
    await group.uncheck();
  }
  await root.locator("[data-password-generate]").click();
  await expect(root.locator("[data-password-status]")).toHaveText(
    passwordCopy.group_error,
  );
  expect(await output.inputValue()).toBe(password);

  await finishAudit();
});

test("random numbers honor range, uniqueness, sorting, presets, and validation", async ({
  page,
}) => {
  await page.goto("/toys/");
  const disclosure = await openToy(page, "random-number");
  const finishAudit = await beginLocalOnlyAudit(page);
  const root = disclosure.locator("[data-toy-random-number]");
  const minimum = root.locator("[data-number-minimum]");
  const maximum = root.locator("[data-number-maximum]");
  const count = root.locator("[data-number-count]");
  const output = root.locator("[data-number-output]");

  await minimum.fill("10");
  await maximum.fill("15");
  await count.fill("3");
  await root.locator("[data-number-unique]").check();
  await root.locator("[data-number-sort]").check();
  await count.focus();
  await page.keyboard.press("Enter");
  const values = (await output.inputValue()).split(", ").map(Number);
  expect(values).toHaveLength(3);
  expect(new Set(values).size).toBe(3);
  expect(values.every((value) => value >= 10 && value <= 15)).toBe(true);
  expect(values).toEqual([...values].sort((left, right) => left - right));

  const numberCopy = await root.locator("[data-number-copy-data]").evaluate(
    (node) => JSON.parse(node.textContent || "null"),
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
  });
  await root.locator("[data-number-copy]").click();
  await expect(output).toBeFocused();
  expect(await output.evaluate((field) => (
    field.selectionStart === 0 && field.selectionEnd === field.value.length
  ))).toBe(true);
  await expect(root.locator("[data-number-status]")).toHaveText(
    numberCopy.copy_failed,
  );

  await root.locator('[data-number-preset][data-maximum="6"]').click();
  await expect(minimum).toHaveValue("1");
  await expect(maximum).toHaveValue("6");
  await expect(count).toHaveValue("1");
  await root.locator("[data-number-generate]").click();
  expect(Number(await output.inputValue())).toBeGreaterThanOrEqual(1);
  expect(Number(await output.inputValue())).toBeLessThanOrEqual(6);

  await count.fill("7");
  await root.locator("[data-number-unique]").check();
  await root.locator("[data-number-generate]").click();
  await expect(root.locator("[data-number-status]")).toHaveText(
    numberCopy.unique_error,
  );

  await finishAudit();
});

test("unique unsorted numbers receive an unbiased final shuffle", async ({
  browser,
}) => {
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
  const page = await context.newPage();
  try {
    await page.goto("/toys/");
    const root = (await openToy(page, "random-number")).locator(
      "[data-toy-random-number]",
    );
    await root.locator("[data-number-minimum]").fill("0");
    await root.locator("[data-number-maximum]").fill("1");
    await root.locator("[data-number-count]").fill("2");
    await root.locator("[data-number-unique]").check();
    await root.locator("[data-number-generate]").click();
    await expect(root.locator("[data-number-output]")).toHaveValue("1, 0");

    await root.locator("[data-number-sort]").check();
    await root.locator("[data-number-generate]").click();
    await expect(root.locator("[data-number-output]")).toHaveValue("0, 1");
  } finally {
    await context.close();
  }
});

test("generator controls stay hidden when JavaScript is disabled", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: process.env.SITE_URL || "http://localhost:62091",
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  try {
    await page.goto("/toys/");
    for (const id of ["random-password", "random-number"]) {
      const disclosure = page.locator(`#${id}`);
      await disclosure.locator(":scope > summary").click();
      await expect(disclosure.locator("[data-generator-interactive]")).toBeHidden();
      await expect(disclosure.locator(".toy-noscript")).toBeVisible();
    }
  } finally {
    await context.close();
  }
});

test("same-page search closes the dialog and reopens a collapsed toy", async ({
  page,
}) => {
  await page.goto("/toys/");
  const search = page.locator("#site-search");
  const disclosure = page.locator("#random-password");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.locator("#search-toggle").click();
    await page.locator("#site-search-input").fill("随机密码");
    await page.locator('#search-results a[href="/toys/#random-password"]').click();
    await expect(search).toBeHidden();
    await expect(disclosure).toHaveAttribute("open", "");
    await expect(page).toHaveURL(/\/toys\/#random-password$/);
    await disclosure.locator(":scope > summary").click();
    await expect(disclosure).not.toHaveAttribute("open", "");
  }
});

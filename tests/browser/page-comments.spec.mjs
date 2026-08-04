import { expect, test } from "@playwright/test";

const commentHosts = new Set(["github.com", "giscus.app"]);
const autoLoadKey = "yiyuiii.comments.v1";

for (const [route, heading, loadLabel, autoLoadLabel, disclosure, directLabel, giscusLanguage] of [
  ["/", "评论", "显示评论（首次约 0.13 MB）", "在本站自动加载评论", "首次加载约 0.13 MB", "GitHub Discussions", "zh-CN"],
  ["/en/", "Comments", "Show comments (~0.13 MB first load)", "Auto-load comments on this site", "The first load is about 0.13 MB", "GitHub Discussions", "en"],
  ["/posts/装机记录/", "评论", "显示评论（首次约 0.13 MB）", "在本站自动加载评论", "首次加载约 0.13 MB", "GitHub Discussions", "zh-CN"],
  ["/en/posts/pc-build-log/", "Comments", "Show comments (~0.13 MB first load)", "Auto-load comments on this site", "The first load is about 0.13 MB", "GitHub Discussions", "en"],
]) {
  test(`${route} keeps localized comments private until an explicit click`, async ({ page }) => {
    const externalRequests = [];
    page.on("request", (request) => {
      if (commentHosts.has(new URL(request.url()).hostname)) externalRequests.push(request.url());
    });

    await page.goto(route, { waitUntil: "domcontentloaded" });
    const comments = page.locator("[data-page-comments]");
    await expect(comments).toHaveCount(1);
    await expect(comments.getByRole("heading", { name: heading })).toBeVisible();
    await expect(comments.getByText(disclosure, { exact: false })).toBeVisible();
    await expect(comments.getByRole("button", { name: loadLabel })).toBeVisible();
    const autoLoad = comments.getByRole("checkbox", { name: autoLoadLabel });
    await expect(autoLoad).toBeVisible();
    await expect(autoLoad).not.toBeChecked();
    await expect(comments.locator(".page-comments__auto-load-description")).toHaveCount(0);
    expect(await page.evaluate((key) => localStorage.getItem(key), autoLoadKey)).toBeNull();
    const discussions = comments.getByRole("link", { name: directLabel });
    await expect(discussions).toBeVisible();
    await expect(discussions).toHaveAttribute("href", "https://github.com/Yiyuiii/yiyuiii.github.io/discussions/categories/announcements");
    await expect(page.locator("[data-page-feedback]")).toHaveCount(0);
    await expect(comments.locator('script[src="https://giscus.app/client.js"]')).toHaveCount(0);
    await expect(comments.locator("iframe.giscus-frame")).toHaveCount(0);
    expect(externalRequests).toEqual([]);

    await page.route("https://giscus.app/client.js", async (route) => {
      await route.fulfill({
        contentType: "application/javascript",
        body: `
          const frame = document.createElement("iframe");
          frame.className = "giscus-frame";
          frame.title = "Mock comments";
          document.currentScript.insertAdjacentElement("afterend", frame);
        `,
      });
    });
    await comments.getByRole("button", { name: loadLabel }).click();

    const client = comments.locator('script[src="https://giscus.app/client.js"]');
    await expect(client).toHaveCount(1);
    await expect(comments.locator("iframe.giscus-frame")).toHaveCount(1);
    await expect(client).toHaveAttribute("data-repo", "Yiyuiii/yiyuiii.github.io");
    await expect(client).toHaveAttribute("data-repo-id", "MDEwOlJlcG9zaXRvcnk0MDY0MTE1MTM=");
    await expect(client).toHaveAttribute("data-category", "Announcements");
    await expect(client).toHaveAttribute("data-category-id", "DIC_kwDOGDlY-c4DCk8v");
    await expect(client).toHaveAttribute("data-mapping", "pathname");
    await expect(client).toHaveAttribute("data-strict", "1");
    await expect(client).toHaveAttribute("data-lang", giscusLanguage);
    await expect(client).toHaveAttribute("data-theme", "light");
    await expect(comments.getByRole("button", { name: loadLabel })).toBeHidden();
    await expect(autoLoad).not.toBeChecked();
    expect(await page.evaluate((key) => localStorage.getItem(key), autoLoadKey)).toBeNull();
  });
}

test("automatic loading requires explicit persistent consent and can be turned off", async ({ page }) => {
  await page.route("https://giscus.app/client.js", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `
        const frame = document.createElement("iframe");
        frame.className = "giscus-frame";
        frame.title = "Mock comments";
        document.currentScript.insertAdjacentElement("afterend", frame);
      `,
    });
  });

  await page.goto("/en/");
  let comments = page.locator("[data-page-comments]");
  let autoLoad = comments.getByRole("checkbox", { name: "Auto-load comments on this site" });
  await autoLoad.check();
  await expect(autoLoad).toBeChecked();
  await expect(comments.locator("iframe.giscus-frame")).toHaveCount(1);
  expect(await page.evaluate((key) => localStorage.getItem(key), autoLoadKey)).toBe("auto");

  await page.goto("/en/about/");
  comments = page.locator("[data-page-comments]");
  autoLoad = comments.getByRole("checkbox", { name: "Auto-load comments on this site" });
  await expect(autoLoad).toBeChecked();
  await expect(comments.locator("iframe.giscus-frame")).toHaveCount(1);

  await autoLoad.uncheck();
  await expect(autoLoad).not.toBeChecked();
  await expect(comments.getByText("Automatic comment loading is off.")).toBeVisible();
  await expect(comments.locator("iframe.giscus-frame")).toHaveCount(1);
  expect(await page.evaluate((key) => localStorage.getItem(key), autoLoadKey)).toBeNull();

  await page.goto("/en/projects/");
  comments = page.locator("[data-page-comments]");
  await expect(comments.getByRole("checkbox", { name: "Auto-load comments on this site" })).not.toBeChecked();
  await expect(comments.locator('script[src="https://giscus.app/client.js"]')).toHaveCount(0);
  await expect(comments.getByRole("button", { name: "Show comments (~0.13 MB first load)" })).toBeVisible();
});

test("automatic-loading changes stay synchronized across tabs", async ({ context }) => {
  await context.route("https://giscus.app/client.js", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `
        const frame = document.createElement("iframe");
        frame.className = "giscus-frame";
        frame.title = "Mock comments";
        document.currentScript.insertAdjacentElement("afterend", frame);
      `,
    });
  });
  const first = await context.newPage();
  const second = await context.newPage();
  await Promise.all([first.goto("/en/"), second.goto("/en/about/")]);

  const firstAutoLoad = first.getByRole("checkbox", { name: "Auto-load comments on this site" });
  const secondComments = second.locator("[data-page-comments]");
  const secondAutoLoad = secondComments.getByRole("checkbox", { name: "Auto-load comments on this site" });

  await firstAutoLoad.check();
  await expect(secondAutoLoad).toBeChecked();
  await expect(secondComments.locator("iframe.giscus-frame")).toHaveCount(1);

  await firstAutoLoad.uncheck();
  await expect(secondAutoLoad).not.toBeChecked();
  await expect(secondComments.locator("iframe.giscus-frame")).toHaveCount(1);

  await firstAutoLoad.check();
  await expect(secondAutoLoad).toBeChecked();
  await first.evaluate(() => localStorage.clear());
  await expect(secondAutoLoad).not.toBeChecked();
});

test("an invalid automatic-loading value stays inert and untouched", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "invalid"), autoLoadKey);
  await page.goto("/en/");

  const comments = page.locator("[data-page-comments]");
  await expect(comments.getByRole("checkbox", { name: "Auto-load comments on this site" })).not.toBeChecked();
  await expect(comments.locator('script[src="https://giscus.app/client.js"]')).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), autoLoadKey)).toBe("invalid");
});

test("a storage failure keeps automatic loading off and manual loading available", async ({ page }) => {
  await page.addInitScript((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (candidate, value) {
      if (candidate === key) throw new DOMException("Blocked", "SecurityError");
      return original.call(this, candidate, value);
    };
  }, autoLoadKey);
  await page.route("https://giscus.app/client.js", async (route) => {
    await route.fulfill({ contentType: "application/javascript", body: "" });
  });
  await page.goto("/en/");

  const comments = page.locator("[data-page-comments]");
  const autoLoad = comments.getByRole("checkbox", { name: "Auto-load comments on this site" });
  await autoLoad.click();
  await expect(autoLoad).not.toBeChecked();
  await expect(comments.getByText("Your browser could not save this setting.", { exact: false })).toBeVisible();
  await expect(comments.locator('script[src="https://giscus.app/client.js"]')).toHaveCount(0);

  await comments.getByRole("button", { name: "Show comments (~0.13 MB first load)" }).click();
  await expect(comments.locator('script[src="https://giscus.app/client.js"]')).toHaveCount(1);
});

test("comment loading failure stays local and can be retried", async ({ page }) => {
  let attempts = 0;
  await page.route("https://giscus.app/client.js", async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.abort();
      return;
    }
    await route.fulfill({
      contentType: "application/javascript",
      body: `
        const frame = document.createElement("iframe");
        frame.className = "giscus-frame";
        frame.title = "Mock comments";
        document.currentScript.insertAdjacentElement("afterend", frame);
      `,
    });
  });

  await page.goto("/en/");
  const comments = page.locator("[data-page-comments]");
  await comments.getByRole("button", { name: "Show comments (~0.13 MB first load)" }).click();
  await expect(comments.getByText("Comments could not be loaded.", { exact: false })).toBeVisible();
  await expect(comments.getByRole("button", { name: "Try again" })).toBeEnabled();

  await comments.getByRole("button", { name: "Try again" }).click();
  await expect(comments.locator("iframe.giscus-frame")).toHaveCount(1);
  expect(attempts).toBe(2);
});

test("comments start with the saved theme and receive later theme changes", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("yiyuiii.theme.v1", "dark"));
  await page.route("https://giscus.app/client.js", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `
        const frame = document.createElement("iframe");
        frame.className = "giscus-frame";
        frame.title = "Mock comments";
        document.currentScript.insertAdjacentElement("afterend", frame);
      `,
    });
  });

  await page.goto("/en/");
  const comments = page.locator("[data-page-comments]");
  await comments.getByRole("button", { name: "Show comments (~0.13 MB first load)" }).click();
  const client = comments.locator('script[src="https://giscus.app/client.js"]');
  await expect(client).toHaveAttribute("data-theme", "dark");
  await expect(comments.locator("iframe.giscus-frame")).toHaveCount(1);

  await page.evaluate(() => {
    window.__giscusMessages = [];
    const frame = document.querySelector("iframe.giscus-frame");
    frame.contentWindow.postMessage = (message, origin) => {
      window.__giscusMessages.push({ message, origin });
    };
  });
  await page.getByRole("button", { name: "Switch to the light appearance" }).click();
  await expect.poll(() => page.evaluate(() => window.__giscusMessages)).toContainEqual({
    message: { giscus: { setConfig: { theme: "light" } } },
    origin: "https://giscus.app",
  });
});

test("redirect and 404 outputs do not render comments", async ({ request }) => {
  const redirect = await request.get("/page2/");
  expect(redirect.ok()).toBeTruthy();
  const redirectBody = await redirect.text();
  expect(redirectBody).not.toContain("data-page-comments");
  expect(redirectBody).not.toContain("data-page-feedback");

  const missing = await request.get("/definitely-missing-comments");
  expect(missing.status()).toBe(404);
  const missingBody = await missing.text();
  expect(missingBody).not.toContain("data-page-comments");
  expect(missingBody).not.toContain("data-page-feedback");
});

test("the no-JavaScript fallback remains useful at 320 px", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/en/");

  const comments = page.locator("[data-page-comments]");
  await expect(comments.getByRole("button", { name: "Show comments (~0.13 MB first load)" })).toBeHidden();
  await expect(comments.getByRole("checkbox", { name: "Auto-load comments on this site" })).toBeHidden();
  await expect(comments.getByRole("link", { name: "GitHub Discussions" })).toBeVisible();
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  await context.close();
});

test("the automatic-loading option stays usable at 320 px without connecting", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 800 } });
  const page = await context.newPage();
  await page.goto("/en/");

  const comments = page.locator("[data-page-comments]");
  const autoLoad = comments.getByRole("checkbox", { name: "Auto-load comments on this site" });
  await expect(autoLoad).toBeVisible();
  await expect(comments.locator(".page-comments__auto-load-label")).toHaveText("Auto-load comments on this site");
  await expect(comments.locator(".page-comments__auto-load-label")).toHaveCSS("font-weight", "400");
  await expect(comments.locator('script[src="https://giscus.app/client.js"]')).toHaveCount(0);
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  await context.close();
});

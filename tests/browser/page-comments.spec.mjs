import { expect, test } from "@playwright/test";

const commentHosts = new Set(["github.com", "giscus.app"]);

for (const [route, heading, loadLabel, directLabel, giscusLanguage] of [
  ["/", "评论", "加载评论", "直接前往 GitHub Discussions", "zh-CN"],
  ["/en/", "Comments", "Load comments", "Open GitHub Discussions", "en"],
  ["/posts/装机记录/", "评论", "加载评论", "直接前往 GitHub Discussions", "zh-CN"],
  ["/en/posts/pc-build-log/", "Comments", "Load comments", "Open GitHub Discussions", "en"],
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
    await expect(comments.getByRole("button", { name: loadLabel })).toBeVisible();
    await expect(comments.getByRole("link", { name: directLabel })).toBeVisible();
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
  });
}

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
  await comments.getByRole("button", { name: "Load comments" }).click();
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
  await comments.getByRole("button", { name: "Load comments" }).click();
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
  expect(await redirect.text()).not.toContain("data-page-comments");

  const missing = await request.get("/definitely-missing-comments");
  expect(missing.status()).toBe(404);
  expect(await missing.text()).not.toContain("data-page-comments");
});

test("the no-JavaScript fallback remains useful at 320 px", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/en/");

  const comments = page.locator("[data-page-comments]");
  await expect(comments.getByRole("button", { name: "Load comments" })).toBeHidden();
  await expect(comments.getByRole("link", { name: "Open GitHub Discussions" })).toBeVisible();
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  await context.close();
});

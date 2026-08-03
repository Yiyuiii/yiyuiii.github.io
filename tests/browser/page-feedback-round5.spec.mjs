import { expect, test } from "@playwright/test";

const publicHosts = new Set(["github.com", "giscus.app"]);

for (const [route, publicLabel, privateLabel, expectedTitle] of [
  ["/", "提交公开反馈", "发送私人邮件", "yiyuiii"],
  ["/en/", "Submit public feedback", "Send a private email", "yiyuiii"],
  ["/posts/了解游泳/", "提交公开反馈", "发送私人邮件", "了解游泳"],
  ["/en/posts/understanding-swimming/", "Submit public feedback", "Send a private email", "Understanding Swimming"],
]) {
  test(`${route} provides one localized, request-free feedback module`, async ({ page }) => {
    const feedbackRequests = [];
    page.on("request", (request) => {
      if (publicHosts.has(new URL(request.url()).hostname)) feedbackRequests.push(request.url());
    });

    await page.goto(route);
    const feedback = page.locator("[data-page-feedback]");
    await expect(feedback).toHaveCount(1);
    await expect(feedback).toBeVisible();
    await expect(feedback.getByRole("link", { name: publicLabel })).toBeVisible();
    await expect(feedback.getByRole("link", { name: privateLabel })).toBeVisible();

    const issueHref = await feedback.locator("[data-feedback-public]").getAttribute("href");
    const issueUrl = new URL(issueHref);
    expect(issueUrl.origin).toBe("https://github.com");
    expect(issueUrl.pathname).toBe("/Yiyuiii/yiyuiii.github.io/issues/new");
    expect(issueUrl.searchParams.get("template")).toBe("page-feedback.yml");
    expect(issueUrl.searchParams.get("title")).toContain(expectedTitle);
    const expectedPageUrl = new URL(route, "https://yiyuiii.github.io").href;
    expect(new URL(issueUrl.searchParams.get("page_url")).href).toBe(expectedPageUrl);

    const mailHref = await feedback.locator("[data-feedback-private]").getAttribute("href");
    const mailUrl = new URL(mailHref);
    expect(mailUrl.protocol).toBe("mailto:");
    expect(mailUrl.pathname).toBe("yiyuiii@foxmail.com");
    expect(mailUrl.searchParams.get("subject")).toContain(expectedTitle);
    const bodyPageUrl = mailUrl.searchParams.get("body").match(/https:\/\/\S+/)?.[0];
    expect(new URL(bodyPageUrl).href).toBe(expectedPageUrl);
    expect(feedbackRequests).toEqual([]);
  });
}

test("redirect outputs do not render feedback", async ({ request }) => {
  const response = await request.get("/page2/");
  expect(response.ok()).toBeTruthy();
  const body = await response.text();
  expect(body).toContain('http-equiv="refresh"');
  expect(body).not.toContain("data-page-feedback");
});

for (const [route, language, publicLabel, privateLabel] of [
  ["/definitely-missing-feedback-zh", "zh", "提交公开反馈", "发送私人邮件"],
  ["/en/definitely-missing-feedback-en", "en", "Submit public feedback", "Send a private email"],
]) {
  test(`404 feedback follows the ${language} route language`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    const visible = page.locator("[data-page-feedback]:visible");
    await expect(visible).toHaveCount(1);
    await expect(visible.getByRole("link", { name: publicLabel })).toBeVisible();
    await expect(visible.getByRole("link", { name: privateLabel })).toBeVisible();
  });
}

test("feedback remains usable without JavaScript and stays inside a narrow viewport", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/en/");

  const feedback = page.locator("[data-page-feedback]");
  await expect(feedback).toBeVisible();
  await expect(feedback.getByRole("link", { name: "Submit public feedback" })).toBeVisible();
  await expect(feedback.getByRole("link", { name: "Send a private email" })).toBeVisible();
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  await context.close();
});

import { expect, test } from "@playwright/test";

const longArticle =
  "/posts/%E5%9B%9B%E5%AD%A3%E7%89%A9%E8%AF%AD%E9%87%8F%E5%8C%96%E5%88%86%E6%9E%90%E6%94%BB%E7%95%A5/";

test("hidden-title indexes retain one semantic page heading", async ({ page }) => {
  for (const [route, heading] of [
    ["/writing/", "随笔"],
    ["/en/writing/", "Writing"],
    ["/projects/", "GitHub"],
    ["/en/projects/", "GitHub"],
    ["/publications/", "论文"],
    ["/en/publications/", "Papers"],
  ]) {
    await page.goto(route);
    const h1 = page.getByRole("heading", { level: 1, name: heading, exact: true });
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveClass(/sr-only/);
    await expect(page.locator("main h1")).toHaveCount(1);
  }
});

test("article bodies defer non-cover images without changing the eager cover", async ({
  page,
}) => {
  await page.goto(longArticle, { waitUntil: "domcontentloaded" });

  const cover = page.locator(".article-cover__image");
  await expect(cover).toHaveAttribute("loading", "eager");
  await expect(cover).toHaveAttribute("fetchpriority", "high");

  const bodyImages = page.locator(".post-content img");
  expect(await bodyImages.count()).toBeGreaterThanOrEqual(9);
  expect(
    await bodyImages.evaluateAll((images) => images.every((image) => (
      image.loading === "lazy" && image.decoding === "async"
    ))),
  ).toBe(true);
});

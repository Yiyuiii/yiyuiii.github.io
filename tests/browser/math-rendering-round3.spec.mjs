import { expect, test } from "@playwright/test";

const formulaPages = [
  ["/posts/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0%E9%97%AE%E9%A2%98%E9%9A%8F%E7%AC%94/", 13],
  ["/en/posts/reinforcement-learning-issues/", 13],
  ["/posts/%E5%88%B6%E4%BD%9C%E4%B8%80%E5%BC%A0%E5%8C%B9%E9%85%8D%E5%BD%A2%E7%8A%B6%E7%9A%84%E5%AD%97%E7%AC%A6%E7%94%BB/", 10],
  ["/en/posts/building-shape-matched-ascii-art/", 10],
  ["/posts/%E5%9B%9B%E5%AD%A3%E7%89%A9%E8%AF%AD%E9%87%8F%E5%8C%96%E5%88%86%E6%9E%90%E6%94%BB%E7%95%A5/", 13],
  ["/en/posts/quantitative-strategy-guide-to-seasons/", 13],
  ["/posts/%E9%80%BB%E8%BE%91%E5%AF%B9%E5%86%B3%E6%A1%8C%E6%B8%B8%E6%94%BB%E7%95%A5/", 20],
  ["/en/posts/break-the-code-strategy-guide/", 20],
  ["/posts/%E4%BA%86%E8%A7%A3%E6%B8%B8%E6%B3%B3/", 7],
  ["/en/posts/understanding-swimming/", 7],
  ["/posts/%E7%9B%96%E4%BA%9A%E8%AE%A1%E5%88%92-%E8%B5%84%E6%BA%90-%E5%88%86%E5%80%BC%E9%87%8F%E5%8C%96%E8%AE%A1%E7%AE%97%E6%80%9D%E8%B7%AF/", 11],
  ["/en/posts/gaia-project-resource-and-point-value-analysis/", 11],
  ["/posts/%E7%89%B9%E9%B2%81%E7%93%A6-%E8%B5%84%E6%BA%90-%E5%88%86%E5%80%BC%E9%87%8F%E5%8C%96%E5%88%86%E6%9E%90%E6%94%BB%E7%95%A5/", 13],
  ["/en/posts/troyes-resource-and-point-value-analysis/", 13],
  ["/posts/%E5%A4%A7%E5%88%9B%E9%80%A0%E6%97%B6%E4%BB%A3-%E8%B5%84%E6%BA%90-%E5%88%86%E5%80%BC%E9%87%8F%E5%8C%96%E8%AE%A1%E7%AE%97%E6%80%9D%E8%B7%AF/", 3],
  ["/en/posts/age-of-innovation-resource-and-point-value-analysis/", 3],
];

test.describe("math rendering round 3", () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    await page.route(/^https?:\/\//u, async (route) => {
      const hostname = new URL(route.request().url()).hostname;
      if (hostname === "127.0.0.1" || hostname === "localhost") {
        await route.continue();
      } else {
        await route.abort("blockedbyclient");
      }
    });
  });

  test("every bilingual formula page renders all formulas", async ({ page }) => {
    for (const [route, expectedFormulaCount] of formulaPages) {
      await test.step(route, async () => {
        const runtimeErrors = [];
        const recordPageError = (error) => {
          if (/mathjax/iu.test(error.message)) runtimeErrors.push(error.message);
        };
        const recordConsoleError = (message) => {
          if (message.type() === "error" && /mathjax/iu.test(message.text())) {
            runtimeErrors.push(message.text());
          }
        };
        page.on("pageerror", recordPageError);
        page.on("console", recordConsoleError);

        await page.goto(route);
        await page.waitForFunction(
          (expected) =>
            document.documentElement.dataset.mathRendering === "ready" &&
            document.querySelectorAll(".post-content mjx-container").length ===
              expected,
          expectedFormulaCount,
          { timeout: 30_000 },
        );

        const audit = await page.locator(".post-content").evaluate((content) => {
          const rawFormulaText = [];
          const invisibleFormulas = [];
          const walker = document.createTreeWalker(
            content,
            NodeFilter.SHOW_TEXT,
          );
          let node = walker.nextNode();
          while (node) {
            if (
              !node.parentElement?.closest(
                "pre, code, script, style, mjx-container",
              ) &&
              /(?:\$\$?|\\\(|\\\)|\\\[|\\\])/u.test(node.data)
            ) {
              rawFormulaText.push(node.data.trim());
            }
            node = walker.nextNode();
          }

          for (const formula of content.querySelectorAll("mjx-container")) {
            const style = getComputedStyle(formula);
            const rect = formula.getBoundingClientRect();
            if (
              style.display === "none" ||
              style.visibility === "hidden" ||
              Number(style.opacity) === 0 ||
              rect.width < 1 ||
              rect.height < 1
            ) {
              invisibleFormulas.push(formula.textContent);
            }
          }

          return {
            formulaCount: content.querySelectorAll("mjx-container").length,
            invisibleFormulas,
            mathErrors: [...content.querySelectorAll("mjx-merror")].map(
              (element) => element.getAttribute("title") || element.textContent,
            ),
            rawFormulaText,
          };
        });

        expect(audit.formulaCount, route).toBe(expectedFormulaCount);
        expect(audit.invisibleFormulas, route).toEqual([]);
        expect(audit.mathErrors, route).toEqual([]);
        expect(audit.rawFormulaText, route).toEqual([]);
        expect(runtimeErrors, route).toEqual([]);

        page.off("pageerror", recordPageError);
        page.off("console", recordConsoleError);
      });
    }
  });

  test("the runtime and fonts stay local when every external request is blocked", async ({
    page,
  }) => {
    const mathJaxRequests = [];
    page.on("request", (request) => {
      if (request.url().toLowerCase().includes("mathjax")) {
        mathJaxRequests.push(request.url());
      }
    });

    await page.goto("/en/posts/reinforcement-learning-issues/");
    await page.waitForFunction(
      () => document.documentElement.dataset.mathRendering === "ready",
      null,
      { timeout: 30_000 },
    );

    await expect(page.locator("html")).toHaveAttribute(
      "data-math-rendering-source",
      "local",
    );
    await expect(page.locator(".post-content mjx-container")).toHaveCount(13);
    await expect(page.locator(".post-content mjx-merror")).toHaveCount(0);

    expect(mathJaxRequests.length).toBeGreaterThanOrEqual(2);
    expect(mathJaxRequests.some((url) => url.endsWith(".woff"))).toBe(true);
    for (const url of mathJaxRequests) {
      expect(new URL(url).hostname, url).toMatch(/^(?:127\.0\.0\.1|localhost)$/u);
    }
  });
});

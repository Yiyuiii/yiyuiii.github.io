import { expect, test } from "@playwright/test";

const articleRoutes = [
  "/posts/%E5%9B%9B%E7%A7%8D%E9%A2%9C%E8%89%B2%E7%9A%84%E5%A4%96%E5%A5%97%E7%B3%BB%E7%BB%9F/",
  "/en/posts/a-four-color-outerwear-system/",
];

const expectedImages = [
  "/assets/posts/202608081100/outerwear-color-controlled-comparison.webp",
  "/assets/posts/202608081100/outerwear-brick-red-pairings.webp",
  "/assets/posts/202608081100/outerwear-warm-beige-pairings.webp",
  "/assets/posts/202608081100/outerwear-muted-olive-pairings.webp",
  "/assets/posts/202608081100/outerwear-charcoal-pairings.webp",
];

for (const viewport of [
  { width: 1536, height: 960 },
  { width: 390, height: 844 },
]) {
  test(`four-color atlas remains complete and responsive at ${viewport.width}px`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize(viewport);

    for (const route of articleRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });

      const images = page.locator(
        '.post-content img[src^="/assets/posts/202608081100/outerwear-"]',
      );
      await expect(images).toHaveCount(5);

      for (const image of await images.all()) {
        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(() => image.evaluate((node) => node.complete && node.naturalWidth > 0))
          .toBe(true);
      }

      const audit = await images.evaluateAll((nodes) =>
        nodes.map((node) => {
          const imageParagraph = node.closest("p");
          const caption = imageParagraph?.nextElementSibling;
          return {
            src: new URL(node.currentSrc || node.src).pathname,
            source: new URL(node.src).pathname,
            srcset: node.getAttribute("srcset") ?? "",
            sizes: node.getAttribute("sizes") ?? "",
            loading: node.loading,
            decoding: node.decoding,
            width: node.getAttribute("width"),
            height: node.getAttribute("height"),
            alt: node.alt,
            captionTag: caption?.tagName ?? "",
            captionEmphasis: caption?.querySelector(":scope > em")?.textContent ?? "",
          };
        }),
      );

      expect(audit.map(({ source }) => source)).toEqual(expectedImages);
      expect(
        audit.every(({ srcset }) => srcset.includes("800w") && srcset.includes("1400w")),
      ).toBe(true);
      expect(audit.every(({ sizes }) => sizes.length > 0)).toBe(true);
      expect(audit.every(({ loading }) => loading === "lazy")).toBe(true);
      expect(audit.every(({ decoding }) => decoding === "async")).toBe(true);
      expect(audit.every(({ width, height }) => Number(width) > 0 && Number(height) > 0)).toBe(
        true,
      );
      expect(audit.every(({ alt }) => alt.trim().length > 20)).toBe(true);
      expect(
        audit.every(
          ({ captionTag, captionEmphasis }) =>
            captionTag === "P" && captionEmphasis.trim().length > 20,
        ),
      ).toBe(true);

      const geometry = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
    }
  });
}

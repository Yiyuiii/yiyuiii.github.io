import { expect, test } from "@playwright/test";

const richArticleRoute = "/en/posts/quantitative-strategy-guide-to-seasons/";

function expectClose(actual, expected, tolerance = 1) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

async function articleGeometry(page) {
  return page.evaluate(() => {
    const content = document.querySelector(".post-content");
    const prose = content.querySelector(":scope > p:not(:has(img))");
    const heading = content.querySelector(":scope > h2, :scope > h3");
    const list = content.querySelector(":scope > ul, :scope > ol");
    const listItem = list?.querySelector(":scope > li");
    const tables = Array.from(content.querySelectorAll(":scope > table"));
    const table = tables[0];
    const image = content.querySelector(":scope > p > img");
    const imageParagraph = image?.closest("p");
    const cover = document.querySelector(".article-cover");
    const coverImage = cover?.querySelector(".article-cover__image");

    const box = (node) => {
      const rect = node?.getBoundingClientRect();
      return rect
        ? { left: rect.left, right: rect.right, width: rect.width }
        : null;
    };

    return {
      viewportWidth: innerWidth,
      clientWidth: document.documentElement.clientWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
      content: box(content),
      prose: box(prose),
      heading: box(heading),
      list: box(list),
      listItem: box(listItem),
      table: box(table),
      tableClientWidth: table?.clientWidth ?? 0,
      tableScrollWidth: table?.scrollWidth ?? 0,
      overflowingTablesStayLocal: tables
        .filter((candidate) => candidate.scrollWidth > candidate.clientWidth + 1)
        .every((candidate) => getComputedStyle(candidate).overflowX === "auto"),
      imageParagraph: box(imageParagraph),
      image: box(image),
      imageNaturalWidth: image?.naturalWidth ?? 0,
      cover: box(cover),
      coverImage: box(coverImage),
    };
  });
}

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 1024, height: 900 },
  { width: 768, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 800 },
]) {
  test(`${viewport.width}px keeps prose aligned and wide media locally bounded`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(richArticleRoute, { waitUntil: "domcontentloaded" });
    const targetImage = page.locator('.post-content img[src$="/bigcards.jpg"]');
    await targetImage.scrollIntoViewIfNeeded();
    await expect(targetImage).toHaveJSProperty("complete", true);

    const geometry = await articleGeometry(page);

    expect(geometry.pageScrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
    expect(geometry.content.left).toBeGreaterThanOrEqual(0);
    expect(geometry.content.right).toBeLessThanOrEqual(geometry.clientWidth + 1);

    for (const proseElement of [geometry.heading, geometry.list]) {
      expectClose(proseElement.left, geometry.prose.left);
      expectClose(proseElement.width, geometry.prose.width);
    }

    const listIndent = geometry.listItem.left - geometry.list.left;
    expect(listIndent).toBeGreaterThanOrEqual(22);
    expect(listIndent).toBeLessThanOrEqual(29);

    expect(geometry.table.left).toBeGreaterThanOrEqual(geometry.content.left - 1);
    expect(geometry.table.right).toBeLessThanOrEqual(geometry.content.right + 1);
    expect(geometry.tableClientWidth).toBeLessThanOrEqual(geometry.content.width + 1);

    expectClose(geometry.imageParagraph.left, geometry.content.left);
    expectClose(geometry.imageParagraph.width, geometry.content.width);
    expect(geometry.image.left).toBeGreaterThanOrEqual(geometry.imageParagraph.left - 1);
    expect(geometry.image.right).toBeLessThanOrEqual(geometry.imageParagraph.right + 1);
    expect(geometry.image.width).toBeLessThanOrEqual(geometry.imageNaturalWidth + 1);

    expectClose(geometry.cover.left, geometry.content.left);
    expectClose(geometry.cover.width, geometry.content.width);
    expect(geometry.coverImage.left).toBeGreaterThanOrEqual(geometry.cover.left - 1);
    expect(geometry.coverImage.right).toBeLessThanOrEqual(geometry.cover.right + 1);

    expect(geometry.overflowingTablesStayLocal).toBe(true);
  });
}

test("quotes, evidence, and code follow their intended prose or wide canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto("/en/posts/learning-seti-board-game/", {
    waitUntil: "domcontentloaded",
  });
  const ordinaryQuote = await page.evaluate(() => {
    const content = document.querySelector(".post-content");
    const prose = content.querySelector(":scope > p").getBoundingClientRect();
    const quote = content
      .querySelector(":scope > blockquote:not(.article-evidence)")
      .getBoundingClientRect();
    const quoteParagraph = content
      .querySelector(":scope > blockquote:not(.article-evidence) > p")
      .getBoundingClientRect();
    return {
      prose: { left: prose.left, width: prose.width },
      quote: { left: quote.left, width: quote.width },
      quoteParagraphLeft: quoteParagraph.left,
    };
  });
  expectClose(ordinaryQuote.quote.left, ordinaryQuote.prose.left);
  expectClose(ordinaryQuote.quote.width, ordinaryQuote.prose.width);
  expect(ordinaryQuote.quoteParagraphLeft - ordinaryQuote.quote.left).toBeGreaterThan(15);

  await page.goto("/en/posts/break-the-code-strategy-guide/", {
    waitUntil: "domcontentloaded",
  });
  const evidence = await page.evaluate(() => {
    const content = document.querySelector(".post-content");
    const prose = content.querySelector(":scope > p").getBoundingClientRect();
    const quote = content
      .querySelector(":scope > blockquote.article-evidence")
      .getBoundingClientRect();
    return {
      prose: { left: prose.left, width: prose.width },
      quote: { left: quote.left, width: quote.width },
    };
  });
  expectClose(evidence.quote.left, evidence.prose.left);
  expectClose(evidence.quote.width, evidence.prose.width);

  await page.goto("/en/posts/building-shape-matched-ascii-art/", {
    waitUntil: "domcontentloaded",
  });
  const code = await page.evaluate(() => {
    const content = document.querySelector(".post-content").getBoundingClientRect();
    const prose = document
      .querySelector(".post-content > p:not(:has(img))")
      .getBoundingClientRect();
    const wrapper = document
      .querySelector(".post-content > .highlighter-rouge")
      .getBoundingClientRect();
    const pre = document
      .querySelector(".post-content > .highlighter-rouge pre")
      .getBoundingClientRect();
    return {
      content: { left: content.left, width: content.width },
      prose: { left: prose.left, width: prose.width },
      wrapper: { left: wrapper.left, width: wrapper.width },
      pre: { left: pre.left, right: pre.right },
      pageOverflows:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });
  expectClose(code.wrapper.left, code.content.left);
  expectClose(code.wrapper.width, code.content.width);
  expect(code.wrapper.width - code.prose.width).toBeGreaterThan(300);
  expect(code.pre.left).toBeGreaterThanOrEqual(code.wrapper.left - 1);
  expect(code.pre.right).toBeLessThanOrEqual(code.wrapper.left + code.wrapper.width + 1);
  expect(code.pageOverflows).toBe(false);
});

test("narrative paragraphs indent while all compact conversion blocks stay aligned", async ({
  page,
}) => {
  await page.route(/^https?:\/\//u, async (route) => {
    const hostname = new URL(route.request().url()).hostname;
    if (hostname === "127.0.0.1" || hostname === "localhost") {
      await route.continue();
    } else {
      await route.abort("blockedbyclient");
    }
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  const layouts = [];
  for (const route of [
    "/posts/大创造时代-资源-分值量化计算思路/",
    "/en/posts/age-of-innovation-resource-and-point-value-analysis/",
  ]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.documentElement.dataset.mathRendering === "ready",
    );

    layouts.push(
      await page.evaluate(() => {
        const content = document.querySelector(".post-content");
        const prose = content.querySelector(":scope > p:not(:has(img))");
        const conversions = Array.from(
          content.querySelectorAll(":scope > .article-conversion"),
        );
        const code = conversions[0].querySelector("code");
        const displayMath = content.querySelector('mjx-container[display="true"]');
        const displayMathParagraph = displayMath.closest("p");

        const equalsOffsets = [];
        const text = code.firstChild;
        for (
          let index = text.data.indexOf("=");
          index >= 0;
          index = text.data.indexOf("=", index + 1)
        ) {
          const range = document.createRange();
          range.setStart(text, index);
          range.setEnd(text, index + 1);
          equalsOffsets.push(range.getBoundingClientRect().left);
        }

        return {
          proseIndent: parseFloat(getComputedStyle(prose).textIndent),
          proseFontSize: parseFloat(getComputedStyle(prose).fontSize),
          proseLeft: prose.getBoundingClientRect().left,
          conversionLefts: conversions.map(
            (conversion) => conversion.getBoundingClientRect().left,
          ),
          preLefts: conversions.map(
            (conversion) => conversion.querySelector("pre").getBoundingClientRect().left,
          ),
          equalsOffsets,
          displayMathIndent: displayMathParagraph
            ? parseFloat(getComputedStyle(displayMathParagraph).textIndent)
            : 0,
          pageOverflows:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1,
        };
      }),
    );
  }

  await page.goto(richArticleRoute, { waitUntil: "domcontentloaded" });
  const imageIndent = await page
    .locator('.post-content p:has(> img[src$="/bigcards.jpg"]:only-child)')
    .evaluate((paragraph) => parseFloat(getComputedStyle(paragraph).textIndent));

  for (const layout of layouts) {
    expectClose(layout.proseIndent, layout.proseFontSize * 2, 0.5);
    expect(layout.conversionLefts).toHaveLength(14);
    expect(layout.preLefts).toHaveLength(14);
    for (const left of [...layout.conversionLefts, ...layout.preLefts]) {
      expectClose(left, layout.proseLeft);
    }
    expect(layout.equalsOffsets).toHaveLength(2);
    expectClose(layout.equalsOffsets[0], layout.equalsOffsets[1], 0.5);
    expect(layout.displayMathIndent).toBe(0);
    expect(layout.pageOverflows).toBe(false);
  }
  expect(imageIndent).toBe(0);
});

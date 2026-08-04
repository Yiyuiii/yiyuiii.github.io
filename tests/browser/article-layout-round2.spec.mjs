import { expect, test } from "@playwright/test";

const articleRoute = "/en/posts/quantitative-strategy-guide-to-seasons/";
const setiRoute = "/posts/SETI桌游规则-从摆桌到完成第一局/";

test("1280px articles use the inline disclosure instead of the side rail", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(articleRoute, { waitUntil: "domcontentloaded" });

  const inlineToc = page.locator(".article-inline-toc");
  await expect(inlineToc).toBeVisible();
  await expect(inlineToc).not.toHaveAttribute("open", "");
  await expect(page.locator(".article-side-toc")).toBeHidden();
  await expect(page.locator(".article-section-dialog")).toHaveCount(0);

  await inlineToc.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(inlineToc).toHaveAttribute("open", "");
  expect(await inlineToc.locator('nav a[href^="#"]').count()).toBeGreaterThan(0);
  const firstLink = inlineToc.locator('nav a[href^="#"]').first();
  await expect(firstLink).toBeVisible();
  const targetId = (await firstLink.getAttribute("href")).slice(1);
  await firstLink.focus();
  await page.keyboard.press("Enter");
  await expect(inlineToc).not.toHaveAttribute("open", "");
  await expect(page.locator(`#${targetId}`)).toBeFocused();
});

for (const width of [1536, 1920]) {
  test(`${width}px articles use a bounded sticky left rail through comments`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(articleRoute, { waitUntil: "domcontentloaded" });

    await expect(page.locator(".article-inline-toc")).toBeHidden();
    const sideToc = page.locator(".article-side-toc");
    await expect(sideToc).toBeVisible();

    const firstLink = sideToc.locator('a[href^="#"]').first();
    await firstLink.focus();
    await page.keyboard.press("Enter");
    await expect(firstLink).toHaveAttribute("aria-current", "location");

    const geometry = await page.evaluate(() => {
      const shell = document.querySelector(".article-shell");
      const rail = document.querySelector(".article-side-toc");
      const column = document.querySelector(".article-column");
      const prose = document.querySelector(".post-content > p:not(:has(img))");
      const railBox = rail.getBoundingClientRect();
      const columnBox = column.getBoundingClientRect();
      return {
        shellDisplay: getComputedStyle(shell).display,
        railPosition: getComputedStyle(rail).position,
        railTop: railBox.top,
        railWidth: railBox.width,
        gap: columnBox.left - railBox.right,
        columnWidth: columnBox.width,
        proseWidth: prose.getBoundingClientRect().width,
        headerBottom: document
          .querySelector(".site-header")
          .getBoundingClientRect().bottom,
        commentsShareShell:
          document.querySelector("[data-page-comments]")?.parentElement === shell,
        pageOverflows: document.documentElement.scrollWidth > innerWidth,
      };
    });

    expect(geometry.shellDisplay).toBe("grid");
    expect(geometry.railPosition).toBe("sticky");
    expect(geometry.railTop).toBeGreaterThanOrEqual(geometry.headerBottom);
    expect(geometry.railWidth).toBeGreaterThanOrEqual(207);
    expect(geometry.railWidth).toBeLessThanOrEqual(209);
    expect(geometry.gap).toBeGreaterThanOrEqual(31);
    expect(geometry.columnWidth).toBeGreaterThanOrEqual(1150);
    expect(geometry.proseWidth).toBeGreaterThanOrEqual(798);
    expect(geometry.proseWidth).toBeLessThanOrEqual(802);
    expect(geometry.commentsShareShell).toBe(true);
    expect(geometry.pageOverflows).toBe(false);

    await page.evaluate(() => window.scrollTo(0, 900));
    await expect
      .poll(() =>
        sideToc.evaluate((node) => Math.round(node.getBoundingClientRect().top)),
      )
      .toBe(24);

    await page.locator("[data-comments-thread]").evaluate((node) => {
      node.hidden = false;
      node.style.minHeight = "1200px";
    });
    await page.locator("[data-page-comments]").evaluate((node) => {
      const documentTop = node.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, documentTop + 200);
    });
    await expect
      .poll(() =>
        sideToc.evaluate((node) => Math.round(node.getBoundingClientRect().top)),
      )
      .toBe(24);

    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    const lowerBoundary = await page.evaluate(() => {
      const rail = document
        .querySelector(".article-side-toc")
        .getBoundingClientRect();
      const footer = document.querySelector(".site-footer").getBoundingClientRect();
      return { railBottom: rail.bottom, footerTop: footer.top };
    });
    expect(lowerBoundary.railBottom).toBeLessThanOrEqual(lowerBoundary.footerTop + 1);
  });
}

test("prose stays readable while standalone media and data use the wide canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(articleRoute, { waitUntil: "domcontentloaded" });
  const wideImage = page.locator('.post-content img[src$="/bigcards.jpg"]');
  await wideImage.scrollIntoViewIfNeeded();
  await expect(wideImage).toHaveJSProperty("complete", true);

  const geometry = await page.evaluate(() => {
    const content = document.querySelector(".post-content");
    const prose = content.querySelector(":scope > p:not(:has(img))");
    const image = content.querySelector('img[src$="/bigcards.jpg"]');
    const imageParagraph = image.closest("p");
    const tables = Array.from(content.querySelectorAll(":scope > table"));
    const dataTable = tables[0];

    return {
      contentWidth: content.getBoundingClientRect().width,
      proseWidth: prose.getBoundingClientRect().width,
      imageContainerWidth: imageParagraph.getBoundingClientRect().width,
      imageWidth: image.getBoundingClientRect().width,
      imageNaturalWidth: image.naturalWidth,
      tableCount: tables.length,
      tableClientWidth: dataTable?.clientWidth ?? 0,
      pageOverflows: document.documentElement.scrollWidth > innerWidth,
    };
  });

  expect(geometry.contentWidth).toBeGreaterThanOrEqual(1150);
  expect(geometry.proseWidth).toBeGreaterThanOrEqual(798);
  expect(geometry.proseWidth).toBeLessThanOrEqual(802);
  expect(geometry.imageContainerWidth - geometry.proseWidth).toBeGreaterThan(300);
  expect(geometry.imageWidth).toBeLessThanOrEqual(geometry.imageNaturalWidth + 1);
  expect(geometry.tableCount).toBeGreaterThan(0);
  expect(geometry.tableClientWidth).toBeGreaterThan(0);
  expect(geometry.tableClientWidth).toBeLessThanOrEqual(geometry.contentWidth + 1);
  expect(geometry.pageOverflows).toBe(false);
});

test("top-level article disclosures align with the prose column", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(setiRoute, { waitUntil: "domcontentloaded" });

  const geometry = await page.evaluate(() => {
    const content = document.querySelector(".post-content");
    const prose = content.querySelector(":scope > p:not(:has(img))");
    const disclosure = content.querySelector(":scope > details");
    const summaryText = disclosure.querySelector("summary strong");
    const proseBox = prose.getBoundingClientRect();
    const disclosureBox = disclosure.getBoundingClientRect();
    const summaryTextBox = summaryText.getBoundingClientRect();

    return {
      proseLeft: proseBox.left,
      proseWidth: proseBox.width,
      disclosureLeft: disclosureBox.left,
      disclosureWidth: disclosureBox.width,
      summaryTextLeft: summaryTextBox.left,
      pageOverflows: document.documentElement.scrollWidth > innerWidth,
    };
  });

  expect(Math.abs(geometry.disclosureLeft - geometry.proseLeft)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.disclosureWidth - geometry.proseWidth)).toBeLessThanOrEqual(1);
  expect(geometry.summaryTextLeft).toBeGreaterThan(geometry.disclosureLeft);
  expect(geometry.pageOverflows).toBe(false);
});

for (const viewport of [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`${viewport.width}px articles keep all horizontal overflow local`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(articleRoute, { waitUntil: "domcontentloaded" });

    await expect(page.locator(".article-inline-toc")).toBeVisible();
    await expect(page.locator(".article-side-toc")).toBeHidden();

    const overflow = await page.evaluate(() => {
      const content = document.querySelector(".post-content");
      const tables = Array.from(content.querySelectorAll(":scope > table"));
      const images = Array.from(content.querySelectorAll("img"));
      const viewportWidth = innerWidth;
      return {
        page: document.documentElement.scrollWidth > viewportWidth,
        contentRight: content.getBoundingClientRect().right,
        tableOutsideViewport: tables.some(
          (table) => table.getBoundingClientRect().right > viewportWidth + 1,
        ),
        imageOutsideViewport: images.some(
          (image) => image.getBoundingClientRect().right > viewportWidth + 1,
        ),
        overflowingTablesStayLocal: tables
          .filter((table) => table.scrollWidth > table.clientWidth + 1)
          .every((table) => getComputedStyle(table).overflowX === "auto"),
      };
    });

    expect(overflow.page).toBe(false);
    expect(overflow.contentRight).toBeLessThanOrEqual(viewport.width);
    expect(overflow.tableOutsideViewport).toBe(false);
    expect(overflow.imageOutsideViewport).toBe(false);
    expect(overflow.overflowingTablesStayLocal).toBe(true);
  });
}

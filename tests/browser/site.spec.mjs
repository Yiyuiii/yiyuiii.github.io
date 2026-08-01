import { expect, test } from "@playwright/test";

const viewports = [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 800 },
];

const aboutViewports = [
  { width: 1280, height: 900 },
  { width: 641, height: 900 },
  { width: 640, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 800 },
];

const rgb = (value) => {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) throw new Error(`Unsupported color: ${value}`);
  return match.slice(1, 4).map(Number);
};

const luminance = ([red, green, blue]) => {
  const channels = [red, green, blue].map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return (
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  );
};

const contrast = (foreground, background) => {
  const lighter = Math.max(luminance(rgb(foreground)), luminance(rgb(background)));
  const darker = Math.min(luminance(rgb(foreground)), luminance(rgb(background)));
  return (lighter + 0.05) / (darker + 0.05);
};

for (const viewport of viewports) {
  test(`writing index adapts at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    await expect(page.locator(".site-nav a")).toHaveCount(4);
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      navVisible: [...document.querySelectorAll(".site-nav a")].every((link) => {
        const box = link.getBoundingClientRect();
        return box.width > 0 && box.left >= 0 && box.right <= innerWidth + 0.5;
      }),
      summariesClipped: [...document.querySelectorAll(
        ".writing-entry .entry-main > p",
      )].some((summary) => summary.scrollHeight > summary.clientHeight + 1),
    }));

    expect(layout).toEqual({
      overflow: false,
      navVisible: true,
      summariesClipped: false,
    });

    if (viewport.width === 1280) {
      const centerDelta = await page.locator(".site-nav").evaluate((nav) => {
        const box = nav.getBoundingClientRect();
        return Math.abs(box.left + box.width / 2 - innerWidth / 2);
      });
      expect(centerDelta).toBeLessThanOrEqual(1);
    }

    for (const route of [
      "/projects/",
      "/en/projects/",
      "/publications/",
      "/en/publications/",
    ]) {
      await page.goto(route);
      await expect(page.locator(".entry-meta.index-meta").first()).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      ).toBe(false);
    }

    for (const route of ["/about/", "/en/about/"]) {
      await page.goto(route);
      const greeting = page.locator(".about-greeting");
      await expect(greeting).toBeVisible();
      const greetingVisual = await greeting.evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          fontSize: Number.parseFloat(style.fontSize),
          backgroundImage: style.backgroundImage,
        };
      });
      expect(greetingVisual.fontSize).toBeGreaterThanOrEqual(28);
      expect(greetingVisual.fontSize).toBeLessThanOrEqual(45);
      expect(greetingVisual.backgroundImage).toContain("linear-gradient");

      const sectionHeadings = page.locator(".about-section > h2");
      await expect(sectionHeadings).toHaveCount(5);
      const rules = await sectionHeadings.evaluateAll((nodes) =>
        nodes.map((node) => {
          const style = getComputedStyle(node, "::after");
          return {
            content: style.content,
            height: Number.parseFloat(style.height),
            width: Number.parseFloat(style.width),
            backgroundColor: style.backgroundColor,
          };
        }),
      );
      expect(
        rules.every(
          (rule) =>
        rule.content === '""' &&
        rule.height >= 0.5 &&
        rule.height <= 1.5 &&
            rule.width >= 20 &&
            rule.backgroundColor !== "rgba(0, 0, 0, 0)",
        ),
      ).toBe(true);

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      ).toBe(false);
    }
  });
}

test("writing index requests only responsive cover derivatives", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: process.env.SITE_URL || "http://localhost:62091",
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const requestedCovers = new Set();
  page.on("response", (response) => {
    const pathname = new URL(response.url()).pathname;
    if (pathname.startsWith("/assets/posts/") && pathname.endsWith(".webp")) {
      requestedCovers.add(pathname);
    }
  });

  await page.goto("/");
  const writingHref = await page.locator(".site-nav a").first().getAttribute("href");
  if (writingHref && new URL(page.url()).pathname !== writingHref) {
    await page.goto(writingHref);
  }

  const thumbnails = page.locator(".entry-thumbnail img");
  const count = await thumbnails.count();
  expect(count).toBeGreaterThan(0);
  await expect(thumbnails.first()).toHaveAttribute("loading", "eager");
  await expect(thumbnails.first()).toHaveAttribute("fetchpriority", "high");
  if (count > 1) {
    await expect(thumbnails.nth(1)).toHaveAttribute("loading", "lazy");
    await expect(thumbnails.nth(1)).not.toHaveAttribute("fetchpriority");
  }

  for (let index = 0; index < count; index += 1) {
    await thumbnails.nth(index).scrollIntoViewIfNeeded();
  }
  await expect.poll(() => requestedCovers.size).toBe(count);

  const selected = await thumbnails.evaluateAll((images) => images.map((image) => ({
    current: new URL(image.currentSrc).pathname,
    source: new URL(image.src).pathname,
    candidates: image.srcset,
  })));
  expect(selected.every((item) => item.current.endsWith("-index-v1-320.webp"))).toBe(
    true,
  );
  expect(selected.every((item) => item.source.endsWith("-index-v1-160.webp"))).toBe(
    true,
  );
  expect(selected.every((item) => item.candidates.includes("160w")
    && item.candidates.includes("320w"))).toBe(true);
  expect([...requestedCovers].every((pathname) => (
    /-index-v1-(160|320)\.webp$/.test(pathname)
  ))).toBe(true);

  await context.close();
});

for (const viewport of aboutViewports) {
  for (const profile of [
    {
      route: "/about/",
      headings: [
        "个人基调",
        "科研方向",
        "兴趣方向",
        "日常技能",
        "我的链接",
      ],
    },
    {
      route: "/en/about/",
      headings: [
        "Personal Tastes",
        "Research Directions",
        "Interests",
        "Everyday Skills",
        "My Links",
      ],
    },
  ]) {
    test(`About ${profile.route} remains complete at ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(profile.route);

      await expect(page.locator(".about-section > h2")).toHaveText(
        profile.headings,
      );
      await expect(page.locator("#about-education")).toHaveCount(0);
      await expect(page.locator("#about-research .about-detail-list > div")).toHaveCount(
        3,
      );
      await expect(page.locator("#about-interests .about-detail-list > div")).toHaveCount(
        11,
      );
      await expect(page.locator("#about-skills .about-detail-list > div")).toHaveCount(
        3,
      );
      await expect(page.locator(".about-links a")).toHaveCount(4);

      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        clipped: [...document.querySelectorAll(
          ".about-intro__paragraph, .about-prose__paragraph, .about-detail-list dd",
        )].some(
          (node) =>
            node.scrollHeight > node.clientHeight + 1 ||
            node.scrollWidth > node.clientWidth + 1,
        ),
      }));
      expect(layout).toEqual({ overflow: false, clipped: false });

      const firstDetail = page.locator("#about-research .about-detail-list > div").first();
      const positions = await firstDetail.evaluate((row) => {
        const term = row.querySelector("dt").getBoundingClientRect();
        const detail = row.querySelector("dd").getBoundingClientRect();
        return {
          termLeft: term.left,
          termTop: term.top,
          termBottom: term.bottom,
          detailLeft: detail.left,
          detailTop: detail.top,
        };
      });
      if (viewport.width === 641 || viewport.width === 1280) {
        expect(positions.detailLeft).toBeGreaterThan(positions.termLeft);
        expect(Math.abs(positions.detailTop - positions.termTop)).toBeLessThan(4);
      }
      if (viewport.width <= 640) {
        expect(Math.abs(positions.detailLeft - positions.termLeft)).toBeLessThan(2);
        expect(positions.detailTop).toBeGreaterThanOrEqual(positions.termBottom);
      }

      const paypal = page.locator(".about-links a").last();
      await paypal.scrollIntoViewIfNeeded();
      await expect(paypal).toBeVisible();
      const accessibleNames = [
        "GitHub",
        profile.route.startsWith("/en/") ? "Email" : "电子邮件",
        "RSS",
        "PayPal",
      ];
      for (const [index, name] of accessibleNames.entries()) {
        await expect(page.locator(".about-links a").nth(index)).toHaveAccessibleName(
          name,
        );
      }
    });
  }
}

test("light appearance and readable type remain stable", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const lightBackground = await page.locator("body").evaluate(
    (body) => getComputedStyle(body).backgroundColor,
  );

  await page.emulateMedia({ colorScheme: "dark" });
  const darkBackground = await page.locator("body").evaluate(
    (body) => getComputedStyle(body).backgroundColor,
  );
  expect(darkBackground).toBe(lightBackground);
  expect(lightBackground).toBe("rgb(246, 246, 243)");

  const typography = await page.locator(".writing-entry").first().evaluate((entry) => {
    const summary = getComputedStyle(entry.querySelector(".entry-main > p"));
    const date = getComputedStyle(entry.querySelector("time"));
    return {
      summarySize: Number.parseFloat(summary.fontSize),
      summaryLineHeight: Number.parseFloat(summary.lineHeight),
      summaryColor: summary.color,
      dateColor: date.color,
      background: getComputedStyle(document.body).backgroundColor,
    };
  });

  expect(typography.summarySize).toBeGreaterThanOrEqual(15);
  expect(typography.summaryLineHeight).toBeGreaterThanOrEqual(24);
  expect(contrast(typography.summaryColor, typography.background)).toBeGreaterThanOrEqual(
    4.5,
  );
  expect(contrast(typography.dateColor, typography.background)).toBeGreaterThanOrEqual(
    4.5,
  );
});

test("tag filtering writes a shareable URL and back restores the index", async ({
  page,
}) => {
  await page.goto("/");
  const initialCount = await page.locator(".writing-entry").count();
  await page.getByRole("link", { name: "桌游", exact: true }).first().click();

  await expect(page).toHaveURL(/\?tag=/);
  const visibleWriting = page.locator(".writing-entry:not([hidden])");
  await expect
    .poll(() => visibleWriting.count())
    .toBeLessThan(initialCount);
  const filteredCount = await visibleWriting.count();
  expect(filteredCount).toBeGreaterThan(0);
  expect(filteredCount).toBeLessThan(initialCount);

  await page.goBack();
  await expect(page.locator(".writing-entry")).toHaveCount(initialCount);
});

for (const route of ["/projects/", "/en/projects/"]) {
  test(`project metadata filters are shareable and reversible on ${route}`, async ({
    page,
  }) => {
    await page.goto(route);
    const projects = page.locator("article.project-entry");
    const initialCount = await projects.count();

    await page.getByRole("link", { name: "Python", exact: true }).first().click();
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(
      `${route}?tag=Python`,
    );
    const visibleProjects = page.locator(
      "article.project-entry:not([hidden])",
    );
    await expect
      .poll(() => visibleProjects.count())
      .toBeLessThan(initialCount);
    const filteredCount = await visibleProjects.count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(initialCount);

    await page.goBack();
    expect(new URL(page.url()).pathname).toBe(route);
    await expect(page.locator("article.project-entry:not([hidden])")).toHaveCount(
      initialCount,
    );

    await page.goto(`${route}?tag=Rust`);
    await expect(page.locator("article.project-entry:not([hidden])")).toHaveCount(0);
    await expect(page.locator(".project-list [data-filter-empty]")).toBeVisible();
  });
}

test("project, paper, and profile indexes remain source-faithful", async ({
  page,
}) => {
  await page.goto("/projects/");
  await expect(page.locator(".page-header")).toHaveCount(0);
  const projects = page.locator("article.project-entry");
  await expect(projects).toHaveCount(6);
  for (const project of await projects.all()) {
    const repository = project.locator(":scope > a.project-main");
    await expect(repository).toHaveCount(1);
    await expect(repository).toHaveAttribute(
      "href",
      /^https:\/\/github\.com\/Yiyuiii\//,
    );
    await expect(repository).toHaveAttribute("target", "_blank");
    await expect(repository).toHaveAttribute("rel", "noopener noreferrer");
    const tags = project.locator(".project-tag");
    expect(await tags.count()).toBeGreaterThanOrEqual(1);
    for (const tag of await tags.all()) {
      await expect(tag).toHaveAttribute("href", /^\/projects\/\?tag=.+/);
    }
    await expect(project.locator(".index-meta__tail")).toContainText("★");
    await expect(project.locator(".index-meta__tail")).toContainText("Fork");
    await expect(project.locator("a a")).toHaveCount(0);
  }
  const stars = await projects
    .locator(".index-meta__tail [aria-label^='Star']")
    .evaluateAll((nodes) =>
      nodes.map((node) => Number(node.textContent.replace(/\D/g, ""))),
    );
  expect(stars).toEqual([...stars].sort((left, right) => right - left));
  await expect(page.getByText(/更新\s+20\d\d/)).toHaveCount(0);
  await expect(page.getByText(/20\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ/)).toHaveCount(0);

  await page.goto("/en/projects/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".page-header")).toHaveCount(0);
  const englishProjects = page.locator("article.project-entry");
  await expect(englishProjects).toHaveCount(6);
  for (const project of await englishProjects.all()) {
    for (const tag of await project.locator(".project-tag").all()) {
      await expect(tag).toHaveAttribute("href", /^\/en\/projects\/\?tag=.+/);
    }
  }
  const englishStars = await englishProjects
    .locator(".index-meta__tail [aria-label^='Stars']")
    .evaluateAll((nodes) =>
      nodes.map((node) => Number(node.textContent.replace(/\D/g, ""))),
    );
  expect(englishStars).toEqual(
    [...englishStars].sort((left, right) => right - left),
  );
  await expect(page.getByText(/Updated\s+20\d\d/i)).toHaveCount(0);
  await expect(page.getByText(/20\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ/)).toHaveCount(0);

  await page.goto("/publications/");
  await expect(page.locator(".page-header")).toHaveCount(0);
  await expect(page.locator(".publication-entry")).toHaveCount(8);
  await expect(page.getByText("已发表", { exact: true })).toHaveCount(0);
  await expect(page.getByText("俞俊鹏", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Extended Abstract/i)).toHaveCount(0);
  await expect(
    page.locator("#radar-rl-2023 strong.publication-self"),
  ).toHaveText("Yiyu Chen");
  for (const paperId of ["#hdbo-survey-2025", "#radar-rl-2023"]) {
    const owner = page.locator(`${paperId} .publication-self-entry`);
    await expect(owner.locator(".publication-self")).toHaveText(/陈奕宇|Yiyu Chen/);
    await expect(owner.locator(".publication-contribution")).toHaveText(
      "（共同第一作者）",
    );
    await expect(page.locator(`${paperId} .publication-note`)).toHaveCount(0);
  }
  const zhRecognition = page.locator(
    "#meta-rl-survey-2024 .publication-recognition",
  );
  await expect(zhRecognition).toHaveText("2024年高被关注综述论文");
  await expect(zhRecognition).toHaveAttribute(
    "href",
    "https://mp.weixin.qq.com/s/0c-6egiMkVL0nn7jbSP0Cg",
  );
  await expect(zhRecognition).toHaveAttribute("target", "_blank");
  await expect(zhRecognition).toHaveAttribute("rel", "noopener noreferrer");
  expect(
    await zhRecognition.evaluate((link) => {
      const venue = link.parentElement.querySelector(".index-kicker");
      return Boolean(
        venue &&
          venue.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
  ).toBe(true);

  await page.goto("/en/publications/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".page-header")).toHaveCount(0);
  await expect(page.locator(".publication-entry")).toHaveCount(8);
  await expect(page.getByText(/Extended Abstract/i)).toHaveCount(0);
  await expect(page.locator("strong.publication-self").first()).toHaveText("Yiyu Chen");
  for (const paperId of ["#hdbo-survey-2025", "#radar-rl-2023"]) {
    const owner = page.locator(`${paperId} .publication-self-entry`);
    await expect(owner.locator(".publication-self")).toHaveText("Yiyu Chen");
    await expect(owner.locator(".publication-contribution")).toHaveText(
      "(co-first author)",
    );
    await expect(page.locator(`${paperId} .publication-note`)).toHaveCount(0);
  }
  const enRecognition = page.locator(
    "#meta-rl-survey-2024 .publication-recognition",
  );
  await expect(enRecognition).toHaveText(
    "2024 Top-20 High-Attention Review Paper",
  );
  await expect(enRecognition).toHaveAttribute(
    "href",
    "https://mp.weixin.qq.com/s/0c-6egiMkVL0nn7jbSP0Cg",
  );
  const metadata = await page
    .locator(
      ".publication-entry h2, .publication-authors, .index-meta__lead",
    )
    .allTextContents();
  expect(metadata.some((value) => /[\u3400-\u9fff]/.test(value))).toBe(false);

  await page.goto("/about/");
  await expect(page.locator(".page-header")).toHaveCount(0);
  const greeting = page.getByRole("heading", {
    name: "关于yiyuiii",
    exact: true,
  });
  await expect(greeting).toHaveText("Ciallo～(∠・ω< )⌒★");
  await expect(page.locator("#about-education")).toHaveCount(0);
  await expect(page.locator(".about-section > h2")).toHaveText([
    "个人基调",
    "科研方向",
    "兴趣方向",
    "日常技能",
    "我的链接",
  ]);
  await expect(page.locator("#about-research .about-detail-list > div")).toHaveCount(3);
  await expect(page.locator("#about-interests .about-detail-list > div")).toHaveCount(11);
  await expect(page.locator("#about-skills .about-detail-list > div")).toHaveCount(3);
  await expect(page.getByText("兴趣驱动的复杂系统的拆解者")).toHaveCount(0);
  await expect(page.getByText(/我目前是/)).toHaveCount(0);
  const profileLinks = page.locator(".about-links a");
  await expect(profileLinks).toHaveCount(4);
  await expect(profileLinks).toHaveText(["GitHub", "电子邮件", "RSS", "PayPal"]);
  expect(await profileLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href"))))
    .toEqual([
      "https://github.com/Yiyuiii",
      "mailto:yiyuiii@foxmail.com",
      "/feed.xml",
      "https://paypal.me/yiyuiii",
    ]);

  await page.goto("/en/about/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".page-header")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "About yiyuiii", exact: true }),
  ).toHaveText("Ciallo～(∠・ω< )⌒★");
  await expect(page.locator("#about-education")).toHaveCount(0);
  await expect(page.locator(".about-section > h2")).toHaveText([
    "Personal Tastes",
    "Research Directions",
    "Interests",
    "Everyday Skills",
    "My Links",
  ]);
  await expect(page.locator("#about-interests .about-detail-list > div")).toHaveCount(11);
  await expect(page.locator("#about-skills .about-detail-list > div")).toHaveCount(3);
  await expect(page.getByText(/currently a PhD student/i)).toHaveCount(0);
});

test("publication recognition wraps without horizontal overflow at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });

  for (const [route, label] of [
    ["/publications/", "2024年高被关注综述论文"],
    ["/en/publications/", "2024 Top-20 High-Attention Review Paper"],
  ]) {
    await page.goto(route);
    await expect(
      page.locator("#meta-rl-survey-2024 .publication-recognition"),
    ).toHaveText(label);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    ).toBe(false);
    const contributionOwners = page.locator(
      ".publication-self-entry:has(> .publication-contribution)",
    );
    await expect(contributionOwners).toHaveCount(2);
    expect(
      await contributionOwners.evaluateAll((nodes) =>
        nodes.every((node) => node.getClientRects().length === 1),
      ),
    ).toBe(true);
  }
});

test("article desktop left rail stays sticky and readable while article controls work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(
    "/posts/%E8%A3%85%E6%9C%BA%E8%AE%B0%E5%BD%95/",
  );

  await expect(page.locator(".article-toc")).toHaveCount(0);
  await expect(page.locator(".article-side-toc")).toBeVisible();
  await expect(page.locator(".article-side-toc .toc-h2")).toHaveCount(3);
  await expect(page.locator(".article-side-toc .toc-h3")).toHaveCount(10);
  await expect(page.locator(".article-section-trigger")).toBeHidden();

  const desktopRail = await page.evaluate(() => {
    const rail = document.querySelector(".article-side-toc");
    const article = document.querySelector(".article-column");
    const h2Link = rail.querySelector(".toc-h2 a");
    const h3Link = rail.querySelector(".toc-h3 a");
    const railBox = rail.getBoundingClientRect();
    const articleBox = article.getBoundingClientRect();
    return {
      railPosition: getComputedStyle(rail).position,
      railRight: railBox.right,
      articleLeft: articleBox.left,
      h2FontSize: Number.parseFloat(getComputedStyle(h2Link).fontSize),
      h3FontSize: Number.parseFloat(getComputedStyle(h3Link).fontSize),
      htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
    };
  });
  expect(desktopRail.railPosition).toBe("sticky");
  expect(desktopRail.railRight).toBeLessThan(desktopRail.articleLeft);
  expect(desktopRail.h2FontSize).toBeGreaterThanOrEqual(13.5);
  expect(desktopRail.h3FontSize).toBeGreaterThanOrEqual(12.5);
  expect(desktopRail.htmlOverflowY).toBe("visible");
  expect(desktopRail.bodyOverflowY).toBe("visible");

  const duplicateIds = await page.evaluate(() => {
    const counts = new Map();
    for (const node of document.querySelectorAll("[id]")) {
      counts.set(node.id, (counts.get(node.id) || 0) + 1);
    }
    return [...counts.entries()].filter(([, count]) => count > 1);
  });
  expect(duplicateIds).toEqual([]);

  const headerOrder = await page.evaluate(() => {
    const tags = document.querySelector(".article-tags");
    const history = document.querySelector(".article-history");
    return Boolean(
      tags &&
      history &&
      (tags.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
  });
  expect(headerOrder).toBe(true);

  const history = page.locator(".article-history");
  await expect(history).not.toHaveAttribute("open", "");
  await expect(history.locator("summary")).toContainText("初稿 2022.11.11");
  await expect(history.locator("summary")).toContainText("最近修订 2026.07.30");
  await expect(history.locator("summary")).toContainText("修订历史");
  await expect(history.locator("summary")).not.toContainText("2 条");
  await history.locator("summary").click();
  await expect(history).toHaveAttribute("open", "");
  await expect(history.locator("li")).toHaveCount(3);
  await expect(history.locator("li").last()).toContainText(
    "校正刷新率收益与烤机结温两处表述",
  );

  const evidenceVisual = await page.locator(".article-evidence").first().evaluate(
    (node) => {
      const style = getComputedStyle(node);
      return {
        fontSize: style.fontSize,
        borderWidth: style.borderLeftWidth,
        background: style.backgroundColor,
      };
    },
  );
  expect(evidenceVisual.fontSize).toBe("16px");
  expect(evidenceVisual.borderWidth).toBe("2px");
  expect(evidenceVisual.background).toBe("rgba(0, 0, 0, 0)");

  const firstSubsection = page.locator(".article-side-toc .toc-h3 a").first();
  const stickyTop = await page.evaluate(() =>
    Math.round(
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize) *
        1.5,
    ),
  );
  await firstSubsection.click();
  await expect(firstSubsection).toHaveAttribute("aria-current", "location");
  await expect
    .poll(() =>
      page
        .locator(".article-side-toc")
        .evaluate((node) => Math.round(node.getBoundingClientRect().top)),
    )
    .toBe(stickyTop);
  await expect(
    page.locator(
      '.article-section-dialog .toc-h3 a[aria-current="location"]',
    ),
  ).toHaveCount(1);

  const readingWidth = await page.locator(".post-content").evaluate((node) => {
    const box = node.getBoundingClientRect();
    return {
      width: box.width,
      centerDelta: Math.abs(box.left + box.width / 2 - innerWidth / 2),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(readingWidth.width).toBeGreaterThan(570);
  expect(readingWidth.centerDelta).toBeLessThanOrEqual(1);
  expect(readingWidth.overflow).toBe(false);
});

for (const viewport of viewports) {
  test(`article typography stays consistent at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(
      "/posts/%E5%A4%A7%E5%88%9B%E9%80%A0%E6%97%B6%E4%BB%A3-%E8%B5%84%E6%BA%90-%E5%88%86%E5%80%BC%E9%87%8F%E5%8C%96%E8%AE%A1%E7%AE%97%E6%80%9D%E8%B7%AF/",
    );

    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator(".post-content h1")).toHaveCount(0);

    const typography = await page.evaluate(() => {
      const content = document.querySelector(".post-content");
      const title = document.querySelector(".article-header h1");
      const h2 = content.querySelector("h2");
      const h3 = content.querySelector("h3");
      const h4 = content.querySelector("h4");
      const inlineCode = content.querySelector(":not(pre) > code");
      const pre = content.querySelector("pre");
      const blockCode = pre.querySelector("code");
      const image = content.querySelector("img");
      const time = document.querySelector(".article-meta time");
      const headings = [...content.querySelectorAll("h2, h3, h4")].map(
        (heading) => Number(heading.tagName.slice(1)),
      );
      return {
        bodySize: Number.parseFloat(getComputedStyle(content).fontSize),
        titleSize: Number.parseFloat(getComputedStyle(title).fontSize),
        h2Size: Number.parseFloat(getComputedStyle(h2).fontSize),
        h3Size: Number.parseFloat(getComputedStyle(h3).fontSize),
        h4Size: Number.parseFloat(getComputedStyle(h4).fontSize),
        inlineCodeSize: Number.parseFloat(getComputedStyle(inlineCode).fontSize),
        preSize: Number.parseFloat(getComputedStyle(pre).fontSize),
        preColor: getComputedStyle(pre).color,
        blockCodeColor: getComputedStyle(blockCode).color,
        blockCodeBackground: getComputedStyle(blockCode).backgroundColor,
        imageRadius: Number.parseFloat(getComputedStyle(image).borderRadius),
        dateVariant: getComputedStyle(time).fontVariantNumeric,
        headings,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });

    expect(typography.bodySize).toBe(17);
    expect(typography.titleSize).toBeGreaterThanOrEqual(28.7);
    expect(typography.titleSize).toBeLessThanOrEqual(38.5);
    expect(typography.h2Size).toBeGreaterThanOrEqual(22.3);
    expect(typography.h2Size).toBeLessThanOrEqual(24.9);
    expect(typography.h3Size).toBeCloseTo(20.4, 1);
    expect(typography.h4Size).toBeCloseTo(17.6, 1);
    expect(typography.inlineCodeSize).toBeGreaterThanOrEqual(14.5);
    expect(typography.preSize).toBeGreaterThanOrEqual(13.4);
    expect(typography.blockCodeColor).toBe(typography.preColor);
    expect(typography.blockCodeBackground).toBe("rgba(0, 0, 0, 0)");
    expect(typography.imageRadius).toBeGreaterThanOrEqual(6);
    expect(typography.dateVariant).toContain("tabular-nums");
    expect(typography.headings[0]).toBe(2);
    expect(
      typography.headings.every(
        (level, index, headings) => index === 0 || level <= headings[index - 1] + 1,
      ),
    ).toBe(true);
    expect(typography.overflow).toBe(false);
  });
}

test("legacy duplicate-title fragment remains addressable without a second h1", async ({
  page,
}) => {
  await page.goto(
    "/posts/build-a-personal-github-page/#building-a-personal-github-page",
  );

  await expect(page.locator("main h1")).toHaveCount(1);
  await expect(page.locator(".post-content h1")).toHaveCount(0);
  await expect(page.locator("#building-a-personal-github-page")).toHaveCount(1);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 800 },
]) {
  test(`article mobile sections dialog works at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(
      "/posts/%E8%A3%85%E6%9C%BA%E8%AE%B0%E5%BD%95/",
    );

    await expect(page.locator(".article-side-toc")).toBeHidden();
    const trigger = page.locator("[data-article-section-trigger]");
    const dialog = page.locator("[data-article-section-dialog]");
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(dialog).toHaveAttribute("open", "");
    await expect(dialog.locator(".toc-h2")).toHaveCount(3);
    await expect(dialog.locator(".toc-h3")).toHaveCount(10);

    await page.keyboard.press("Escape");
    await expect(dialog).not.toHaveAttribute("open", "");
    await expect(trigger).toBeFocused();

    await trigger.click();
    const subsection = dialog.locator(".toc-h3 a").first();
    const targetId = await subsection.getAttribute("href");
    await subsection.click();
    await expect(dialog).not.toHaveAttribute("open", "");
    expect(
      await page.evaluate((hash) => {
        const target = document.getElementById(
          decodeURIComponent(hash.slice(1)),
        );
        return target === document.activeElement;
      }, targetId),
    ).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    ).toBe(false);
  });
}

test("search, fallback language switch, and article reading controls work", async ({
  page,
}) => {
  // This path verifies the real pinned MathJax CDN integration, so allow the
  // browser more time than the default interaction-only tests.
  test.slow();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  const searchButton = page.getByRole("button", { name: "搜索" });
  await searchButton.click();
  const input = page.getByRole("searchbox", { name: "搜索本站" });
  await expect(input).toBeFocused();
  await input.fill("游泳");
  await expect(page.locator("#search-results a")).toHaveCount(1);
  await input.press("Enter");
  await expect(page).toHaveURL(/\/posts\/.+\/$/);

  await expect(page.locator(".article-toc")).toHaveCount(0);
  await expect(page.locator(".article-history summary")).toContainText("初稿");
  await expect(page.locator(".article-history summary")).toContainText("修订历史");

  await page.waitForFunction(
    () => document.querySelectorAll("mjx-container").length > 0,
  );
  expect(await page.locator("mjx-container").count()).toBeGreaterThan(0);
  expect(await page.locator("body").innerText()).not.toContain("H_2O");
  expect(
    await page.evaluate(() => ({
      helper: typeof window.determineComputedTheme,
      theme: window.determineComputedTheme?.(),
    })),
  ).toEqual({ helper: "function", theme: "light" });

  const languageSwitch = page.getByRole("link", { name: "切换为英文" });
  await expect(languageSwitch).toHaveAttribute(
    "href",
    "/en/?missing_translation=1",
  );
  await languageSwitch.click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".translation-notice")).toBeVisible();

  await page.goto("/");
  await searchButton.click();
  await input.press("Escape");
  await expect(searchButton).toBeFocused();
  expect(errors).toEqual([]);
});

test("missing pages keep real 404 semantics and the requested language", async ({
  page,
}) => {
  let response = await page.goto("/en/not-real");
  expect(response?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "页面不存在" })).toBeHidden();
  await expect(page.getByRole("link", { name: "Back to writing" })).toHaveAttribute(
    "href",
    "/en/",
  );

  response = await page.goto("/not-real");
  expect(response?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await expect(page.getByRole("heading", { name: "页面不存在" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeHidden();
  await expect(page.getByRole("link", { name: "返回随笔" })).toHaveAttribute(
    "href",
    "/",
  );
});

test("the retirement worker removes old caches and unregisters itself", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const cache = await caches.open("legacy-site-test");
    await cache.put("/legacy-test", new Response("old"));
    await navigator.serviceWorker.register("/sw.js");
  });

  await expect
    .poll(() =>
      page.evaluate(async () => ({
        cacheKeys: await caches.keys(),
        registration: Boolean(
          await navigator.serviceWorker.getRegistration("/"),
        ),
      })),
    )
    .toEqual({ cacheKeys: [], registration: false });
});

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

const createStubbedRandomContext = async (browser, samples) => {
  const context = await browser.newContext({
    baseURL: process.env.SITE_URL || "http://localhost:62091",
  });
  await context.addInitScript((stubbedSamples) => {
    const nativeGetRandomValues = Crypto.prototype.getRandomValues;
    let nextSample = Number.parseInt(window.name, 10);
    if (!Number.isInteger(nextSample) || nextSample < 0) nextSample = 0;
    Object.defineProperty(Crypto.prototype, "getRandomValues", {
      configurable: true,
      value(array) {
        if (array instanceof Uint32Array && array.length === 1) {
          const sample = stubbedSamples[Math.min(nextSample, stubbedSamples.length - 1)];
          array[0] = sample;
          nextSample += 1;
          window.name = String(nextSample);
          globalThis.__cryptoDrawCount = nextSample;
          return array;
        }
        return nativeGetRandomValues.call(this, array);
      },
    });
  }, samples);
  return context;
};

for (const viewport of viewports) {
  test(`welcome pages stay readable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const [route, heading, introduction, pickLabel, recentLabel] of [
      [
        "/",
        "你好 👋",
        "这里是我的博客，记录随笔、项目、论文和一些好玩的东西。",
        "随机发现",
        "最近更新",
      ],
      [
        "/en/",
        "Hello 👋",
        "This is my blog—a place for writing, projects, papers, and a few things I make for fun.",
        "Random discovery",
        "Recent updates",
      ],
    ]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.locator(".home-welcome__introduction")).toHaveText(introduction);
      await expect(page.locator(".home-guide li")).toHaveCount(5);
      await expect(page.getByRole("heading", { level: 2, name: pickLabel })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: recentLabel })).toBeVisible();
      await expect(page.locator("[data-rotation-live-note]")).toHaveCount(0);
      expect(
        await page.locator(".home-section__heading").evaluateAll(
          (headings) => headings.every((node) => (
            getComputedStyle(node).borderBottomStyle === "none"
            || getComputedStyle(node).borderBottomWidth === "0px"
          )),
        ),
      ).toBe(true);
      await expect(page.locator("[data-home-recent] > .home-feed-item")).toHaveCount(8);
      await expect(page.locator(".home-guide-arrows")).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      ).toBe(false);
      expect(
        await page.locator("[data-home-recent] > .home-feed-item").evaluateAll(
          (items) => items.every((item) => (
            item.querySelector("h3")?.textContent.trim()
            && item.querySelector("[data-home-summary]")?.textContent.trim()
          )),
        ),
      ).toBe(true);
      await expect(page.locator("script[src*='mathjax'], script[src*='al_math']")).toHaveCount(0);
    }
  });
}

test("random discovery draws independently within eligible candidates", async ({
  browser,
}) => {
  const identities = [];
  for (const [route, sample] of [["/", 0], ["/en/", 1]]) {
    const context = await createStubbedRandomContext(browser, [sample]);
    const page = await context.newPage();
    await page.goto(route);
    const card = page.locator("[data-home-rotation] [data-home-feed-item]");
    await expect(page.locator("[data-rotation-live-title]")).toBeVisible();
    await expect(page.locator("[data-rotation-fallback-title]")).toBeHidden();
    const identity = await card.getAttribute("data-stable-id");
    const candidates = await page.locator("#home-rotation-data").evaluate(
      (element) => JSON.parse(element.textContent || "[]").map((item) => item.id),
    );
    const recent = await page.locator("[data-home-recent] > [data-stable-id]").evaluateAll(
      (items) => items.map((item) => item.dataset.stableId),
    );
    const eligible = candidates.filter((candidate) => !recent.includes(candidate));
    expect(identity).toBe(eligible[sample]);
    expect(recent).not.toContain(identity);
    identities.push(identity);
    await context.close();
  }
  expect(identities[0]).not.toBe(identities[1]);
});

test("random discovery redraws on reload and BFCache restoration", async ({
  browser,
}) => {
  const context = await createStubbedRandomContext(browser, [0, 1, 2]);
  const page = await context.newPage();
  await page.goto("/");
  const card = page.locator("[data-home-rotation] [data-home-feed-item]");
  const candidates = await page.locator("#home-rotation-data").evaluate(
    (element) => JSON.parse(element.textContent || "[]").map((item) => item.id),
  );
  const recent = await page.locator("[data-home-recent] > [data-stable-id]").evaluateAll(
    (items) => items.map((item) => item.dataset.stableId),
  );
  const eligible = candidates.filter((candidate) => !recent.includes(candidate));

  await expect(card).toHaveAttribute("data-stable-id", eligible[0]);
  await page.reload();
  await expect(card).toHaveAttribute("data-stable-id", eligible[1]);
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  });
  await expect(card).toHaveAttribute("data-stable-id", eligible[2]);
  await context.close();
});

test("random discovery rejects the biased uint32 tail before taking modulo", async ({
  browser,
}) => {
  const context = await createStubbedRandomContext(browser, [0xffffffff, 0]);
  const page = await context.newPage();
  await page.goto("/");
  const candidates = await page.locator("#home-rotation-data").evaluate(
    (element) => JSON.parse(element.textContent || "[]").map((item) => item.id),
  );
  const recent = await page.locator("[data-home-recent] > [data-stable-id]").evaluateAll(
    (items) => items.map((item) => item.dataset.stableId),
  );
  const eligible = candidates.filter((candidate) => !recent.includes(candidate));
  expect(0x1_0000_0000 % eligible.length).not.toBe(0);
  await expect(page.locator("[data-home-rotation] [data-home-feed-item]")).toHaveAttribute(
    "data-stable-id",
    eligible[0],
  );
  expect(await page.evaluate(() => globalThis.__cryptoDrawCount)).toBe(2);
  await context.close();
});

test("random discovery quietly keeps the browsing fallback when crypto fails", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: process.env.SITE_URL || "http://localhost:62091",
  });
  await context.addInitScript(() => {
    Object.defineProperty(Crypto.prototype, "getRandomValues", {
      configurable: true,
      value() {
        throw new Error("stubbed random source failure");
      },
    });
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await expect(page.locator("[data-rotation-fallback-title]")).toBeVisible();
  await expect(page.locator("[data-rotation-live-title]")).toBeHidden();
  expect(pageErrors).toEqual([]);
  await context.close();
});

test("legacy root tag query preserves its complete query and hash", async ({ page }) => {
  await page.goto("/?tag=%E6%A1%8C%E6%B8%B8&via=legacy#old-filter");
  await expect(page).toHaveURL(
    /\/writing\/\?tag=%E6%A1%8C%E6%B8%B8&via=legacy#old-filter$/,
  );
  await expect(page.locator(".writing-entry:not([hidden])")).not.toHaveCount(0);
});

test("welcome page has a complete no-JavaScript fallback", async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: process.env.SITE_URL || "http://localhost:62091",
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("[data-rotation-fallback-title]")).toBeVisible();
  await expect(page.locator("[data-rotation-live-title]")).toBeHidden();
  await expect(page.locator(".home-noscript a")).toHaveAttribute("href", "/writing/");
  await expect(page.locator("[data-home-recent] > .home-feed-item")).toHaveCount(8);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  ).toBe(false);
  await context.close();
});

test("welcome page never requests an original post cover", async ({ page }) => {
  const originalCoverRequests = [];
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (
      pathname.startsWith("/assets/posts/")
      && /\.(?:webp|png|jpe?g)$/i.test(pathname)
      && !/-index-v1-(?:160|320)\.webp$/i.test(pathname)
    ) {
      originalCoverRequests.push(pathname);
    }
  });
  await page.goto("/");
  await page.locator("[data-home-recent]").scrollIntoViewIfNeeded();
  expect(originalCoverRequests).toEqual([]);
});

for (const viewport of viewports) {
  test(`writing index adapts at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/writing/");

    await expect(page.locator(".site-nav a")).toHaveCount(6);
    await expect(page.locator(".site-nav a")).toHaveText([
      "欢迎",
      "随笔",
      "GitHub",
      "论文",
      "小玩意",
      "关于yiyuiii",
    ]);
    await expect(
      page.locator('.site-nav a[aria-current="page"]'),
    ).toHaveAttribute("href", "/writing/");
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

test("localized toy indexes expose only live lightweight interactions", async ({
  page,
}) => {
  const toyExternalRequests = [];
  page.on("request", (request) => {
    if ([
      "zh.moegirl.org.cn",
      "zh.wikipedia.org",
      "en.wikipedia.org",
      "openaccess-api.clevelandart.org",
      "openaccess-cdn.clevelandart.org",
      "graphql.anilist.co",
    ].includes(new URL(request.url()).hostname)) {
      toyExternalRequests.push(request.url());
    }
  });
  for (const [route, heading, groupHeadings, defaultQuizSource] of [
    ["/toys/", "小玩意", ["开放数据", "轻松挑战", "逻辑谜题", "随机生成"], "moegirl_zh"],
    ["/en/toys/", "Toys", ["Open data", "Quick challenges", "Logic puzzles", "Random generators"], "wikipedia_en"],
  ]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await expect(page.locator(".page-header")).toHaveCount(0);
    const pageTitle = page.locator(".toy-index__header > h1.sr-only");
    await expect(pageTitle).toHaveText(heading);
    expect(
      await pageTitle.evaluate((node) => {
        const style = getComputedStyle(node);
        const box = node.getBoundingClientRect();
        return style.position === "absolute" && box.width <= 1 && box.height <= 1;
      }),
    ).toBe(true);
    await expect(page.locator(".toy-group__title")).toHaveText(groupHeadings);
    const disclosures = page.locator(".toy-group__items > details.toy-entry");
    await expect(disclosures).toHaveCount(11);
    expect(await disclosures.evaluateAll((items) => items.map((item) => item.id))).toEqual([
      "moegirl-quiz",
      "art-glimpse",
      "anilist-role-quiz",
      "color-challenge",
      "ten-second",
      "reaction-time",
      "codebreaker",
      "make-24",
      "lights-out",
      "random-password",
      "random-number",
    ]);
    expect(
      await disclosures.evaluateAll((items) => {
        const boxes = items.map((item) => item.getBoundingClientRect());
        return boxes.every((box, index) => index === 0 || box.top > boxes[index - 1].top);
      }),
    ).toBe(true);
    await expect(page.locator(".toy-grid, .toy-card")).toHaveCount(0);
    expect(await disclosures.evaluateAll((items) => items.every((item) => !item.open))).toBe(true);
    await expect(page.locator(".encyclopedia-quiz[data-encyclopedia-quiz]")).toHaveCount(1);
    await expect(page.locator(".art-glimpse[data-art-glimpse]")).toHaveCount(1);
    await expect(page.locator(".acg-relation-quiz[data-acg-relation-quiz]")).toHaveCount(1);
    await expect(page.locator(".encyclopedia-quiz img")).toHaveCount(0);
    await expect(page.locator("[data-quiz-source-select] option")).toHaveCount(2);
    await expect(page.locator("[data-quiz-source-select]")).toHaveValue(defaultQuizSource);
    await expect(page.locator("[data-quiz-clue]")).toBeHidden();
    await expect(page.locator("script[src*='mathjax'], script[src*='al_math']")).toHaveCount(0);
    expect(toyExternalRequests).toEqual([]);
    const quizResourceHints = page.locator(
      'link[rel="preconnect"][href*="moegirl.org.cn"], '
      + 'link[rel="dns-prefetch"][href*="moegirl.org.cn"], '
      + 'link[rel="prefetch"][href*="moegirl.org.cn"], '
      + 'link[rel="preconnect"][href*="wikipedia.org"], '
      + 'link[rel="dns-prefetch"][href*="wikipedia.org"], '
      + 'link[rel="prefetch"][href*="wikipedia.org"], '
      + 'link[rel="preconnect"][href*="clevelandart.org"], '
      + 'link[rel="dns-prefetch"][href*="clevelandart.org"], '
      + 'link[rel="prefetch"][href*="clevelandart.org"], '
      + 'link[rel="preconnect"][href*="anilist.co"], '
      + 'link[rel="dns-prefetch"][href*="anilist.co"], '
      + 'link[rel="prefetch"][href*="anilist.co"]',
    );
    await expect(quizResourceHints).toHaveCount(0);
    await expect(
      page.locator('.site-nav a[aria-current="page"]'),
    ).toHaveAttribute("href", route);

    await page.evaluate(() => {
      window.location.hash = "random-password";
    });
    await expect(page.locator("#random-password")).toHaveAttribute("open", "");

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    ).toBe(false);
  }
});

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 800 },
]) {
  test(`encyclopedia quiz source controls and legacy hash fit at ${viewport.width}px`, async ({
    page,
  }) => {
    const externalRequests = [];
    page.on("request", (request) => {
      if ([
        "zh.moegirl.org.cn",
        "zh.wikipedia.org",
        "en.wikipedia.org",
      ].includes(new URL(request.url()).hostname)) externalRequests.push(request.url());
    });
    await page.setViewportSize(viewport);
    await page.goto("/toys/#moegirl-quiz");

    await expect(page.locator("#moegirl-quiz")).toHaveAttribute("open", "");
    await expect(page.getByText("百科条目猜猜", { exact: true })).toBeVisible();
    await expect(page.getByLabel("题目来源")).toHaveValue("moegirl_zh");
    await page.getByLabel("题目来源").selectOption("wikipedia_zh");
    await expect(page.locator("[data-quiz-privacy]")).toContainText("中文维基百科");
    expect(externalRequests).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    ).toBe(false);
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

  await page.goto("/writing/");

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
        "灵魂基调",
        "科研方向",
        "兴趣方向",
        "日常技能",
        "我的链接",
      ],
    },
    {
      route: "/en/about/",
      headings: [
        "Core Traits",
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
      await expect(page.locator(".about-links ul a")).toHaveCount(4);
      await expect(page.locator("#about-intro-donation")).toHaveCSS(
        "font-style",
        "italic",
      );
      const linkSectionOrder = await page.locator("#about-links").evaluate(
        (section) => [...section.children].map(
          (child) => child.id || child.tagName.toLowerCase(),
        ),
      );
      expect(linkSectionOrder).toEqual([
        "about-links-heading",
        "about-intro",
        "ul",
      ]);

      const widthContract = await page.evaluate(() => {
        const selectors = {
          profile: ".about-profile",
          prose: "#about-aesthetics .about-prose__body",
          heading: "#about-research > h2",
          details: "#about-research .about-detail-list",
          intro: "#about-links > #about-intro",
          links: "#about-links > ul",
        };
        return Object.fromEntries(
          Object.entries(selectors).map(([name, selector]) => [
            name,
            document.querySelector(selector).getBoundingClientRect().width,
          ]),
        );
      });
      expect(
        Math.max(...Object.values(widthContract)) -
          Math.min(...Object.values(widthContract)),
      ).toBeLessThanOrEqual(1);
      if (viewport.width === 1280) {
        expect(widthContract.profile).toBeGreaterThanOrEqual(831);
        expect(widthContract.profile).toBeLessThanOrEqual(833);
      }

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

      const paypal = page.locator(".about-links ul a").last();
      await paypal.scrollIntoViewIfNeeded();
      await expect(paypal).toBeVisible();
      const accessibleNames = [
        "GitHub",
        profile.route.startsWith("/en/") ? "Email" : "电子邮件",
        "RSS",
        "PayPal",
      ];
      for (const [index, name] of accessibleNames.entries()) {
        await expect(page.locator(".about-links ul a").nth(index)).toHaveAccessibleName(
          name,
        );
      }
    });
  }
}

test("light appearance and readable type remain stable", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/writing/");
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
  await page.goto("/writing/");
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

test("project and paper indexes remain source-faithful", async ({
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
});

test("bilingual profile pages remain source-faithful", async ({ page }) => {
  await page.goto("/about/");
  await expect(page.locator(".page-header")).toHaveCount(0);
  const greeting = page.getByRole("heading", {
    name: "关于yiyuiii",
    exact: true,
  });
  await expect(greeting).toHaveText("Ciallo～(∠・ω< )⌒★");
  await expect(page.locator("#about-education")).toHaveCount(0);
  await expect(page.locator(".about-section > h2")).toHaveText([
    "灵魂基调",
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
  await expect(page.locator("#about-links > h2 + #about-intro + ul")).toHaveCount(1);
  await expect(page.locator("#about-intro-donation")).toHaveText(
    "如果你喜欢我的文章，我很高兴收到一点点 PayPal 赞助，这会让我非常开心 (∠・ω< )⌒★",
  );
  await expect(page.locator("#about-intro-donation")).toHaveCSS("font-style", "italic");
  await expect(page.locator("#about-intro-contact")).toHaveText(
    "欢迎通过电子邮件联系我：yiyuiii@foxmail.com。",
  );
  const profileLinks = page.locator(".about-links ul a");
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
    "Core Traits",
    "Research Directions",
    "Interests",
    "Everyday Skills",
    "My Links",
  ]);
  await expect(page.locator("#about-interests .about-detail-list > div")).toHaveCount(11);
  await expect(page.locator("#about-skills .about-detail-list > div")).toHaveCount(3);
  await expect(page.getByText(/currently a PhD student/i)).toHaveCount(0);
  await expect(page.locator("#about-links > h2 + #about-intro + ul")).toHaveCount(1);
  await expect(page.locator("#about-intro-donation")).toHaveCSS("font-style", "italic");
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

test("article desktop left rail stays sticky through comments without crossing page boundaries", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1536, height: 900 });
  await page.goto(
    "/posts/%E8%A3%85%E6%9C%BA%E8%AE%B0%E5%BD%95/",
  );

  await expect(page.locator(".article-toc")).toHaveCount(0);
  await expect(page.locator(".article-side-toc")).toBeVisible();
  await expect(page.locator(".article-side-toc .toc-h2")).toHaveCount(3);
  await expect(page.locator(".article-side-toc .toc-h3")).toHaveCount(10);
  await expect(page.locator(".article-inline-toc")).toBeHidden();

  const desktopRail = await page.evaluate(() => {
    const rail = document.querySelector(".article-side-toc");
    const article = document.querySelector(".article-column");
    const h2Link = rail.querySelector(".toc-h2 a");
    const h3Link = rail.querySelector(".toc-h3 a");
    const railBox = rail.getBoundingClientRect();
    const articleBox = article.getBoundingClientRect();
    return {
      railPosition: getComputedStyle(rail).position,
      railTop: railBox.top,
      railRight: railBox.right,
      articleLeft: articleBox.left,
      headerBottom: document
        .querySelector(".site-header")
        .getBoundingClientRect().bottom,
      commentsShareShell:
        document.querySelector("[data-page-comments]")?.parentElement ===
        document.querySelector(".article-shell"),
      h2FontSize: Number.parseFloat(getComputedStyle(h2Link).fontSize),
      h3FontSize: Number.parseFloat(getComputedStyle(h3Link).fontSize),
      htmlOverflowY: getComputedStyle(document.documentElement).overflowY,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
    };
  });
  expect(desktopRail.railPosition).toBe("sticky");
  expect(desktopRail.railTop).toBeGreaterThanOrEqual(desktopRail.headerBottom);
  expect(desktopRail.railRight).toBeLessThan(desktopRail.articleLeft);
  expect(desktopRail.commentsShareShell).toBe(true);
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
  const fixedTop = await page.evaluate(() =>
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
    .toBe(fixedTop);
  await expect(
    page.locator(
      '.article-inline-toc .toc-h3 a[aria-current="location"]',
    ),
  ).toHaveCount(1);

  const readingWidth = await page.locator(".post-content").evaluate((node) => {
    const box = node.getBoundingClientRect();
    const columnBox = node.closest(".article-column").getBoundingClientRect();
    return {
      width: box.width,
      centerDelta: Math.abs(
        box.left + box.width / 2 - (columnBox.left + columnBox.width / 2)
      ),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(readingWidth.width).toBeGreaterThanOrEqual(1150);
  expect(readingWidth.centerDelta).toBeLessThanOrEqual(1);
  expect(readingWidth.overflow).toBe(false);

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
      page
        .locator(".article-side-toc")
        .evaluate((node) => Math.round(node.getBoundingClientRect().top)),
    )
    .toBe(fixedTop);
  await expect(page.locator(".article-side-toc")).toBeVisible();

  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  const pageBoundary = await page.evaluate(() => {
    const rail = document
      .querySelector(".article-side-toc")
      .getBoundingClientRect();
    const footer = document.querySelector(".site-footer").getBoundingClientRect();
    return { railBottom: rail.bottom, footerTop: footer.top };
  });
  expect(pageBoundary.railBottom).toBeLessThanOrEqual(pageBoundary.footerTop + 1);
});

test("Chinese figure captions use upright hierarchy while English captions keep their language style", async ({
  page,
}) => {
  await page.goto("/posts/SETI%E6%A1%8C%E6%B8%B8%E8%A7%84%E5%88%99-%E4%BB%8E%E6%91%86%E6%A1%8C%E5%88%B0%E5%AE%8C%E6%88%90%E7%AC%AC%E4%B8%80%E5%B1%80/");

  const chineseCaption = page
    .locator(".post-content > p")
    .filter({ hasText: "图：一桌游戏的全景。" })
    .first();
  await expect(chineseCaption).toBeVisible();
  await expect(chineseCaption.locator(":scope > em")).toHaveCount(1);
  const chineseStyle = await chineseCaption.evaluate((node) => {
    const style = getComputedStyle(node);
    const emphasisStyle = getComputedStyle(node.firstElementChild);
    const bodyStyle = getComputedStyle(node.closest(".post-content"));
    return {
      fontStyle: emphasisStyle.fontStyle,
      fontSize: Number.parseFloat(style.fontSize),
      bodyFontSize: Number.parseFloat(bodyStyle.fontSize),
      textIndent: style.textIndent,
      color: style.color,
      bodyColor: bodyStyle.color,
    };
  });
  expect(chineseStyle.fontStyle).toBe("normal");
  expect(chineseStyle.fontSize).toBeLessThan(chineseStyle.bodyFontSize);
  expect(chineseStyle.textIndent).toBe("0px");
  expect(chineseStyle.color).not.toBe(chineseStyle.bodyColor);
  await expect(page.locator(".article-cover__caption")).toHaveCSS("font-style", "normal");

  await page.goto("/en/posts/learning-seti-board-game/");
  const englishCaption = page
    .locator(".post-content > p")
    .filter({ hasText: "Figure: A complete game at a glance." })
    .first();
  await expect(englishCaption).toBeVisible();
  await expect(englishCaption.locator(":scope > em")).toHaveCSS("font-style", "italic");
});

for (const viewport of viewports) {
  for (const article of [
    {
      route: "/posts/%E8%A3%85%E6%9C%BA%E8%AE%B0%E5%BD%95/",
      alt: "工作台上正在组装的台式电脑",
    },
    {
      route: "/en/posts/pc-build-log/",
      alt: "A desktop PC being assembled on a workbench",
    },
  ]) {
    test(`formal article cover ${article.route} stays complete at ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(article.route);

      const figure = page.locator(".article-cover");
      const cover = figure.locator(".article-cover__image");
      await expect(figure).toHaveCount(1);
      await expect(cover).toHaveAttribute("alt", article.alt);
      await expect(cover).toHaveJSProperty("complete", true);
      await expect(figure.locator("figcaption p")).toHaveCount(1);
      await expect(page.locator(".post-content .article-cover")).toHaveCount(0);

      const geometry = await page.evaluate(() => {
        const figureNode = document.querySelector(".article-cover");
        const image = figureNode.querySelector("img");
        const content = document.querySelector(".post-content");
        const box = image.getBoundingClientRect();
        const figureBox = figureNode.getBoundingClientRect();
        const contentBox = content.getBoundingClientRect();
        return {
          width: box.width,
          height: box.height,
          figureWidth: figureBox.width,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          objectFit: getComputedStyle(image).objectFit,
          maxHeight: getComputedStyle(image).maxHeight,
          contentTop: contentBox.top,
          coverBottom: box.bottom,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });

      expect(geometry.naturalWidth).toBeGreaterThan(0);
      expect(geometry.naturalHeight).toBeGreaterThan(0);
      expect(geometry.height).toBeLessThanOrEqual(416.5);
      expect(geometry.objectFit).toBe("contain");
      expect(geometry.maxHeight).toBe("416px");
      expect(geometry.width / geometry.height).toBeCloseTo(
        geometry.naturalWidth / geometry.naturalHeight,
        2,
      );
      expect(geometry.contentTop).toBeGreaterThan(geometry.coverBottom);
      expect(geometry.contentTop).toBeLessThan(viewport.height);
      expect(geometry.overflow).toBe(false);
      if (viewport.width <= 390) {
        expect(Math.abs(geometry.width - geometry.figureWidth)).toBeLessThanOrEqual(1);
      }
    });
  }
}

for (const viewport of viewports) {
  for (const route of [
    "/posts/%E5%9B%9B%E5%AD%A3%E7%89%A9%E8%AF%AD%E9%87%8F%E5%8C%96%E5%88%86%E6%9E%90%E6%94%BB%E7%95%A5/",
    "/en/posts/quantitative-strategy-guide-to-seasons/",
  ]) {
    test(`ordinary article images are never cover-capped on ${route} at ${viewport.width}px`, async ({
      page,
    }) => {
      // This unusually long article can need more than the default timeout when
      // Chromium reaches it late in the full single-worker regression.
      test.slow();
      await page.setViewportSize(viewport);
      await page.goto(route, { waitUntil: "domcontentloaded" });

      const bodyImage = page.locator('.post-content img[src$="/bigcards.jpg"]');
      await bodyImage.scrollIntoViewIfNeeded();
      await expect(bodyImage).toBeVisible();
      const geometry = await bodyImage.evaluate((image) => {
        const box = image.getBoundingClientRect();
        return {
          width: box.width,
          height: box.height,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          maxHeight: getComputedStyle(image).maxHeight,
          borderRadius: Number.parseFloat(getComputedStyle(image).borderRadius),
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });

      expect(geometry.maxHeight).toBe("none");
      expect(geometry.width / geometry.height).toBeCloseTo(
        geometry.naturalWidth / geometry.naturalHeight,
        2,
      );
      expect(geometry.borderRadius).toBeGreaterThanOrEqual(6);
      expect(geometry.overflow).toBe(false);
      if (viewport.width === 1280) expect(geometry.height).toBeGreaterThan(416);
    });
  }
}

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
  test(`article inline sections disclosure works at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(
      "/posts/%E8%A3%85%E6%9C%BA%E8%AE%B0%E5%BD%95/",
    );

    await expect(page.locator(".article-side-toc")).toBeHidden();
    const disclosure = page.locator(".article-inline-toc");
    const summary = disclosure.locator("summary");
    await expect(disclosure).toBeVisible();
    await expect(disclosure).not.toHaveAttribute("open", "");
    await summary.click();
    await expect(disclosure).toHaveAttribute("open", "");
    await expect(disclosure.locator(".toc-h2")).toHaveCount(3);
    await expect(disclosure.locator(".toc-h3")).toHaveCount(10);

    const subsection = disclosure.locator(".toc-h3 a").first();
    const targetId = await subsection.getAttribute("href");
    await subsection.click();
    await expect(disclosure).not.toHaveAttribute("open", "");
    await expect.poll(() => page.evaluate((hash) => {
      const target = document.getElementById(
        decodeURIComponent(hash.slice(1)),
      );
      return target === document.activeElement;
    }, targetId)).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    ).toBe(false);
  });
}

test("search, paired language switch, and article reading controls work", async ({
  page,
}) => {
  // This path verifies a formula page plus several interactions, so allow the
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
    "/en/posts/understanding-swimming/",
  );
  await languageSwitch.click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { level: 1, name: "Understanding Swimming" }),
  ).toBeVisible();
  await expect(page.locator(".translation-notice")).toHaveCount(0);

  await page.goto("/");
  await searchButton.click();
  await input.fill("随机密码");
  await expect(page.locator("#search-results a")).toHaveCount(1);
  await expect(page.locator("#search-results a")).toHaveAttribute(
    "href",
    "/toys/#random-password",
  );
  await input.fill("萌娘百科");
  await expect(page.locator("#search-results a")).toHaveCount(1);
  await expect(page.locator("#search-results a")).toHaveAttribute(
    "href",
    "/toys/#moegirl-quiz",
  );
  for (const query of ["百科", "Wikipedia", "维基百科"]) {
    await input.fill(query);
    await expect(page.locator("#search-results a")).toHaveCount(1);
    await expect(page.locator("#search-results a")).toHaveAttribute(
      "href",
      "/toys/#moegirl-quiz",
    );
  }
  await input.fill("");
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

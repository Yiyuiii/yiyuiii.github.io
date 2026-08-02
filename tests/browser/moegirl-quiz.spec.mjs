import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const scriptPath = fileURLToPath(
  new URL("../../assets/js/moegirl-quiz.js", import.meta.url),
);

const pool = [
  "初音未来",
  "洛天依",
  "博丽灵梦",
  "雾雨魔理沙",
  "御坂美琴",
  "鹿目圆",
];

const copy = {
  zh: {
    start: "开始一题",
    again: "再来一题",
    retry: "重试",
    loading: "正在向萌娘百科请求本题图像……",
    correct: "答对了！这是 {title}。",
    incorrect: "没猜中；答案是 {title}。",
    network_error: "暂时没能取得题图，请稍后重试。",
    no_image_error: "这组选项暂时没有可用题图，请再试一次。",
    image_error: "题图加载失败，请再试一次。",
    random_error: "浏览器无法提供可靠随机数，暂时不能出题。",
    source_label: "查看萌娘百科来源条目：{title}",
    copyright: "图像版权以来源页为准。",
    no_js: "此小玩意需要 JavaScript；未启用时不会连接第三方。",
    options_label: "角色选项",
    image_alt: "请从四个选项中猜出这位角色",
  },
  en: {
    start: "Start a round",
    again: "Another round",
    retry: "Try again",
    loading: "Requesting this round's image from Moegirlpedia…",
    correct: "Correct! This is {title}.",
    incorrect: "Not quite; the answer is {title}.",
    network_error: "The image could not be retrieved just now. Please try again later.",
    no_image_error: "None of these entries has a usable image right now. Please try again.",
    image_error: "The quiz image failed to load. Please try again.",
    random_error: "This browser cannot provide secure randomness, so a round cannot be created.",
    source_label: "Open the source entry on Moegirlpedia: {title}",
    copyright: "Image copyright follows the source page.",
    no_js: "This toy needs JavaScript. With JavaScript disabled, it makes no third-party connection.",
    options_label: "Character choices",
    image_alt: "Guess this character from the four choices",
  },
};

const fixture = (language = "zh") => `<!doctype html>
<html lang="${language}"><body>
  <section data-moegirl-quiz data-api-endpoint="https://zh.moegirl.org.cn/api.php" data-timeout-ms="1000">
    <div data-quiz-interactive hidden>
      <button type="button" data-quiz-start>${copy[language].start}</button>
      <div data-quiz-round hidden>
        <figure data-quiz-figure hidden><img data-quiz-image alt="${copy[language].image_alt}" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="480" height="480"></figure>
        <div data-quiz-options role="group" aria-label="${copy[language].options_label}" hidden></div>
      </div>
      <p data-quiz-status aria-live="polite"></p>
      <p data-quiz-source hidden><a data-quiz-source-link></a><span>${copy[language].copyright}</span></p>
    </div>
    <noscript><p data-no-js>${copy[language].no_js}</p></noscript>
    <script type="application/json" data-quiz-pool>${JSON.stringify(pool.map((title) => ({ title })))}</script>
    <script type="application/json" data-quiz-copy>${JSON.stringify(copy[language])}</script>
  </section>
</body></html>`;

const installQuiz = async (page, language = "zh") => {
  await page.setContent(fixture(language));
  await page.addScriptTag({ path: scriptPath });
};

const stubSuccessfulRound = async (page, state) => {
  await page.route("https://zh.moegirl.org.cn/api.php?**", async (route) => {
    state.apiRequests += 1;
    const url = new URL(route.request().url());
    const titles = url.searchParams.get("titles").split("|");
    state.roundTitles = titles;
    state.answer = titles[0];
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        query: {
          pages: titles.map((title, index) => ({
            pageid: index + 1,
            title,
            fullurl: `https://zh.moegirl.org.cn/${encodeURIComponent(title)}`,
            ...(index === 0
              ? { thumbnail: { source: `https://storage.moegirl.org.cn/${index}.png` } }
              : {}),
          })),
        },
      }),
    });
  });
  await page.route("https://storage.moegirl.org.cn/**", (route) => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
  }));
};

test("first render is offline; one start makes one API request and four unique options", async ({ page }) => {
  const state = { apiRequests: 0, roundTitles: [], answer: "" };
  const thirdPartyRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname.endsWith("moegirl.org.cn")) {
      thirdPartyRequests.push(request.url());
    }
  });
  await stubSuccessfulRound(page, state);
  await installQuiz(page);

  expect(state.apiRequests).toBe(0);
  expect(thirdPartyRequests).toEqual([]);
  await expect(page.locator("[data-quiz-interactive]" )).toBeVisible();
  await page.getByRole("button", { name: "开始一题" }).click();

  await expect(page.locator("[data-quiz-options] button")).toHaveCount(4);
  expect(state.apiRequests).toBe(1);
  expect(new Set(state.roundTitles).size).toBe(4);
  await expect(page.locator("[data-quiz-image]")).toHaveAttribute("referrerpolicy", "no-referrer");
  await expect(page.locator("[data-quiz-image]")).toHaveAttribute("src", /^https:\/\/storage\.moegirl\.org\.cn\//);
});

test("a redirected API title still resolves to the original visible option", async ({ page }) => {
  let answer = "";
  await page.route("https://zh.moegirl.org.cn/api.php?**", async (route) => {
    const url = new URL(route.request().url());
    const titles = url.searchParams.get("titles").split("|");
    answer = titles[0];
    const canonical = `${answer}（角色）`;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        query: {
          redirects: [{ from: answer, to: canonical }],
          pages: [{
            pageid: 1,
            title: canonical,
            fullurl: `https://zh.moegirl.org.cn/${encodeURIComponent(canonical)}`,
            thumbnail: { source: "https://storage.moegirl.org.cn/redirect.png" },
          }],
        },
      }),
    });
  });
  await page.route("https://storage.moegirl.org.cn/**", (route) => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
  }));
  await installQuiz(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  await page.getByRole("button", { name: answer, exact: true }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText(`答对了！这是 ${answer}。`);
  await expect(page.locator("[data-quiz-source-link]")).toHaveAttribute(
    "href",
    `https://zh.moegirl.org.cn/${encodeURIComponent(`${answer}（角色）`)}`,
  );
});

test("a slow image keeps the round hidden and busy until the image loads", async ({ page }) => {
  let releaseImage;
  const imageGate = new Promise((resolve) => { releaseImage = resolve; });
  const state = { apiRequests: 0, roundTitles: [], answer: "" };
  await page.route("https://zh.moegirl.org.cn/api.php?**", async (route) => {
    state.apiRequests += 1;
    const titles = new URL(route.request().url()).searchParams.get("titles").split("|");
    state.answer = titles[0];
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ query: { pages: [{
        pageid: 1,
        title: state.answer,
        fullurl: `https://zh.moegirl.org.cn/${encodeURIComponent(state.answer)}`,
        thumbnail: { source: "https://storage.moegirl.org.cn/slow.png" },
      }] } }),
    });
  });
  await page.route("https://storage.moegirl.org.cn/slow.png", async (route) => {
    await imageGate;
    await route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
    });
  });
  await installQuiz(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  await expect(page.locator("[data-moegirl-quiz]")).toHaveAttribute("aria-busy", "true");
  await expect(page.locator("[data-quiz-round]")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("[data-quiz-options]")).toBeHidden();
  await expect(page.locator("[data-quiz-status]")).toHaveText("正在向萌娘百科请求本题图像……");

  releaseImage();
  await expect(page.locator("[data-quiz-options]")).toBeVisible();
  await expect(page.locator("[data-moegirl-quiz]")).not.toHaveAttribute("aria-busy", "true");
});

test("correct and incorrect answers disclose the exact source, then a new round works", async ({ page }) => {
  const state = { apiRequests: 0, roundTitles: [], answer: "" };
  await stubSuccessfulRound(page, state);
  await installQuiz(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  await page.getByRole("button", { name: state.answer, exact: true }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText(`答对了！这是 ${state.answer}。`);
  await expect(page.locator("[data-quiz-source]")).toContainText("图像版权以来源页为准。");
  await expect(page.locator("[data-quiz-source-link]")).toHaveAttribute(
    "href",
    `https://zh.moegirl.org.cn/${encodeURIComponent(state.answer)}`,
  );

  await page.getByRole("button", { name: "再来一题" }).click();
  expect(state.apiRequests).toBe(2);
  const wrong = state.roundTitles.find((title) => title !== state.answer);
  await page.getByRole("button", { name: wrong, exact: true }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText(`没猜中；答案是 ${state.answer}。`);
  await expect(page.getByRole("button", { name: wrong, exact: true })).toHaveAttribute(
    "data-result",
    "incorrect",
  );
});

test("API failure leaves a focused, retryable component without affecting the document", async ({ page }) => {
  let apiRequests = 0;
  await page.route("https://zh.moegirl.org.cn/api.php?**", async (route) => {
    apiRequests += 1;
    await route.fulfill({ status: 503, body: "unavailable" });
  });
  await installQuiz(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText("暂时没能取得题图，请稍后重试。");
  await expect(page.getByRole("button", { name: "重试" })).toBeEnabled();
  expect(apiRequests).toBe(1);
  await expect(page.locator("body")).toBeVisible();
});

test("English interface and source disclosure remain complete", async ({ page }) => {
  const state = { apiRequests: 0, roundTitles: [], answer: "" };
  await stubSuccessfulRound(page, state);
  await installQuiz(page, "en");

  await page.getByRole("button", { name: "Start a round" }).click();
  await page.getByRole("button", { name: state.answer, exact: true }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText(`Correct! This is ${state.answer}.`);
  await expect(page.locator("[data-quiz-source]")).toContainText(
    "Image copyright follows the source page.",
  );
});

test("no-JavaScript fallback makes no third-party request", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.setContent(fixture("zh"));

  await expect(page.locator("[data-no-js]")).toContainText("未启用时不会连接第三方");
  await expect(page.locator("[data-quiz-interactive]")).toBeHidden();
  expect(requests).toEqual([]);
  await context.close();
});

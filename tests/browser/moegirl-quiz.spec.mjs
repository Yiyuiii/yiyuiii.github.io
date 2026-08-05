import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const scriptPath = fileURLToPath(
  new URL("../../assets/js/moegirl-quiz.js", import.meta.url),
);

const copy = {
  zh: {
    start: "开始一题",
    again: "再来一题",
    retry: "重试",
    loading: "正在向萌娘百科随机发现本题候选……",
    correct: "答对了！这是 {title}。",
    incorrect: "没猜中；答案是 {title}。",
    network_error: "暂时没能取得文字线索，请稍后重试。",
    no_clue_error: "本次随机结果里没有足够的合适条目线索，请再试一次。",
    random_error: "浏览器无法提供可靠随机数，暂时不能出题。",
    source_label: "查看萌娘百科来源条目：{title}",
    license: "线索是来源条目的匿名化节选；再次使用时请保留来源与署名。",
    license_label: "查看 CC BY-NC-SA 3.0 协议",
    no_js: "此小玩意需要 JavaScript；未启用时不会连接萌娘百科。",
    options_label: "候选条目",
    clue_label: "这是什么？",
    redaction: "⬛",
  },
  en: {
    start: "Start a round",
    again: "Another round",
    retry: "Try again",
    loading: "Discovering this round's candidates on Moegirlpedia…",
    correct: "Correct! This is {title}.",
    incorrect: "Not quite; the answer is {title}.",
    network_error: "The text clue could not be retrieved just now. Please try again later.",
    no_clue_error: "This random batch did not contain enough suitable entry clues. Please try again.",
    random_error: "This browser cannot provide secure randomness, so a round cannot be created.",
    source_label: "Open the source entry on Moegirlpedia: {title}",
    license: "The clue is an anonymized excerpt; preserve its source and attribution.",
    license_label: "Read the CC BY-NC-SA 3.0 license",
    no_js: "This toy needs JavaScript. With JavaScript disabled, it does not connect to Moegirlpedia.",
    options_label: "Candidate entries",
    clue_label: "What is this?",
    redaction: "⬛",
  },
};

const fixture = (language = "zh") => `<!doctype html>
<html lang="${language}"><body>
  <section data-moegirl-quiz data-api-endpoint="https://zh.moegirl.org.cn/api.php"
    data-timeout-ms="1000" data-batch-size="20" data-history-size="24">
    <div data-quiz-interactive hidden>
      <button type="button" data-quiz-start>${copy[language].start}</button>
      <div data-quiz-round hidden>
        <div data-quiz-clue tabindex="-1" hidden>
          <p>${copy[language].clue_label}</p>
          <p data-quiz-clue-text></p>
        </div>
        <div data-quiz-options role="group" aria-label="${copy[language].options_label}" hidden></div>
      </div>
      <p data-quiz-status aria-live="polite"></p>
      <p data-quiz-source hidden>
        <a data-quiz-source-link></a><span>${copy[language].license}</span>
        <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/">${copy[language].license_label}</a>
      </p>
    </div>
    <noscript><p data-no-js>${copy[language].no_js}</p></noscript>
    <script type="application/json" data-quiz-copy>${JSON.stringify(copy[language])}</script>
  </section>
</body></html>`;

const installQuiz = async (page, language = "zh") => {
  await page.setContent(fixture(language));
  await page.addScriptTag({ path: scriptPath });
};

const characterPage = (title, longClue = true) => ({
  pageid: title.codePointAt(0) + title.length,
  ns: 0,
  title,
  fullurl: `https://zh.moegirl.org.cn/${encodeURIComponent(title)}`,
  categories: [{ ns: 14, title: "Category:测试作品角色" }],
  extract: longClue
    ? `${title}（日语：${title}かな）是由测试作者创作的漫画《测试作品》及其衍生作品的登场角色。`
      + "她在故事里经历了多段冒险，也因鲜明的能力、伙伴关系和代表性场景而受到读者关注。"
      + "这一段导言足够长，在隐藏姓名后仍能构成完整的文字线索。"
    : `${title}是《测试作品》的登场角色。`,
});
const roundPages = (round = 0) => {
  const prefix = round === 0 ? "甲" : "乙";
  return [0, 1, 2, 3].map((index) => characterPage(
    `测试角色${prefix}${index + 1}`,
    index === 0,
  ));
};

const stubSuccessfulRounds = async (page, state) => {
  await page.route("https://zh.moegirl.org.cn/api.php?**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const pages = roundPages(state.apiRequests);
    state.apiRequests += 1;
    state.requestUrls.push(requestUrl);
    state.answer = pages[0].title;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ query: { pages } }),
    });
  });
};

test("first render stays local; one start makes one nonce-protected random API request", async ({ page }) => {
  const state = { apiRequests: 0, requestUrls: [], answer: "" };
  const moegirlRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname.endsWith("moegirl.org.cn")) {
      moegirlRequests.push(request.url());
    }
  });
  await stubSuccessfulRounds(page, state);
  await installQuiz(page);

  expect(state.apiRequests).toBe(0);
  expect(moegirlRequests).toEqual([]);
  await expect(page.locator("[data-quiz-interactive]")).toBeVisible();
  await page.getByRole("button", { name: "开始一题" }).click();

  await expect(page.locator("[data-quiz-options] button")).toHaveCount(4);
  await expect(page.locator("[data-quiz-clue]")).toBeVisible();
  await expect(page.locator("[data-quiz-clue]")).toBeFocused();
  expect(state.apiRequests).toBe(1);
  expect(moegirlRequests).toHaveLength(1);
  const requestUrl = state.requestUrls[0];
  expect(requestUrl.hostname).toBe("zh.moegirl.org.cn");
  expect(requestUrl.searchParams.get("generator")).toBe("random");
  expect(requestUrl.searchParams.get("grnnamespace")).toBe("0");
  expect(requestUrl.searchParams.get("grnfilterredir")).toBe("nonredirects");
  expect(requestUrl.searchParams.get("grnlimit")).toBe("20");
  expect(requestUrl.searchParams.get("prop")).toBe("extracts|info|categories");
  expect(requestUrl.searchParams.get("exlimit")).toBe("20");
  expect(requestUrl.searchParams.get("cllimit")).toBe("max");
  expect(requestUrl.searchParams.get("requestid")).toMatch(/^[0-9a-f]{32}$/);
  expect(requestUrl.searchParams.has("titles")).toBe(false);
  await expect(page.locator("[data-moegirl-quiz] img")).toHaveCount(0);
});

test("leading aliases, title fragments, and hostile markup are anonymized with a black square", async ({ page }) => {
  const pages = roundPages();
  const answer = pages[0].title;
  pages[0].extract = `完全不同的别名（日语：Secret Name）是由测试作者创作的漫画《测试作品》的登场角色。`
    + `${answer}后来又称Secret Alias，外文名写作Another Secret；她拥有足够丰富的经历、能力与伙伴关系。`
    + "<img src=x onerror=globalThis.__quizXss=true>隐藏这些姓名以后，仍有足够长的完整线索供读者判断。";
  await page.route("https://zh.moegirl.org.cn/api.php?**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ query: { pages } }),
  }));
  await installQuiz(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  const clue = page.locator("[data-quiz-clue-text]");
  await expect(clue).toContainText("⬛");
  await expect(clue).not.toContainText(answer);
  await expect(clue).not.toContainText("完全不同的别名");
  await expect(clue).not.toContainText("Secret Name");
  await expect(clue).not.toContainText("Secret Alias");
  await expect(clue).not.toContainText("Another Secret");
  await expect(clue).toContainText("<img src=x");
  await expect(page.locator("[data-moegirl-quiz] img")).toHaveCount(0);
  expect(await page.evaluate(() => globalThis.__quizXss)).toBeUndefined();
});

test("a foreign alias is hidden when the predicate starts with a country name", async ({ page }) => {
  const pages = roundPages();
  const answer = pages[0].title;
  pages[0].extract = `${answer}（英语：Aisha Landar）是韩国工作室开发的游戏《测试作品》的登场角色。`
    + "她在故事里经历了多段冒险，也因鲜明的能力、伙伴关系和代表性场景而受到读者关注。"
    + "隐藏姓名以后，仍有足够长的完整线索供读者判断。";
  await page.route("https://zh.moegirl.org.cn/api.php?**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ query: { pages } }),
  }));
  await installQuiz(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  const clue = page.locator("[data-quiz-clue-text]");
  await expect(clue).toContainText("⬛");
  await expect(clue).not.toContainText(answer);
  await expect(clue).not.toContainText("Aisha Landar");
});

test("non-character, disambiguation, and sensitive entries cannot become options", async ({ page }) => {
  const pages = roundPages();
  pages.push(
    {
      ...characterPage("测试歌曲"),
      extract: "《测试歌曲》是一首动画角色歌，没有角色型条目说明。",
    },
    {
      ...characterPage("敏感角色"),
      extract: "敏感角色是某作品的登场角色，条目属于R-18成人向内容。",
    },
    {
      ...characterPage("同名消歧义"),
      categories: [{ ns: 14, title: "Category:消歧义页" }],
    },
    {
      ...characterPage("测试原创歌曲"),
      extract: "《测试原创歌曲》是由虚拟YouTuber演唱的原创歌曲。",
      categories: [{ ns: 14, title: "Category:测试角色歌曲" }],
    },
    {
      ...characterPage("测试角色/人格面具"),
      extract: "本文介绍《测试作品》的登场角色测试角色的人格面具，是该游戏中的战斗单位。",
    },
  );
  await page.route("https://zh.moegirl.org.cn/api.php?**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ query: { pages } }),
  }));
  await installQuiz(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  const optionButtons = page.locator("[data-quiz-options] button");
  await expect(optionButtons).toHaveCount(4);
  const labels = await optionButtons.allTextContents();
  expect(labels).toHaveLength(4);
  expect(labels).not.toContain("测试歌曲");
  expect(labels).not.toContain("敏感角色");
  expect(labels).not.toContain("同名消歧义");
  expect(labels).not.toContain("测试原创歌曲");
  expect(labels).not.toContain("测试角色/人格面具");
});

test("recent options stay out of the next round and each request gets a new nonce", async ({ page }) => {
  const state = { apiRequests: 0, requestUrls: [], answer: "" };
  await stubSuccessfulRounds(page, state);
  await installQuiz(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  const optionButtons = page.locator("[data-quiz-options] button");
  await expect(optionButtons).toHaveCount(4);
  const first = await optionButtons.allTextContents();
  await page.getByRole("button", { name: "再来一题" }).click();
  await expect(optionButtons).toHaveCount(4);
  const second = await optionButtons.allTextContents();

  expect(first).toHaveLength(4);
  expect(second).toHaveLength(4);
  expect(second.filter((title) => first.includes(title))).toEqual([]);
  expect(state.apiRequests).toBe(2);
  expect(state.requestUrls[0].searchParams.get("requestid"))
    .not.toBe(state.requestUrls[1].searchParams.get("requestid"));
});

test("answers disclose the safe source and license", async ({ page }) => {
  const state = { apiRequests: 0, requestUrls: [], answer: "" };
  await stubSuccessfulRounds(page, state);
  await installQuiz(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  await page.getByRole("button", { name: state.answer, exact: true }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText(`答对了！这是 ${state.answer}。`);
  await expect(page.locator("[data-quiz-source]")).toContainText("保留来源与署名");
  await expect(page.locator("[data-quiz-source]")).toContainText("CC BY-NC-SA 3.0");
  await expect(page.locator("[data-quiz-source-link]")).toHaveAttribute(
    "href",
    `https://zh.moegirl.org.cn/${encodeURIComponent(state.answer)}`,
  );
});

test("an insufficient random batch fails gracefully and remains retryable", async ({ page }) => {
  await page.route("https://zh.moegirl.org.cn/api.php?**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ query: { pages: [characterPage("唯一角色")] } }),
  }));
  await installQuiz(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText(copy.zh.no_clue_error);
  await expect(page.getByRole("button", { name: "重试" })).toBeFocused();
});

test("an introduction that cannot actually be anonymized cannot become a clue", async ({ page }) => {
  const pages = ["玄霜甲号", "碧落乙号", "丹霞丙号", "苍梧丁号"].map((title) => ({
    ...characterPage(title),
    extract: "但是某部作品包含一位登场角色，相关经历、能力、伙伴关系与代表性场景构成了足够长的介绍，"
      + "这段导言没有给出页面标题，也没有可安全识别并替换的开头主语。",
  }));
  await page.route("https://zh.moegirl.org.cn/api.php?**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ query: { pages } }),
  }));
  await installQuiz(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText(copy.zh.no_clue_error);
  await expect(page.getByRole("button", { name: "重试" })).toBeFocused();
  await expect(page.locator("[data-quiz-clue]")).toBeHidden();
});

test("API failure leaves a focused, retryable component without affecting the document", async ({ page }) => {
  let apiRequests = 0;
  await page.route("https://zh.moegirl.org.cn/api.php?**", async (route) => {
    apiRequests += 1;
    await route.fulfill({ status: 503, body: "unavailable" });
  });
  await installQuiz(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText(copy.zh.network_error);
  await expect(page.getByRole("button", { name: "重试" })).toBeFocused();
  expect(apiRequests).toBe(1);
  await expect(page.locator("body")).toBeVisible();
});

test("HTTP redirects are rejected without contacting the redirect target", async ({ page }) => {
  let apiRequests = 0;
  let redirectedRequests = 0;
  await page.route("https://zh.moegirl.org.cn/api.php?**", async (route) => {
    apiRequests += 1;
    await route.fulfill({ status: 302, headers: { location: "https://example.test/probe" } });
  });
  await page.route("https://example.test/**", async (route) => {
    redirectedRequests += 1;
    await route.abort();
  });
  await installQuiz(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText(copy.zh.network_error);
  expect(apiRequests).toBe(1);
  expect(redirectedRequests).toBe(0);
});

test("English interface uses the same black-square redaction and keeps attribution", async ({ page }) => {
  const state = { apiRequests: 0, requestUrls: [], answer: "" };
  await stubSuccessfulRounds(page, state);
  await installQuiz(page, "en");

  await page.getByRole("button", { name: "Start a round" }).click();
  await expect(page.locator("[data-quiz-clue-text]")).toContainText("⬛");
  await expect(page.locator("[data-quiz-clue]")).toContainText("What is this?");
  await page.getByRole("button", { name: state.answer, exact: true }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText(`Correct! This is ${state.answer}.`);
  await expect(page.locator("[data-quiz-source]")).toContainText("source and attribution");
});

test("no-JavaScript fallback makes no Moegirl request", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const moegirlRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname.endsWith("moegirl.org.cn")) {
      moegirlRequests.push(request.url());
    }
  });
  await page.setContent(fixture("zh"));

  await expect(page.locator("[data-no-js]")).toContainText("不会连接萌娘百科");
  await expect(page.locator("[data-quiz-interactive]")).toBeHidden();
  expect(moegirlRequests).toEqual([]);
  await context.close();
});

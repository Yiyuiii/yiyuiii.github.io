import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const scriptPath = fileURLToPath(
  new URL("../../assets/js/moegirl-quiz.js", import.meta.url),
);

const pool = [
  { title: "初音未来", aliases: ["初音ミク", "Hatsune Miku", "⑨"] },
  { title: "洛天依", aliases: ["Luo Tianyi", "⑨"] },
  { title: "博丽灵梦", aliases: ["博麗霊夢", "⑨"] },
  { title: "雾雨魔理沙", aliases: ["霧雨魔理沙", "⑨"] },
  { title: "御坂美琴", aliases: ["Misaka Mikoto", "⑨"] },
  { title: "鹿目圆", aliases: ["Kaname Madoka", "⑨"] },
];

const copy = {
  zh: {
    start: "开始一题",
    again: "再来一题",
    retry: "重试",
    loading: "正在向萌娘百科请求本题文字线索……",
    correct: "答对了！这是 {title}。",
    incorrect: "没猜中；答案是 {title}。",
    network_error: "暂时没能取得文字线索，请稍后重试。",
    no_clue_error: "这组选项暂时没有足够的匿名线索，请再试一次。",
    random_error: "浏览器无法提供可靠随机数，暂时不能出题。",
    source_label: "查看萌娘百科来源条目：{title}",
    license: "线索是来源条目的匿名化节选；再次使用时请保留来源与署名。",
    license_label: "查看 CC BY-NC-SA 3.0 协议",
    no_js: "此小玩意需要 JavaScript；未启用时不会连接萌娘百科。",
    options_label: "角色选项",
    clue_label: "匿名线索",
    clue_origin: "线索取自一个候选条目的导言，候选名与已知别名已被屏蔽。",
    redaction: "〔角色名已隐藏〕",
  },
  en: {
    start: "Start a round",
    again: "Another round",
    retry: "Try again",
    loading: "Requesting this round's text clue from Moegirlpedia…",
    correct: "Correct! This is {title}.",
    incorrect: "Not quite; the answer is {title}.",
    network_error: "The text clue could not be retrieved just now. Please try again later.",
    no_clue_error: "These candidates do not have a sufficient anonymized clue right now. Please try again.",
    random_error: "This browser cannot provide secure randomness, so a round cannot be created.",
    source_label: "Open the source entry on Moegirlpedia: {title}",
    license: "The clue is an anonymized excerpt from the source entry; preserve its source and attribution.",
    license_label: "Read the CC BY-NC-SA 3.0 license",
    no_js: "This toy needs JavaScript. With JavaScript disabled, it does not connect to Moegirlpedia.",
    options_label: "Character choices",
    clue_label: "Anonymized clue",
    clue_origin: "The clue comes from one candidate's Chinese introduction; names and aliases are hidden.",
    redaction: "〔name hidden〕",
  },
};

const fixture = (language = "zh") => `<!doctype html>
<html lang="${language}"><body>
  <section data-moegirl-quiz data-api-endpoint="https://zh.moegirl.org.cn/api.php" data-timeout-ms="1000">
    <div data-quiz-interactive hidden>
      <button type="button" data-quiz-start>${copy[language].start}</button>
      <div data-quiz-round hidden>
        <div data-quiz-clue tabindex="-1" hidden>
          <p>${copy[language].clue_label}</p>
          <p data-quiz-clue-text></p>
          <p>${copy[language].clue_origin}</p>
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
    <script type="application/json" data-quiz-pool>${JSON.stringify(pool)}</script>
    <script type="application/json" data-quiz-copy>${JSON.stringify(copy[language])}</script>
  </section>
</body></html>`;

const installQuiz = async (page, language = "zh") => {
  await page.setContent(fixture(language));
  await page.addScriptTag({ path: scriptPath });
};

const longExtract = (title) => (
  `${title}是一位活跃于幻想故事中的角色，拥有鲜明的服装、能力与经历。`
  + "她在相关作品里经历了多段冒险，也因为独特的性格、伙伴关系和代表性场景而受到读者关注。"
  + "这一段导言足够长，可以在隐藏姓名之后继续提供可辨认但不会直接泄露答案的文字线索。"
);

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
            ns: 0,
            title,
            fullurl: `https://zh.moegirl.org.cn/${encodeURIComponent(title)}`,
            extract: index === 0 ? longExtract(title) : "简介太短。",
          })),
        },
      }),
    });
  });
};

test("first render avoids Moegirl; one start makes one text request and four unique options", async ({ page }) => {
  const state = { apiRequests: 0, roundTitles: [], answer: "" };
  const moegirlRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname.endsWith("moegirl.org.cn")) {
      moegirlRequests.push(request.url());
    }
  });
  await stubSuccessfulRound(page, state);
  await installQuiz(page);

  expect(state.apiRequests).toBe(0);
  expect(moegirlRequests).toEqual([]);
  await expect(page.locator("[data-quiz-interactive]")).toBeVisible();
  await page.getByRole("button", { name: "开始一题" }).click();

  await expect(page.locator("[data-quiz-options] button")).toHaveCount(4);
  await expect(page.locator("[data-quiz-clue]")).toBeVisible();
  await expect(page.locator("[data-quiz-clue]")).toBeFocused();
  expect(state.apiRequests).toBe(1);
  expect(new Set(state.roundTitles).size).toBe(4);
  expect(moegirlRequests).toHaveLength(1);
  expect(new URL(moegirlRequests[0]).hostname).toBe("zh.moegirl.org.cn");
  await expect(page.locator("[data-moegirl-quiz] img")).toHaveCount(0);
});

test("redirected titles, aliases, candidates, and hostile markup are anonymized as text", async ({ page }) => {
  let answer = "";
  let canonical = "";
  await page.route("https://zh.moegirl.org.cn/api.php?**", async (route) => {
    const titles = new URL(route.request().url()).searchParams.get("titles").split("|");
    answer = titles[0];
    canonical = `${answer}（角色）`;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        query: {
          redirects: [{ from: answer, to: canonical }],
          pages: [{
            pageid: 1,
            ns: 0,
            title: canonical,
            fullurl: `https://zh.moegirl.org.cn/${encodeURIComponent(canonical)}`,
            extract: `${canonical}也被称作${answer}，并与${titles[1]}相识。`
              + "<img src=x onerror=globalThis.__quizXss=true>"
              + "她在作品中拥有足够丰富的经历、能力与伙伴关系，这些文字在姓名隐藏之后仍然能够构成一段完整线索。",
          }],
        },
      }),
    });
  });
  await installQuiz(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  const clue = page.locator("[data-quiz-clue-text]");
  await expect(clue).toContainText("〔角色名已隐藏〕");
  await expect(clue).not.toContainText(answer);
  await expect(clue).not.toContainText(canonical);
  await expect(clue).toContainText("<img src=x");
  await expect(page.locator("[data-moegirl-quiz] img")).toHaveCount(0);
  expect(await page.evaluate(() => globalThis.__quizXss)).toBeUndefined();

  await page.getByRole("button", { name: answer, exact: true }).click();
  await expect(page.locator("[data-quiz-source-link]")).toHaveAttribute(
    "href",
    `https://zh.moegirl.org.cn/${encodeURIComponent(canonical)}`,
  );
});

test("title fragments and reviewed aliases cannot reveal the answer", async ({ page }) => {
  let answer = "";
  let fragment = "";
  let alias = "";
  await page.route("https://zh.moegirl.org.cn/api.php?**", async (route) => {
    const titles = new URL(route.request().url()).searchParams.get("titles").split("|");
    answer = titles[0];
    fragment = [...answer].slice(-2).join("");
    alias = pool.find((entry) => entry.title === answer)?.aliases?.[0] || "unused alias";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        query: {
          pages: [{
            pageid: 1,
            ns: 0,
            title: answer,
            fullurl: `https://zh.moegirl.org.cn/${encodeURIComponent(answer)}`,
            extract: `${answer}也常被简称为${fragment}，外文名写作${alias}，单字别称是⑨。`
              + "她在相关作品中经历了许多事件，并因鲜明的能力、关系与代表性场景而受到关注；隐藏这些名字后仍有足够的可辨认线索。",
          }],
        },
      }),
    });
  });
  await installQuiz(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  const clue = page.locator("[data-quiz-clue-text]");
  await expect(clue).toContainText("〔角色名已隐藏〕");
  await expect(clue).not.toContainText(answer);
  await expect(clue).not.toContainText(fragment);
  await expect(clue).not.toContainText(alias);
  await expect(clue).not.toContainText("⑨");
});

test("only a candidate with a sufficient anonymized introduction can become the answer", async ({ page }) => {
  const state = { apiRequests: 0, roundTitles: [], answer: "" };
  await stubSuccessfulRound(page, state);
  await installQuiz(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  await page.getByRole("button", { name: state.answer, exact: true }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText(`答对了！这是 ${state.answer}。`);
});

test("correct and incorrect answers disclose source and license, then a new round works", async ({ page }) => {
  const state = { apiRequests: 0, roundTitles: [], answer: "" };
  await stubSuccessfulRound(page, state);
  await installQuiz(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  await page.getByRole("button", { name: state.answer, exact: true }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText(`答对了！这是 ${state.answer}。`);
  await expect(page.locator("[data-quiz-source]")).toContainText("保留来源与署名");
  await expect(page.locator("[data-quiz-source]")).toContainText("CC BY-NC-SA 3.0");

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
  await expect(page.locator("[data-quiz-status]")).toHaveText("暂时没能取得文字线索，请稍后重试。");
  await expect(page.getByRole("button", { name: "重试" })).toBeFocused();
  expect(apiRequests).toBe(1);
  await expect(page.locator("body")).toBeVisible();
});

test("HTTP redirects are rejected without contacting the redirect target", async ({ page }) => {
  let apiRequests = 0;
  let redirectedRequests = 0;
  await page.route("https://zh.moegirl.org.cn/api.php?**", async (route) => {
    apiRequests += 1;
    await route.fulfill({
      status: 302,
      headers: { location: "https://example.test/probe" },
    });
  });
  await page.route("https://example.test/**", async (route) => {
    redirectedRequests += 1;
    await route.abort();
  });
  await installQuiz(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText("暂时没能取得文字线索，请稍后重试。");
  expect(apiRequests).toBe(1);
  expect(redirectedRequests).toBe(0);
});

test("English interface explains that the anonymized clue is Chinese and keeps attribution", async ({ page }) => {
  const state = { apiRequests: 0, roundTitles: [], answer: "" };
  await stubSuccessfulRound(page, state);
  await installQuiz(page, "en");

  await page.getByRole("button", { name: "Start a round" }).click();
  await expect(page.locator("[data-quiz-clue]")).toContainText("Chinese introduction");
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

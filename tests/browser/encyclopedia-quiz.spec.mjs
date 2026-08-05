import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const logicPath = fileURLToPath(
  new URL("../../assets/js/encyclopedia-quiz-logic.js", import.meta.url),
);
const controllerPath = fileURLToPath(
  new URL("../../assets/js/encyclopedia-quiz.js", import.meta.url),
);

const EXTERNAL_HOSTS = new Set([
  "zh.moegirl.org.cn",
  "zh.wikipedia.org",
  "en.wikipedia.org",
]);

const commonCopy = {
  zh: {
    source_select_label: "题目来源",
    start: "开始一题",
    again: "再来一题",
    retry: "重试",
    options_label: "候选条目",
    clue_label: "这是什么？",
    redaction: "⬛",
    correct: "答对了！这是 {title}。",
    incorrect: "没猜中；答案是 {title}。",
    network_error: "暂时没能取得文字线索，请稍后重试。",
    no_clue_error: "本次随机结果里没有足够的同类条目组成题目，请主动重试。",
    random_error: "浏览器无法提供可靠随机数，暂时不能出题。",
    no_js: "此小玩意需要 JavaScript；未启用时不会连接萌娘百科或 Wikipedia。",
  },
  en: {
    source_select_label: "Question source",
    start: "Start a round",
    again: "Another round",
    retry: "Try again",
    options_label: "Candidate entries",
    clue_label: "What is this?",
    redaction: "⬛",
    correct: "Correct! This is {title}.",
    incorrect: "Not quite; the answer is {title}.",
    network_error: "The text clue could not be retrieved just now. Please try again later.",
    no_clue_error: "This random batch did not contain enough entries of one type to make a round. Please try again.",
    random_error: "This browser cannot provide secure randomness, so a round cannot be created.",
    no_js: "This toy needs JavaScript. With JavaScript disabled, it does not connect to Moegirlpedia or Wikipedia.",
  },
};

const sourceCopy = {
  moegirl_zh: {
    zh: {
      label: "萌娘百科（中文）",
      privacy: "点击开始后只向萌娘百科请求一次；服务方可看到请求和 IP。本游戏不保存题目，也不请求图片。",
      loading: "正在从萌娘百科随机发现本题候选……",
      source_label: "查看萌娘百科来源条目：{title}",
      attribution: "本站遮蔽了名称片段并截短内容；复用时请保留来源与署名。",
      license_label: "查看 CC BY-NC-SA 3.0 协议",
    },
    en: {
      label: "Moegirlpedia (Chinese clue)",
      privacy: "One request to Chinese Moegirlpedia; the provider can see the request and IP. No puzzle is saved and no image is requested.",
      loading: "Discovering Chinese candidates on Moegirlpedia…",
      source_label: "Open the source entry on Moegirlpedia: {title}",
      attribution: "Name fragments are masked and the text is shortened; preserve source and attribution.",
      license_label: "Read the CC BY-NC-SA 3.0 license",
    },
  },
  wikipedia_zh: {
    zh: {
      label: "维基百科（中文）",
      privacy: "点击开始后只向中文维基百科请求一次；服务方可看到请求和 IP。本游戏不保存题目，也不请求图片。",
      loading: "正在从中文维基百科随机发现本题候选……",
      network_error: "未能连接中文维基百科；请切回萌娘百科。",
      source_label: "查看中文维基百科准确修订：{title}",
      attribution: "本站转为纯文字、遮蔽名称片段并截短内容；修改后的线索按 CC BY-SA 4.0 提供。",
      license_label: "查看 CC BY-SA 4.0 协议",
    },
  },
  wikipedia_en: {
    en: {
      label: "Wikipedia (English)",
      privacy: "One request to English Wikipedia; the provider can see the request and IP. No puzzle is saved and no image is requested.",
      loading: "Discovering candidates on English Wikipedia…",
      network_error: "Could not connect to English Wikipedia; this site does not proxy the request.",
      source_label: "Open the exact Wikipedia revision: {title}",
      attribution: "The text is made plain, name fragments are masked, and it is shortened. The modified clue is under CC BY-SA 4.0.",
      license_label: "Read the CC BY-SA 4.0 license",
    },
  },
};

const allSources = {
  moegirl_zh: {
    adapter: "moegirl",
    language: "zh",
    endpoint: "https://zh.moegirl.org.cn/api.php",
    batch_size: 50,
    license_url: "https://creativecommons.org/licenses/by-nc-sa/3.0/",
  },
  wikipedia_zh: {
    adapter: "wikipedia",
    language: "zh",
    endpoint: "https://zh.wikipedia.org/w/api.php",
    batch_size: 20,
    license_url: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  wikipedia_en: {
    adapter: "wikipedia",
    language: "en",
    endpoint: "https://en.wikipedia.org/w/api.php",
    batch_size: 20,
    license_url: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
};

const runtimeConfig = (language = "zh", overrides = {}) => {
  const allowedIds = language === "zh"
    ? ["moegirl_zh", "wikipedia_zh"]
    : ["wikipedia_en", "moegirl_zh"];
  const config = {
    page_lang: language,
    default_source_id: language === "zh" ? "moegirl_zh" : "wikipedia_en",
    allowed_source_ids: allowedIds,
    timeout_ms: 1000,
    max_response_chars: 262144,
    recent_history_size: 24,
    sources: Object.fromEntries(allowedIds.map((id) => [id, allSources[id]])),
    copy: commonCopy[language],
    source_copy: Object.fromEntries(
      allowedIds.map((id) => [id, sourceCopy[id][language]]),
    ),
  };
  return { ...config, ...overrides };
};

const fixture = (language = "zh", overrides = {}) => {
  const config = runtimeConfig(language, overrides);
  const options = config.allowed_source_ids.map((id) => (
    `<option value="${id}"${id === config.default_source_id ? " selected" : ""}>`
    + `${config.source_copy[id]?.label || id}</option>`
  )).join("");
  return `<!doctype html>
<html lang="${language}"><body>
  <section data-encyclopedia-quiz>
    <div data-quiz-enhanced hidden>
      <label for="quiz-source">${config.copy.source_select_label}</label>
      <select id="quiz-source" data-quiz-source-select>${options}</select>
      <p data-quiz-privacy>${config.source_copy[config.default_source_id]?.privacy || ""}</p>
      <div data-quiz-interactive hidden>
        <button type="button" data-quiz-start>${config.copy.start}</button>
        <div data-quiz-round hidden>
          <div data-quiz-clue tabindex="-1" hidden>
            <p>${config.copy.clue_label}</p><p data-quiz-clue-text></p>
          </div>
          <div data-quiz-options role="group" aria-label="${config.copy.options_label}" hidden></div>
        </div>
        <p data-quiz-status aria-live="polite"></p>
        <div data-quiz-source hidden>
          <a data-quiz-source-link rel="noopener noreferrer" referrerpolicy="no-referrer"></a>
          <p data-quiz-attribution></p>
          <a data-quiz-license-link rel="noopener noreferrer" referrerpolicy="no-referrer"></a>
        </div>
      </div>
    </div>
    <noscript><p data-no-js>${config.copy.no_js}</p></noscript>
    <script type="application/json" data-quiz-config>${JSON.stringify(config)}</script>
  </section>
</body></html>`;
};

const installQuiz = async (page, language = "zh", overrides = {}, beforeScripts) => {
  await page.setContent(fixture(language, overrides));
  if (beforeScripts) await beforeScripts(page);
  await page.addScriptTag({ path: logicPath });
  await page.addScriptTag({ path: controllerPath });
};

const isExternal = (url) => EXTERNAL_HOSTS.has(new URL(url).hostname);

const observeExternalRequests = (page) => {
  const requests = [];
  page.on("request", (request) => {
    if (isExternal(request.url())) {
      requests.push({ method: request.method(), url: request.url() });
    }
  });
  return requests;
};

const moegirlPage = (title, { long = true } = {}) => ({
  pageid: [...title].reduce((total, character) => total + character.codePointAt(0), 0),
  ns: 0,
  title,
  fullurl: `https://zh.moegirl.org.cn/${encodeURIComponent(title)}`,
  categories: [{ ns: 14, title: "Category:测试作品角色" }],
  extract: long
    ? `${title}（英语：${title} Alias）是测试作品中的登场角色，也是一位虚构人物。`
      + "该角色经历了多段冒险，并因鲜明的能力、伙伴关系和代表性场景受到读者关注。"
      + "隐藏姓名以后，这段纯文字导言仍足够长，可以构成完整的猜题线索。"
    : `${title}是测试作品中的登场角色。`,
});

const moegirlPages = (prefix = "甲") => [0, 1, 2, 3].map((index) => (
  moegirlPage(`测试角色${prefix}${index + 1}`, { long: index === 0 })
));

const categoryByType = {
  person: { zh: "Category:在世人物", en: "Category:Living people" },
  place: { zh: "Category:中国城市", en: "Category:Cities in England" },
  work: { zh: "Category:中国小说", en: "Category:English novels" },
  organization: { zh: "Category:中国公司", en: "Category:Companies of England" },
  organism: { zh: "Category:中国物种", en: "Category:Species of Europe" },
  event: { zh: "Category:中国战役", en: "Category:Battles involving England" },
};

const wikipediaPage = (title, {
  language = "en",
  semanticType = "person",
  revid = 1001,
  extract,
  pageprops,
} = {}) => ({
  pageid: revid + 10000,
  ns: 0,
  title,
  categories: [{ ns: 14, title: categoryByType[semanticType][language] }],
  extract: extract || (language === "zh"
    ? `${title}是一个具有完整资料的测试条目，其历史、特征、影响和相关背景都有较详细的介绍。`
      + "隐藏名称之后，这段纯文字导言仍然足够长，可以让读者依据内容从同类候选中判断答案。"
    : `${title} is a well-documented test subject with a detailed history, distinctive features, influence, and wider context. `
      + "After its name is masked, this plain-text introduction remains long enough to distinguish it from related entries."),
  revisions: [{ revid, parentid: revid - 1, timestamp: "2026-08-05T00:00:00Z" }],
  ...(pageprops ? { pageprops } : {}),
});

const wikipediaPages = ({
  language = "en",
  semanticType = "person",
  prefix = "Example Person",
  revisionBase = 1000,
} = {}) => [0, 1, 2, 3].map((index) => wikipediaPage(
  language === "zh" ? `${prefix}${index + 1}号` : `${prefix} ${index + 1}`,
  { language, semanticType, revid: revisionBase + index + 1 },
));

const fulfillJson = (route, pages, extra = {}) => route.fulfill({
  contentType: "application/json",
  body: JSON.stringify({ query: { pages }, ...extra }),
});

test("language defaults and source changes stay local and update disclosure", async ({ page }) => {
  const requests = observeExternalRequests(page);
  await installQuiz(page, "zh");

  const select = page.locator("[data-quiz-source-select]");
  await expect(select).toHaveValue("moegirl_zh");
  await expect(select.locator("option")).toHaveCount(2);
  await expect(page.locator("[data-quiz-privacy]")).toContainText("萌娘百科");
  await select.selectOption("wikipedia_zh");
  await expect(page.locator("[data-quiz-privacy]")).toContainText("中文维基百科");
  expect(requests).toEqual([]);

  await page.setContent(fixture("en"));
  await page.addScriptTag({ path: logicPath });
  await page.addScriptTag({ path: controllerPath });
  await expect(select).toHaveValue("wikipedia_en");
  await expect(page.locator("[data-quiz-privacy]")).toContainText("English Wikipedia");
  await expect(select.locator("option").nth(1)).toHaveText("Moegirlpedia (Chinese clue)");
  await select.selectOption("moegirl_zh");
  await expect(page.locator("[data-quiz-privacy]")).toContainText("Chinese Moegirlpedia");
  expect(requests).toEqual([]);
});

test("a Chinese default round makes exactly one simple Moegirl GET", async ({ page }) => {
  const requests = observeExternalRequests(page);
  const routed = [];
  await page.route("https://zh.moegirl.org.cn/api.php?**", (route) => {
    routed.push(route.request());
    return fulfillJson(route, moegirlPages());
  });
  await installQuiz(page, "zh");

  expect(requests).toEqual([]);
  await page.getByRole("button", { name: "开始一题" }).click();
  await expect(page.locator("[data-quiz-options] button")).toHaveCount(4);
  await expect(page.locator("[data-quiz-clue]")).toBeFocused();

  expect(routed).toHaveLength(1);
  expect(requests).toHaveLength(1);
  expect(requests[0].method).toBe("GET");
  const url = new URL(requests[0].url);
  expect(url.hostname).toBe("zh.moegirl.org.cn");
  expect(url.searchParams.get("generator")).toBe("random");
  expect(url.searchParams.get("grnlimit")).toBe("50");
  expect(url.searchParams.get("prop")).toBe("extracts|info|categories");
  expect(url.searchParams.get("explaintext")).toBe("1");
  expect(url.searchParams.get("requestid")).toMatch(/^[0-9a-f]{32}$/);
  expect(requests.some((request) => request.method === "OPTIONS")).toBe(false);
});

for (const scenario of [
  {
    language: "en",
    sourceId: "wikipedia_en",
    host: "en.wikipedia.org",
    pages: wikipediaPages({ language: "en", prefix: "Example Person" }),
    button: "Start a round",
  },
  {
    language: "zh",
    sourceId: "wikipedia_zh",
    host: "zh.wikipedia.org",
    pages: wikipediaPages({ language: "zh", prefix: "测试人物" }),
    button: "开始一题",
  },
]) {
  test(`${scenario.sourceId} uses one plain-text Wikipedia GET without continuation or preflight`, async ({ page }) => {
    const requests = observeExternalRequests(page);
    await page.route(`https://${scenario.host}/w/api.php?**`, (route) => (
      fulfillJson(route, scenario.pages, { continue: { clcontinue: "ignored" } })
    ));
    await installQuiz(page, scenario.language);
    if (scenario.language === "zh") {
      await page.locator("[data-quiz-source-select]").selectOption(scenario.sourceId);
    }

    await page.getByRole("button", { name: scenario.button }).click();
    await expect(page.locator("[data-quiz-options] button")).toHaveCount(4);
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("GET");
    const url = new URL(requests[0].url);
    expect(url.hostname).toBe(scenario.host);
    expect(url.pathname).toBe("/w/api.php");
    for (const [name, value] of Object.entries({
      action: "query",
      format: "json",
      formatversion: "2",
      generator: "random",
      grnnamespace: "0",
      grnfilterredir: "nonredirects",
      grnlimit: "20",
      prop: "extracts|categories|pageprops|revisions",
      exintro: "1",
      explaintext: "1",
      exchars: "900",
      exlimit: "20",
      cllimit: "max",
      rvprop: "ids|timestamp",
      origin: "*",
      maxage: "0",
      smaxage: "0",
    })) expect(url.searchParams.get(name)).toBe(value);
    expect(url.searchParams.has("rvlimit")).toBe(false);
    expect(url.searchParams.has("pageimages")).toBe(false);
    expect(url.searchParams.has("continue")).toBe(false);
    expect(url.searchParams.get("requestid")).toMatch(/^[0-9a-f]{32}$/);
    expect(requests.some((request) => request.method === "OPTIONS")).toBe(false);
  });
}

test("source changes clear a round, isolate history by source, and never fetch implicitly", async ({ page }) => {
  const requests = observeExternalRequests(page);
  const sharedTitles = ["共享人物甲", "共享人物乙", "共享人物丙", "共享人物丁"];
  await page.route("https://zh.moegirl.org.cn/api.php?**", (route) => fulfillJson(
    route,
    sharedTitles.map((title, index) => moegirlPage(title, { long: index === 0 })),
  ));
  await page.route("https://zh.wikipedia.org/w/api.php?**", (route) => fulfillJson(
    route,
    sharedTitles.map((title, index) => wikipediaPage(title, {
      language: "zh", semanticType: "person", revid: 3000 + index,
    })),
  ));
  await installQuiz(page, "zh");
  const select = page.locator("[data-quiz-source-select]");

  await page.getByRole("button", { name: "开始一题" }).click();
  await expect(page.locator("[data-quiz-options] button")).toHaveCount(4);
  await select.selectOption("wikipedia_zh");
  await expect(page.locator("[data-quiz-round]")).toBeHidden();
  expect(requests).toHaveLength(1);

  await page.getByRole("button", { name: "开始一题" }).click();
  await expect(page.locator("[data-quiz-options] button")).toHaveCount(4);
  await select.selectOption("moegirl_zh");
  expect(requests).toHaveLength(2);
  await page.getByRole("button", { name: "开始一题" }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText(commonCopy.zh.no_clue_error);
  expect(requests).toHaveLength(3);
});

test("a programmatic source change aborts a stale request and prevents stale rendering", async ({ page }) => {
  const requests = observeExternalRequests(page);
  await page.route("https://zh.moegirl.org.cn/api.php?**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ query: { pages: moegirlPages() } }) }).catch(() => {});
  });
  await page.route("https://zh.wikipedia.org/w/api.php?**", (route) => fulfillJson(
    route,
    wikipediaPages({ language: "zh", prefix: "维基人物", revisionBase: 5000 }),
  ));
  await installQuiz(page, "zh");

  await page.getByRole("button", { name: "开始一题" }).click({ noWaitAfter: true });
  await page.locator("[data-quiz-source-select]").evaluate((select) => {
    select.value = "wikipedia_zh";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.locator("[data-quiz-round]")).toBeHidden();
  await page.getByRole("button", { name: "开始一题" }).click();
  await expect(page.locator("[data-quiz-options] button").first()).toContainText("维基人物");
  await page.waitForTimeout(300);
  await expect(page.locator("[data-quiz-options] button").first()).toContainText("维基人物");
  expect(requests.filter((request) => request.method === "GET").length).toBe(2);
});

test("plain-text masking and hostile strings cannot create nodes or extra requests", async ({ page }) => {
  const requests = observeExternalRequests(page);
  const hostileUrl = "https://attacker.invalid/quiz-probe";
  const pages = wikipediaPages({ language: "en", prefix: "Hostile Person" });
  pages[0].extract = `${pages[0].title} is a documented person with a long history and broad public influence. `
    + `<img src="${hostileUrl}"><script>globalThis.__quizXss=true</script> `
    + "This remains a plain-text clue after the entry name is safely masked and shortened for the game.";
  pages[1].title = `<img src="${hostileUrl}" onerror="globalThis.__quizXss=true">`;
  await page.route("https://en.wikipedia.org/w/api.php?**", (route) => fulfillJson(route, pages));
  await page.route("https://attacker.invalid/**", (route) => route.abort());
  await installQuiz(page, "en");

  await page.getByRole("button", { name: "Start a round" }).click();
  const clue = page.locator("[data-quiz-clue-text]");
  await expect(clue).toContainText("⬛");
  await expect(clue).not.toContainText("Hostile Person 1");
  await expect(page.locator("[data-encyclopedia-quiz] img, [data-encyclopedia-quiz] script script")).toHaveCount(0);
  expect(await page.evaluate(() => globalThis.__quizXss)).toBeUndefined();
  expect(requests).toHaveLength(1);
});

for (const semanticType of Object.keys(categoryByType)) {
  test(`Wikipedia ${semanticType} candidates form one same-type four-option round`, async ({ page }) => {
    const prefix = `${semanticType} Candidate`;
    await page.route("https://en.wikipedia.org/w/api.php?**", (route) => fulfillJson(
      route,
      wikipediaPages({ language: "en", semanticType, prefix }),
    ));
    await installQuiz(page, "en");
    await page.getByRole("button", { name: "Start a round" }).click();

    const labels = await page.locator("[data-quiz-options] button").allTextContents();
    expect(labels).toHaveLength(4);
    expect(new Set(labels).size).toBe(4);
    expect(labels.every((label) => label.startsWith(prefix))).toBe(true);
  });
}

test("disambiguation, unknown, duplicate, and unmaskable pages cannot fill a round", async ({ page }) => {
  const pages = wikipediaPages({ language: "en", prefix: "Only Person" }).slice(0, 3);
  pages.push(
    wikipediaPage("Disambiguation Person", {
      language: "en", pageprops: { disambiguation: "" }, revid: 6101,
    }),
    wikipediaPage("Unknown Subject", { language: "en", revid: 6102 }),
    {
      ...wikipediaPage("Only Person 1", { language: "en", revid: 6103 }),
      extract: "However, this long introduction never identifies its page subject before the predicate, so no safe name masking can be proven for this candidate.",
    },
  );
  pages[4].categories = [{ ns: 14, title: "Category:General knowledge" }];
  await page.route("https://en.wikipedia.org/w/api.php?**", (route) => fulfillJson(route, pages));
  await installQuiz(page, "en");

  await page.getByRole("button", { name: "Start a round" }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText(commonCopy.en.no_clue_error);
  await expect(page.getByRole("button", { name: "Try again" })).toBeFocused();
  await expect(page.locator("[data-quiz-round]")).toBeHidden();
});

for (const failure of [
  { name: "HTTP failure", fulfill: { status: 503, body: "unavailable" } },
  { name: "invalid JSON", fulfill: { status: 200, contentType: "application/json", body: "{" } },
  { name: "oversized response", fulfill: { status: 200, contentType: "application/json", body: "x".repeat(70000) }, responseLimit: 65536 },
]) {
  test(`${failure.name} is explicit and never retries silently`, async ({ page }) => {
    const requests = observeExternalRequests(page);
    await page.route("https://en.wikipedia.org/w/api.php?**", (route) => route.fulfill(failure.fulfill));
    await installQuiz(page, "en", failure.responseLimit
      ? { max_response_chars: failure.responseLimit }
      : {});

    await page.getByRole("button", { name: "Start a round" }).click();
    await expect(page.locator("[data-quiz-status]")).toHaveText(
      sourceCopy.wikipedia_en.en.network_error,
    );
    await expect(page.getByRole("button", { name: "Try again" })).toBeFocused();
    await page.waitForTimeout(50);
    expect(requests).toHaveLength(1);
  });
}

test("a source without a custom network error uses the common fallback", async ({ page }) => {
  const requests = observeExternalRequests(page);
  await page.route("https://zh.moegirl.org.cn/api.php?**", (route) => route.fulfill({
    status: 503,
    body: "unavailable",
  }));
  await installQuiz(page, "zh");

  await page.getByRole("button", { name: "开始一题" }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText(commonCopy.zh.network_error);
  await expect(page.getByRole("button", { name: "重试" })).toBeFocused();
  await page.waitForTimeout(50);
  expect(requests).toHaveLength(1);
});

test("an oversized chunked response is cancelled before JSON parsing", async ({ page }) => {
  await installQuiz(page, "en", { max_response_chars: 65536 }, async (currentPage) => {
    await currentPage.evaluate(() => {
      globalThis.__quizStreamCancelled = false;
      globalThis.__quizStreamChunks = 0;
      globalThis.fetch = async () => new Response(new ReadableStream({
        cancel() {
          globalThis.__quizStreamCancelled = true;
        },
        pull(controller) {
          globalThis.__quizStreamChunks += 1;
          controller.enqueue(new Uint8Array(32768).fill(120));
        },
      }), { headers: { "content-type": "application/json" }, status: 200 });
    });
  });

  await page.getByRole("button", { name: "Start a round" }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText(
    sourceCopy.wikipedia_en.en.network_error,
  );
  await expect(page.getByRole("button", { name: "Try again" })).toBeFocused();
  await expect.poll(() => page.evaluate(() => globalThis.__quizStreamCancelled)).toBe(true);
  const chunks = await page.evaluate(() => globalThis.__quizStreamChunks);
  expect(chunks).toBeGreaterThanOrEqual(3);
  expect(chunks).toBeLessThanOrEqual(4);
});

test("timeout is explicit and does not continue with a second request", async ({ page }) => {
  test.slow();
  const requests = observeExternalRequests(page);
  await page.route("https://en.wikipedia.org/w/api.php?**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1400));
    await route.fulfill({ contentType: "application/json", body: "{}" }).catch(() => {});
  });
  await installQuiz(page, "en", { timeout_ms: 1000 });

  await page.getByRole("button", { name: "Start a round" }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText(
    sourceCopy.wikipedia_en.en.network_error,
  );
  await expect(page.getByRole("button", { name: "Try again" })).toBeFocused();
  expect(requests).toHaveLength(1);
});

test("secure-random failure is explicit and makes no request", async ({ page }) => {
  const requests = observeExternalRequests(page);
  await installQuiz(page, "en", {}, async (currentPage) => {
    await currentPage.evaluate(() => {
      Object.defineProperty(globalThis.crypto, "getRandomValues", {
        configurable: true,
        value() { throw new Error("random unavailable"); },
      });
    });
  });

  await page.getByRole("button", { name: "Start a round" }).click();
  await expect(page.locator("[data-quiz-status]")).toHaveText(commonCopy.en.random_error);
  await expect(page.getByRole("button", { name: "Try again" })).toBeFocused();
  expect(requests).toEqual([]);
});

test("an untrusted endpoint fails closed before the component becomes interactive", async ({ page }) => {
  const requests = observeExternalRequests(page);
  const config = runtimeConfig("en");
  config.sources = {
    ...config.sources,
    wikipedia_en: {
      ...config.sources.wikipedia_en,
      endpoint: "https://attacker.invalid/w/api.php",
    },
  };
  await page.route("https://attacker.invalid/**", (route) => route.abort());
  await installQuiz(page, "en", { sources: config.sources });

  await expect(page.locator("[data-quiz-interactive]")).toBeHidden();
  await expect(page.locator("[data-encyclopedia-quiz]")).not.toHaveAttribute("data-quiz-ready", "true");
  expect(requests).toEqual([]);
});

test("answering reveals an exact oldid link, license, and modification statement", async ({ page }) => {
  await page.route("https://en.wikipedia.org/w/api.php?**", (route) => fulfillJson(
    route,
    wikipediaPages({ language: "en", prefix: "Answer Person", revisionBase: 7200 }),
  ));
  await installQuiz(page, "en");

  await page.getByRole("button", { name: "Start a round" }).click();
  await page.locator("[data-quiz-options] button").first().click();
  expect(
    await page.locator("[data-quiz-options] button").evaluateAll(
      (buttons) => buttons.every((button) => button.disabled),
    ),
  ).toBe(true);
  await expect(page.locator("[data-quiz-source]")).toBeVisible();
  await expect(page.locator("[data-quiz-source-link]")).toHaveAttribute(
    "href",
    /^https:\/\/en\.wikipedia\.org\/w\/index\.php\?oldid=72\d\d$/,
  );
  await expect(page.locator("[data-quiz-attribution]")).toContainText("modified clue");
  await expect(page.locator("[data-quiz-attribution]")).toContainText("CC BY-SA 4.0");
  await expect(page.locator("[data-quiz-license-link]")).toHaveAttribute(
    "href",
    "https://creativecommons.org/licenses/by-sa/4.0/",
  );
  for (const selector of ["[data-quiz-source-link]", "[data-quiz-license-link]"]) {
    await expect(page.locator(selector)).toHaveAttribute("referrerpolicy", "no-referrer");
  }
});

test("no-JavaScript fallback shows both providers and makes no external request", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const requests = observeExternalRequests(page);
  await page.setContent(fixture("zh"));

  await expect(page.locator("[data-no-js]")).toContainText("萌娘百科或 Wikipedia");
  await expect(page.locator("[data-quiz-enhanced]")).toBeHidden();
  await expect(page.locator("[data-quiz-source-select]")).toBeHidden();
  await expect(page.locator("[data-quiz-interactive]")).toBeHidden();
  expect(requests).toEqual([]);
  await context.close();
});

import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const logicPath = path.resolve(here, "../../assets/js/acg-relation-quiz-logic.js");
const controllerPath = path.resolve(here, "../../assets/js/acg-relation-quiz.js");

const commonCopy = {
  zh: {
    start: "开始一题", again: "再来一题", retry: "重试", options_label: "候选答案",
    settings_title: "题型", settings_adjust: "调整", settings_all: "全部三种",
    settings_selected: "已启用 {count} 种", settings_legend: "启用哪些题型",
    settings_help: "从可用题型中随机选择。", settings_apply: "应用设置",
    settings_reset: "恢复全部", settings_applied: "题型设置已应用；下一题按新设置生成。",
    settings_defaults_ready: "已勾选全部三种题型；应用后生效。", settings_required: "请至少启用一种题型。",
    type_labels: { anime_to_character: "动画 → 主角", character_to_anime: "主角 → 动画", character_to_character: "主角 → 同作主角" },
    network_error: "暂时没能取得本题数据，请稍后主动重试。",
    no_round_error: "本次响应没有形成一组无歧义的四选一题目；你可以主动重试。",
    random_error: "浏览器无法提供可靠随机数，暂时不能出题。",
  },
  en: {
    start: "Start a round", again: "Another round", retry: "Try again", options_label: "Answer choices",
    settings_title: "Formats", settings_adjust: "Adjust", settings_all: "All three",
    settings_selected: "{count} enabled", settings_legend: "Enabled formats",
    settings_help: "Randomly use an available format.", settings_apply: "Apply settings",
    settings_reset: "Restore all", settings_applied: "Format settings applied; the next round will use them.",
    settings_defaults_ready: "All three selected.", settings_required: "Select at least one format.",
    type_labels: { anime_to_character: "Anime → main character", character_to_anime: "Main character → anime", character_to_character: "Main character → co-main character" },
    network_error: "The data for this round could not be retrieved just now. Please try again later.",
    no_round_error: "This response did not form an unambiguous four-choice round. You can try again manually.",
    random_error: "This browser cannot provide secure randomness, so a round cannot be created.",
  },
};

const sourceCopy = {
  zh: {
    loading: "正在从 AniList 取得一小批角色关系……",
    prompts: {
      anime_to_character: "《{title}》的主角之一是谁？",
      character_to_anime: "“{character}”是哪部动画的主角之一？",
      character_to_character: "以下哪位与“{character}”是同一部动画的主角？",
    },
    feedback: {
      anime_to_character: {
        correct: "答对了！“{answer}”是《{title}》的主要角色。",
        incorrect: "没猜中；“{answer}”是《{title}》的主要角色。",
      },
      character_to_anime: {
        correct: "答对了！“{character}”是《{answer}》的主要角色。",
        incorrect: "没猜中；“{character}”是《{answer}》的主要角色。",
      },
      character_to_character: {
        correct: "答对了！“{character}”和“{answer}”都是《{title}》的主要角色。",
        incorrect: "没猜中；“{character}”和“{answer}”都是《{title}》的主要角色。",
      },
    },
    source_link_label: "在 AniList 查看《{title}》",
    attribution: "关系来自 AniList；只显示文字。",
    terms_label: "查看 AniList API 使用条款",
  },
  en: {
    loading: "Reading a small batch of character relationships from AniList…",
    prompts: {
      anime_to_character: "Who is one of the main characters in {title}?",
      character_to_anime: "Which anime lists “{character}” as a main character?",
      character_to_character: "Who is a main character in the same anime as “{character}”?",
    },
    feedback: {
      anime_to_character: {
        correct: "Correct! “{answer}” is a main character in {title}.",
        incorrect: "Not quite; “{answer}” is a main character in {title}.",
      },
      character_to_anime: {
        correct: "Correct! “{character}” is a main character in {answer}.",
        incorrect: "Not quite; “{character}” is a main character in {answer}.",
      },
      character_to_character: {
        correct: "Correct! “{character}” and “{answer}” are both main characters in {title}.",
        incorrect: "Not quite; “{character}” and “{answer}” are both main characters in {title}.",
      },
    },
    source_link_label: "Open {title} on AniList",
    attribution: "Relationships come from AniList; this is text only.",
    terms_label: "Read the AniList API terms",
  },
};

const config = (language = "en", overrides = {}) => ({
  page_lang: language,
  timeout_ms: 10000,
  max_response_chars: 262144,
  recent_history_size: 16,
  source: {
    id: "anilist_role", adapter: "anilist_role", endpoint: "https://graphql.anilist.co", method: "POST",
    page_min: 1, page_max: 60, media_per_page: 6, characters_per_media: 10,
    source_home: "https://anilist.co/", terms_url: "https://docs.anilist.co/guide/terms-of-use",
  },
  copy: commonCopy[language],
  source_copy: sourceCopy[language],
  ...overrides,
});

const fixture = (language = "en", overrides = {}) => `
  <div data-acg-relation-quiz>
    <div data-acg-enhanced hidden>
      <p data-privacy>disclosure</p>
      <div data-acg-interactive hidden>
        <details data-acg-settings><summary><span data-acg-settings-summary></span></summary>
          <label><input type="checkbox" value="anime_to_character" data-acg-kind></label>
          <label><input type="checkbox" value="character_to_anime" data-acg-kind></label>
          <label><input type="checkbox" value="character_to_character" data-acg-kind></label>
          <button type="button" data-acg-settings-reset>${commonCopy[language].settings_reset}</button>
          <button type="button" data-acg-settings-apply>${commonCopy[language].settings_apply}</button>
          <p data-acg-settings-status></p>
        </details>
        <button type="button" data-acg-start>${commonCopy[language].start}</button>
        <div data-acg-round hidden>
          <p data-acg-prompt tabindex="-1"></p>
          <div data-acg-options role="group"></div>
        </div>
        <p data-acg-status aria-live="polite"></p>
        <div data-acg-source hidden>
          <a data-acg-source-link></a><p data-acg-attribution></p>
          <a data-acg-terms-link href="https://docs.anilist.co/guide/terms-of-use"></a>
        </div>
      </div>
    </div>
    <script type="application/json" data-acg-config>${JSON.stringify(config(language, overrides))}</script>
  </div>`;

const edge = (id, role, name = `Character ${id}`, native = null) => ({
  role,
  node: { id, name: { full: name, native } },
});
const media = ({ id = 100, isAdult = false, genres = ["Adventure"], tags = [], title = "Example Anime", edges } = {}) => ({
  id, isAdult, genres, tags, siteUrl: `https://anilist.co/anime/${id}`,
  title: { english: title, romaji: title, native: `原文${id}` },
  characters: { edges: edges || [
    edge(id * 10 + 1, "MAIN", "Main Hero"),
    edge(id * 10 + 2, "SUPPORTING", "Support One"),
    edge(id * 10 + 3, "SUPPORTING", "Support Two"),
    edge(id * 10 + 4, "SUPPORTING", "Support Three"),
  ] },
});

const payload = (entries = [media()]) => ({ data: { Page: { media: entries } } });

const install = async (page, language = "en", overrides = {}, beforeScripts) => {
  await page.setContent(fixture(language, overrides));
  if (beforeScripts) await beforeScripts(page);
  await page.addScriptTag({ path: logicPath });
  await page.addScriptTag({ path: controllerPath });
  await expect(page.locator("[data-acg-relation-quiz]")).toHaveAttribute("data-acg-ready", "true");
};

const routeAniList = async (page, body, requests, status = 200) => {
  await page.route("https://graphql.anilist.co/**", async (route) => {
    const request = route.request();
    requests.push({ method: request.method(), postData: request.postData() });
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "Content-Type, Accept",
        },
      });
      return;
    }
    await route.fulfill({
      status,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  });
};

const useRandomSequence = async (page, values) => {
  await page.evaluate((sequence) => {
    let index = 0;
    Object.defineProperty(globalThis.crypto, "getRandomValues", {
      configurable: true,
      value(array) {
        array[0] = sequence[Math.min(index, sequence.length - 1)] || 0;
        index += 1;
        return array;
      },
    });
  }, values);
};

test("no request occurs before the explicit start and one POST forms four text options", async ({ page }) => {
  const requests = [];
  await routeAniList(page, payload(), requests);
  await install(page, "en");
  expect(requests).toEqual([]);
  await page.getByRole("button", { name: "Start a round" }).click();
  await expect(page.locator("[data-acg-options] button")).toHaveCount(4);
  await expect(page.locator("[data-acg-prompt]")).toHaveText("Who is one of the main characters in Example Anime?");
  await expect(page.locator("[data-acg-prompt]")).toBeFocused();

  const posts = requests.filter((request) => request.method === "POST");
  const preflights = requests.filter((request) => request.method === "OPTIONS");
  expect(posts).toHaveLength(1);
  // Chromium may reuse its preflight cache; the disclosure therefore says
  // the permission check normally occurs instead of promising one OPTIONS.
  expect(preflights.length).toBeLessThanOrEqual(1);
  const body = JSON.parse(posts[0].postData);
  expect(body.variables.page).toBeGreaterThanOrEqual(1);
  expect(body.variables.page).toBeLessThanOrEqual(60);
  expect(body.query).toContain("isAdult: false");
  expect(body.query).toContain("tag_not_in");
  expect(body.query).not.toContain("coverImage");
});

test("answering disables choices and reveals only the exact AniList source", async ({ page }) => {
  const requests = [];
  await routeAniList(page, payload(), requests);
  await install(page, "en");
  await page.getByRole("button", { name: "Start a round" }).click();
  await page.getByRole("button", { name: "Main Hero" }).click();
  await expect(page.locator("[data-acg-status]")).toHaveText(
    "Correct! “Main Hero” is a main character in Example Anime.",
  );
  await expect(page.locator("[data-acg-source]")).toBeVisible();
  await expect(page.locator("[data-acg-source-link]")).toHaveAttribute("href", "https://anilist.co/anime/100");
  expect(await page.locator("[data-acg-options] button").evaluateAll((buttons) => buttons.every((button) => button.disabled))).toBe(true);
  expect(requests.filter((request) => request.method === "POST")).toHaveLength(1);
});

test("Chinese choices retain a native character name beside AniList's Latin display name", async ({ page }) => {
  const requests = [];
  await routeAniList(page, payload([media({ edges: [
    edge(1, "MAIN", "Yoshiki Tsujinaka", "辻中佳纪"),
    edge(2, "SUPPORTING", "Tanaka", "田中"),
    edge(3, "SUPPORTING", "Toshinori Tsujinaka", "辻中敏则"),
    edge(4, "SUPPORTING", "Satoko Tsujinaka", "辻中佐都子"),
  ] })]), requests);
  await install(page, "zh");
  await page.getByRole("button", { name: "开始一题" }).click();
  await expect(page.getByRole("button", { name: "辻中佳纪（Yoshiki Tsujinaka）" })).toBeVisible();
  expect(requests.filter((request) => request.method === "POST")).toHaveLength(1);
});

test("format settings require one choice and restrict the next round without requesting data", async ({ page }) => {
  const requests = [];
  const entries = [
    media({ id: 100, title: "Anime A", edges: [edge(1, "MAIN", "Hero A"), edge(2, "SUPPORTING"), edge(3, "SUPPORTING"), edge(4, "SUPPORTING")] }),
    media({ id: 101, title: "Anime B", edges: [edge(11, "MAIN", "Hero B")] }),
    media({ id: 102, title: "Anime C", edges: [edge(21, "MAIN", "Hero C")] }),
    media({ id: 103, title: "Anime D", edges: [edge(31, "MAIN", "Hero D")] }),
  ];
  await routeAniList(page, payload(entries), requests);
  await install(page, "en", {}, (currentPage) => useRandomSequence(currentPage, [0]));

  await page.locator("[data-acg-settings] summary").click();
  for (const value of ["anime_to_character", "character_to_anime", "character_to_character"]) {
    await page.locator(`[data-acg-kind][value="${value}"]`).uncheck();
  }
  await page.getByRole("button", { name: "Apply settings" }).click();
  await expect(page.locator("[data-acg-settings-status]")).toHaveText("Select at least one format.");
  expect(requests).toEqual([]);

  await page.locator('[data-acg-kind][value="character_to_anime"]').check();
  await page.getByRole("button", { name: "Apply settings" }).click();
  await expect(page.locator("[data-acg-settings-summary]")).toHaveText("Main character → anime");
  expect(requests).toEqual([]);

  await page.getByRole("button", { name: "Start a round" }).click();
  await expect(page.locator("[data-acg-prompt]")).toHaveText(
    "Which anime lists “Hero A” as a main character?",
  );
  expect(requests.filter((request) => request.method === "POST")).toHaveLength(1);
});

test("a protagonist clue can ask for one of four anime without another request", async ({ page }) => {
  const requests = [];
  const entries = [
    media({ id: 100, title: "Anime A", edges: [edge(1, "MAIN", "Hero A"), edge(2, "SUPPORTING"), edge(3, "SUPPORTING"), edge(4, "SUPPORTING")] }),
    media({ id: 101, title: "Anime B", edges: [edge(11, "MAIN", "Hero B"), edge(12, "SUPPORTING"), edge(13, "SUPPORTING"), edge(14, "SUPPORTING")] }),
    media({ id: 102, title: "Anime C", edges: [edge(21, "MAIN", "Hero C"), edge(22, "SUPPORTING"), edge(23, "SUPPORTING"), edge(24, "SUPPORTING")] }),
    media({ id: 103, title: "Anime D", edges: [edge(31, "MAIN", "Hero D"), edge(32, "SUPPORTING"), edge(33, "SUPPORTING"), edge(34, "SUPPORTING")] }),
  ];
  await routeAniList(page, payload(entries), requests);
  await install(page, "en", {}, (currentPage) => useRandomSequence(currentPage, [0, 1, 0]));
  await page.getByRole("button", { name: "Start a round" }).click();
  await expect(page.locator("[data-acg-prompt]")).toHaveText(
    "Which anime lists “Hero A” as a main character?",
  );
  await expect(page.locator("[data-acg-options] button")).toHaveText([
    "Anime A", "Anime B", "Anime C", "Anime D",
  ]);
  await page.getByRole("button", { name: "Anime A" }).click();
  await expect(page.locator("[data-acg-status]")).toHaveText(
    "Correct! “Hero A” is a main character in Anime A.",
  );
  expect(requests.filter((request) => request.method === "POST")).toHaveLength(1);
});

test("a protagonist clue can ask for a co-main character from the same anime", async ({ page }) => {
  const requests = [];
  const entries = [
    media({ id: 100, title: "Two Leads", edges: [edge(1, "MAIN", "Lead One"), edge(5, "MAIN", "Lead Two")] }),
    media({ id: 101, title: "Anime B", edges: [edge(11, "MAIN", "Other B")] }),
    media({ id: 102, title: "Anime C", edges: [edge(21, "MAIN", "Other C")] }),
    media({ id: 103, title: "Anime D", edges: [edge(31, "MAIN", "Other D")] }),
  ];
  await routeAniList(page, payload(entries), requests);
  await install(page, "en", {}, (currentPage) => useRandomSequence(currentPage, [0, 1, 0]));
  await page.getByRole("button", { name: "Start a round" }).click();
  await expect(page.locator("[data-acg-prompt]")).toHaveText(
    "Who is a main character in the same anime as “Lead One”?",
  );
  await page.getByRole("button", { name: "Lead Two" }).click();
  await expect(page.locator("[data-acg-status]")).toHaveText(
    "Correct! “Lead One” and “Lead Two” are both main characters in Two Leads.",
  );
  expect(requests.filter((request) => request.method === "POST")).toHaveLength(1);
});

test("adult, sensitive, and incomplete responses fail without a second query", async ({ page }) => {
  const requests = [];
  await routeAniList(page, payload([
    media({ id: 1, isAdult: true }),
    media({ id: 2, genres: ["Ecchi"] }),
    media({ id: 5, tags: [{ name: "Nudity", isAdult: false }] }),
    media({ id: 3, title: "Pornographic Example" }),
    media({ id: 4, edges: [edge(41, "MAIN"), edge(42, "SUPPORTING")] }),
  ]), requests);
  await install(page, "en");
  await page.getByRole("button", { name: "Start a round" }).click();
  await expect(page.locator("[data-acg-status]")).toHaveText(commonCopy.en.no_round_error);
  await page.waitForTimeout(50);
  expect(requests.filter((request) => request.method === "POST")).toHaveLength(1);
});

test("HTTP errors, malformed JSON, GraphQL errors, and oversized bodies never retry", async ({ page }) => {
  for (const failure of [
    { body: "unavailable", status: 503 },
    { body: "{", status: 200 },
    { body: JSON.stringify({ errors: [{ message: "disabled" }] }), status: 200 },
    { body: "x".repeat(70000), status: 200 },
  ]) {
    const requests = [];
    await page.unrouteAll({ behavior: "wait" });
    await routeAniList(page, failure.body, requests, failure.status);
    await install(page, "en", failure.body.length > 70000 ? { max_response_chars: 65536 } : {});
    await page.getByRole("button", { name: "Start a round" }).click();
    await expect(page.locator("[data-acg-status]")).toHaveText(commonCopy.en.network_error);
    expect(requests.filter((request) => request.method === "POST")).toHaveLength(1);
  }
});

test("hostile names render as text without creating elements or requests", async ({ page }) => {
  const requests = [];
  const hostile = '<img src="https://attacker.invalid/probe" onerror="globalThis.__acgXss=true">';
  await routeAniList(page, payload([media({ edges: [
    edge(1, "MAIN", hostile), edge(2, "SUPPORTING"), edge(3, "SUPPORTING"), edge(4, "SUPPORTING"),
  ] })]), requests);
  await page.route("https://attacker.invalid/**", (route) => route.abort());
  await install(page, "en");
  await page.getByRole("button", { name: "Start a round" }).click();
  await expect(page.locator("[data-acg-options] button")).toHaveCount(4);
  await expect(page.locator("[data-acg-relation-quiz] img")).toHaveCount(0);
  expect(await page.evaluate(() => globalThis.__acgXss)).toBeUndefined();
  expect(requests.filter((request) => request.method === "POST")).toHaveLength(1);
});

test("untrusted configuration fails closed before the component becomes interactive", async ({ page }) => {
  await page.setContent(fixture("en", { source: { ...config("en").source, endpoint: "https://attacker.invalid/graphql" } }));
  await page.addScriptTag({ path: logicPath });
  await page.addScriptTag({ path: controllerPath });
  await expect(page.locator("[data-acg-interactive]")).toBeHidden();
  await expect(page.locator("[data-acg-relation-quiz]")).not.toHaveAttribute("data-acg-ready", "true");
});

test("secure random failure is explicit and sends no request", async ({ page }) => {
  const requests = [];
  await routeAniList(page, payload(), requests);
  await install(page, "en", {}, async (currentPage) => {
    await currentPage.evaluate(() => {
      Object.defineProperty(globalThis.crypto, "getRandomValues", {
        configurable: true,
        value() { throw new Error("random unavailable"); },
      });
    });
  });
  await page.getByRole("button", { name: "Start a round" }).click();
  await expect(page.locator("[data-acg-status]")).toHaveText(commonCopy.en.random_error);
  expect(requests).toEqual([]);
});

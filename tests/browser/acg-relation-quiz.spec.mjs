import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const logicPath = path.resolve(here, "../../assets/js/acg-relation-quiz-logic.js");
const controllerPath = path.resolve(here, "../../assets/js/acg-relation-quiz.js");

const commonCopy = {
  zh: {
    start: "开始一题", again: "再来一题", retry: "重试", options_label: "候选答案",
    correct: "答对了！AniList 将 {answer} 列为 MAIN（主要角色）。", incorrect: "没猜中；答案是 {answer}。",
    network_error: "暂时没能取得本题数据，请稍后主动重试。",
    no_round_error: "本次响应没有形成一组无歧义的四选一题目；你可以主动重试。",
    random_error: "浏览器无法提供可靠随机数，暂时不能出题。",
  },
  en: {
    start: "Start a round", again: "Another round", retry: "Try again", options_label: "Answer choices",
    correct: "Correct! AniList lists {answer} as MAIN.", incorrect: "Not quite; the answer is {answer}.",
    network_error: "The data for this round could not be retrieved just now. Please try again later.",
    no_round_error: "This response did not form an unambiguous four-choice round. You can try again manually.",
    random_error: "This browser cannot provide secure randomness, so a round cannot be created.",
  },
};

const sourceCopy = {
  zh: {
    loading: "正在从 AniList 取得一小批角色关系……",
    question: "《{title}》的主角之一是谁？",
    source_link_label: "在 AniList 查看《{title}》",
    attribution: "关系来自 AniList；只显示文字。",
    terms_label: "查看 AniList API 使用条款",
  },
  en: {
    loading: "Reading a small batch of character relationships from AniList…",
    question: "Who is one of the main characters in {title}?",
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

const edge = (id, role, name = `Character ${id}`) => ({ role, node: { id, name: { full: name, native: null } } });
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
  await expect(page.locator("[data-acg-status]")).toHaveText("Correct! AniList lists Main Hero as MAIN.");
  await expect(page.locator("[data-acg-source]")).toBeVisible();
  await expect(page.locator("[data-acg-source-link]")).toHaveAttribute("href", "https://anilist.co/anime/100");
  expect(await page.locator("[data-acg-options] button").evaluateAll((buttons) => buttons.every((button) => button.disabled))).toBe(true);
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

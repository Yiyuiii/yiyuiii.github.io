import assert from "node:assert/strict";
import test from "node:test";

await import("../assets/js/encyclopedia-quiz-logic.js");

const logic = globalThis.yiyuiiiEncyclopediaQuizLogic;
const NONCE = "0123456789abcdef0123456789abcdef";

const source = (id) => ({ id, ...logic.SOURCE_DEFINITIONS[id] });

const makeRandom = (samples = [0]) => {
  let index = 0;
  return {
    uintBelow(maximum) {
      assert.ok(Number.isSafeInteger(maximum) && maximum > 0);
      const sample = samples[Math.min(index, samples.length - 1)];
      index += 1;
      return sample % maximum;
    },
  };
};

const wikipediaPage = ({
  categories = ["Category:Living people"],
  extract = "Ada Example is a fictional researcher whose long introduction contains enough ordinary words to make a useful quiz clue.",
  pageprops = {},
  revid = 101,
  title = "Ada Example",
} = {}) => ({
  categories: categories.map((category) => ({ title: category })),
  extract,
  ns: 0,
  pageprops,
  revisions: [{ revid, timestamp: "2026-08-05T00:00:00Z" }],
  title,
});

const normalizedEntry = ({
  key,
  language = "en",
  semanticType = "person",
  title,
  plainIntroduction,
} = {}) => Object.freeze({
  key: key || title.toLocaleLowerCase("en-US"),
  language,
  maskTerms: logic.buildMaskTerms(title, language),
  plainIntroduction: plainIntroduction || `${title} is an example entry with a sufficiently long introduction for deterministic testing of this quiz.`,
  revisionId: 1,
  semanticType,
  sourceId: language === "en" ? "wikipedia_en" : "wikipedia_zh",
  sourceUrl: "https://en.wikipedia.org/w/index.php?oldid=1",
  title,
});

test("the frozen namespace exposes an exact source allowlist", () => {
  assert.ok(Object.isFrozen(logic));
  assert.ok(Object.isFrozen(logic.SOURCE_DEFINITIONS));
  assert.deepEqual(Object.keys(logic.SOURCE_DEFINITIONS).sort(), [
    "moegirl_zh",
    "wikipedia_en",
    "wikipedia_zh",
  ]);
  assert.deepEqual(logic.validateSource(source("wikipedia_en")), {
    adapter: "wikipedia",
    batchSize: 20,
    endpoint: "https://en.wikipedia.org/w/api.php",
    id: "wikipedia_en",
    language: "en",
  });
  assert.throws(() => logic.validateSource({
    ...source("wikipedia_en"),
    endpoint: "https://en.wikipedia.org.evil.example/w/api.php",
  }), /unexpected quiz source/);
  assert.throws(() => logic.validateSource({
    ...source("wikipedia_en"),
    endpoint: "https://en.wikipedia.org/w/api.php?redirect=evil",
  }), /unexpected quiz source/);
  assert.throws(() => logic.validateSource({
    ...source("wikipedia_en"),
    batchSize: 21,
  }), /unexpected quiz source/);
  assert.throws(() => logic.validateSource({
    ...source("wikipedia_en"),
    id: "unknown",
  }), /unexpected quiz source/);
});

test("Moegirl request URL contains the bounded one-batch protocol", () => {
  const url = new URL(logic.buildApiUrl(source("moegirl_zh"), NONCE));
  assert.equal(url.origin + url.pathname, "https://zh.moegirl.org.cn/api.php");
  assert.equal(url.searchParams.get("generator"), "random");
  assert.equal(url.searchParams.get("grnnamespace"), "0");
  assert.equal(url.searchParams.get("grnfilterredir"), "nonredirects");
  assert.equal(url.searchParams.get("grnlimit"), "50");
  assert.equal(url.searchParams.get("prop"), "extracts|info|categories");
  assert.equal(url.searchParams.get("explaintext"), "1");
  assert.equal(url.searchParams.get("exchars"), "900");
  assert.equal(url.searchParams.get("exlimit"), "20");
  assert.equal(url.searchParams.get("inprop"), "url");
  assert.equal(url.searchParams.get("requestid"), NONCE);
  assert.equal(url.searchParams.get("origin"), "*");
  assert.equal(url.searchParams.get("maxage"), "0");
  assert.equal(url.searchParams.get("smaxage"), "0");
  assert.equal(url.searchParams.get("rvprop"), null);
});

test("Wikipedia request URLs use plain extracts and latest revision metadata", () => {
  for (const id of ["wikipedia_zh", "wikipedia_en"]) {
    const url = new URL(logic.buildApiUrl(source(id), NONCE.toUpperCase()));
    assert.equal(url.hostname, id === "wikipedia_en" ? "en.wikipedia.org" : "zh.wikipedia.org");
    assert.equal(url.pathname, "/w/api.php");
    assert.equal(url.searchParams.get("grnlimit"), "20");
    assert.equal(url.searchParams.get("prop"), "extracts|categories|pageprops|revisions");
    assert.equal(url.searchParams.get("explaintext"), "1");
    assert.equal(url.searchParams.get("rvprop"), "ids|timestamp");
    assert.equal(url.searchParams.get(["rv", "limit"].join("")), null);
    assert.equal(url.searchParams.get("inprop"), null);
    assert.equal(url.searchParams.get("requestid"), NONCE);
  }
  assert.throws(() => logic.buildApiUrl(source("wikipedia_en"), "short"), /nonce/);
  assert.throws(() => logic.buildApiUrl(source("wikipedia_en"), `${NONCE}00`), /nonce/);
});

test("text normalization removes controls without interpreting marker-like text", () => {
  const hostile = "  Ａda\u202E  <img src=x onerror=alert(1)>\u0000  ";
  assert.equal(
    logic.normalizeText(hostile),
    "Ada <img src=x onerror=alert(1)>",
  );
  assert.equal(logic.titleKey("  ＡDA Example ", "en"), "ada example");
  assert.deepEqual(logic.buildMaskTerms("Series: Ada Example (novel)", "en"), [
    "Series: Ada Example (novel)",
    "Series: Ada Example",
    "Ada Example (novel)",
    "Ada Example",
  ]);
});

test("Chinese and English introductions require a title-anchored leading subject", () => {
  const zh = logic.anonymizeIntroduction(
    "星海旅人(英语: Stellar Walker),又称小星,是一部虚构小说,讲述一段跨越群星的漫长旅程,并描绘了多位旅行者相遇和成长的故事。",
    { language: "zh", title: "星海旅人", redaction: "⬛" },
  );
  assert.ok(zh?.startsWith("⬛是一部虚构小说"));
  assert.ok(!zh.includes("星海旅人"));
  assert.ok(!zh.includes("Stellar Walker"));

  const en = logic.anonymizeIntroduction(
    "Ada Example (also called The Sample) is a fictional scientist whose biography is intentionally long enough for this clue.",
    { language: "en", title: "Ada Example", redaction: "⬛" },
  );
  assert.ok(en?.startsWith("⬛ is a fictional scientist"));
  assert.ok(!/Ada Example/iu.test(en));
  assert.ok(!/The Sample/iu.test(en));

  assert.equal(logic.anonymizeIntroduction(
    "However, it is a fictional scientist whose biography is intentionally long enough for this clue.",
    { language: "en", title: "Ada Example" },
  ), null);
  assert.equal(logic.anonymizeIntroduction(
    "但是这是一个没有标题锚点、也不应仅凭普通的是字就通过匿名化闸门的长导言。",
    { language: "zh", title: "星海旅人" },
  ), null);
});

test("anonymization masks every candidate title and leaves hostile markup inert text", () => {
  const clue = logic.anonymizeIntroduction(
    "Ada Example is compared with Beta Person and <img src=x onerror=alert(1)> in this sufficiently long introduction.",
    {
      language: "en",
      terms: ["Beta Person"],
      title: "Ada Example",
    },
  );
  assert.ok(clue);
  assert.ok(!clue.includes("Ada Example"));
  assert.ok(!clue.includes("Beta Person"));
  assert.ok(clue.includes("<img src=x onerror=alert(1)>"));

  const longUnicodeClue = logic.anonymizeIntroduction(
    `Ada Example is ${"🙂".repeat(500)}`,
    { language: "en", title: "Ada Example" },
  );
  assert.equal([...longUnicodeClue].length, 421);
  assert.ok(longUnicodeClue.endsWith("🙂…"));
});

test("Wikipedia categories map to six weighted types and reject ties or weak signals", () => {
  const cases = new Map([
    ["person", ["Category:Living people"]],
    ["place", ["Category:Cities in Exampleland"]],
    ["work", ["Category:English-language novels"]],
    ["organization", ["Category:Universities in Exampleland"]],
    ["organism", ["Category:Taxa named by Example"]],
    ["event", ["Category:Battles of the Example War"]],
  ]);
  for (const [expected, categories] of cases) {
    assert.equal(logic.classifyWikipedia(categories), expected);
  }
  assert.equal(logic.classifyWikipedia(["Category:Geography of Exampleland"]), "unknown");
  assert.equal(logic.classifyWikipedia([
    "Category:Living people",
    "Category:Cities in Exampleland",
  ]), "unknown");
  assert.equal(logic.classifyWikipedia([]), "unknown");
});

test("quality filters reject disambiguation, lists, dates, sensitive pages, and non-articles", () => {
  assert.equal(logic.isWikipediaQualityPage(wikipediaPage()), true);
  assert.equal(logic.isWikipediaQualityPage(wikipediaPage({
    pageprops: { disambiguation: "" },
  })), false);
  assert.equal(logic.isWikipediaQualityPage(wikipediaPage({ title: "List of examples" })), false);
  assert.equal(logic.isWikipediaQualityPage(wikipediaPage({ title: "2026" })), false);
  assert.equal(logic.isWikipediaQualityPage(wikipediaPage({
    extract: "Ada Example is a pornographic work whose introduction is deliberately long enough to otherwise pass filtering.",
  })), false);

  assert.equal(logic.isMoegirlQualityPage({
    categories: [{ title: "Category:虚构角色" }],
    extract: "露娜是某部作品中登场的角色,拥有足够长的导言以供测试。",
    ns: 0,
    title: "露娜",
  }), true);
  assert.equal(logic.isMoegirlQualityPage({
    categories: [{ title: "Category:音乐作品" }],
    extract: "露娜是某部作品中登场的角色,拥有足够长的导言以供测试。",
    ns: 0,
    title: "露娜",
  }), false);
});

test("remote Wikipedia pages normalize to exact revision links and deduplicate titles", () => {
  const payload = {
    query: {
      pages: [
        wikipediaPage({ revid: 456, title: "Ada Example" }),
        wikipediaPage({ revid: 789, title: "Ａda Example" }),
        wikipediaPage({ pageprops: { disambiguation: "" }, title: "Rejected" }),
      ],
    },
  };
  const entries = logic.normalizePages(payload, source("wikipedia_en"));
  assert.equal(entries.length, 1);
  assert.equal(entries[0].key, "ada example");
  assert.equal(entries[0].semanticType, "person");
  assert.equal(entries[0].revisionId, 456);
  assert.equal(entries[0].sourceUrl, "https://en.wikipedia.org/w/index.php?oldid=456");
  assert.ok(Object.isFrozen(entries));
  assert.ok(Object.isFrozen(entries[0]));
  assert.equal(logic.safeSourceUrl(null, source("wikipedia_zh"), "12"), "https://zh.wikipedia.org/w/index.php?oldid=12");
  assert.equal(logic.safeSourceUrl(null, source("wikipedia_zh"), "1.5"), null);
});

test("remote Moegirl pages keep the existing character-related filter and safe URL", () => {
  const page = {
    categories: [{ title: "Category:虚构角色" }],
    extract: "露娜是某部幻想作品中登场的角色,她拥有足够长的文字导言来构成一条安全的测试线索。",
    fullurl: "https://zh.moegirl.org.cn/%E9%9C%B2%E5%A8%9C",
    ns: 0,
    title: "露娜",
  };
  const entries = logic.normalizePages({ query: { pages: [page] } }, source("moegirl_zh"));
  assert.equal(entries.length, 1);
  assert.equal(entries[0].semanticType, "moegirl_character");
  assert.equal(entries[0].sourceUrl, page.fullurl);
  assert.equal(logic.normalizePages({
    query: { pages: [{ ...page, fullurl: "https://zh.moegirl.org.cn.evil.example/露娜" }] },
  }, source("moegirl_zh")).length, 0);
  assert.equal(logic.safeSourceUrl("javascript:alert(1)", source("moegirl_zh")), null);
});

test("round creation chooses an eligible answer before three same-type distractors", () => {
  const entries = [
    normalizedEntry({
      plainIntroduction: "Ada Example is compared with Beta Person in this sufficiently long introduction used to verify shared masking.",
      title: "Ada Example",
    }),
    normalizedEntry({ title: "Beta Person" }),
    normalizedEntry({ title: "Gamma Person" }),
    normalizedEntry({ title: "Delta Person" }),
    normalizedEntry({ title: "Example City", semanticType: "place" }),
    normalizedEntry({ title: "Example River", semanticType: "place" }),
    normalizedEntry({ title: "Example Mountain", semanticType: "place" }),
    normalizedEntry({ title: "Example Island", semanticType: "place" }),
  ];
  const round = logic.createRound(entries, { randomApi: makeRandom([0]), redaction: "⬛" });
  assert.equal(round.semanticType, "person");
  assert.equal(round.answerKey, "ada example");
  assert.equal(round.options.length, 4);
  assert.equal(new Set(round.options.map((option) => option.key)).size, 4);
  assert.deepEqual(new Set(round.usedKeys), new Set([
    "ada example",
    "beta person",
    "gamma person",
    "delta person",
  ]));
  assert.ok(!round.clue.includes("Ada Example"));
  assert.ok(!round.clue.includes("Beta Person"));
  assert.ok(Object.isFrozen(round));
  assert.ok(Object.isFrozen(round.options));
});

test("round creation rejects missing groups, recent-only groups, and bad randomness", () => {
  const three = ["Ada Example", "Beta Person", "Gamma Person"]
    .map((title) => normalizedEntry({ title }));
  assert.throws(() => logic.createRound(three, { randomApi: makeRandom() }), (error) => (
    error.code === "no_clue" && /viable/.test(error.message)
  ));

  const four = [...three, normalizedEntry({ title: "Delta Person" })];
  assert.throws(() => logic.createRound(four, {
    randomApi: makeRandom(),
    recentKeys: four.map((entry) => entry.key),
  }), /viable/);
  assert.throws(() => logic.createRound(four, { randomApi: null }), (error) => (
    error.code === "random" && /randomness/.test(error.message)
  ));
  assert.throws(() => logic.sampleWithoutReplacement(four, 2, {
    uintBelow() { return 99; },
  }), /invalid index/);
});

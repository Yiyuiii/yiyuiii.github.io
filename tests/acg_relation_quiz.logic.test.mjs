import assert from "node:assert/strict";
import test from "node:test";

await import("../assets/js/acg-relation-quiz-logic.js");
const logic = globalThis.yiyuiiiAcgRelationQuizLogic;

const source = () => ({ id: "anilist_role", ...logic.SOURCE_DEFINITIONS.anilist_role });

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

const edge = (id, role, name = `Character ${id}`) => ({
  role,
  node: { id, name: { full: name, native: `原文${id}` } },
});

const media = ({
  id = 100,
  title = { english: "Example Anime", native: "作品原文", romaji: "Example Anime" },
  isAdult = false,
  genres = ["Adventure"],
  tags = [],
  siteUrl = `https://anilist.co/anime/${id}`,
  edges = [edge(1, "MAIN"), edge(2, "SUPPORTING"), edge(3, "SUPPORTING"), edge(4, "SUPPORTING")],
} = {}) => ({
  characters: { edges },
  genres,
  id,
  isAdult,
  tags,
  siteUrl,
  title,
});

test("the frozen source allowlist contains only the audited AniList adapter", () => {
  assert.ok(Object.isFrozen(logic));
  assert.deepEqual(logic.ROUND_KINDS, [
    "anime_to_character",
    "character_to_anime",
    "character_to_character",
  ]);
  assert.deepEqual(logic.normalizeRoundKinds(), logic.ROUND_KINDS);
  assert.deepEqual(logic.normalizeRoundKinds(["character_to_anime", "character_to_anime"]), [
    "character_to_anime",
  ]);
  assert.throws(() => logic.normalizeRoundKinds([]), /at least one/);
  assert.deepEqual(Object.keys(logic.SOURCE_DEFINITIONS), ["anilist_role"]);
  assert.deepEqual(logic.validateSource(source()), {
    adapter: "anilist_role",
    charactersPerMedia: 10,
    endpoint: "https://graphql.anilist.co",
    id: "anilist_role",
    mediaPerPage: 6,
    method: "POST",
    pageMax: 60,
    pageMin: 1,
  });
  assert.throws(() => logic.validateSource({ ...source(), endpoint: "https://evil.example/graphql" }), /unexpected/);
  assert.throws(() => logic.validateSource({ ...source(), pageMax: 61 }), /bounds/);
});

test("the request body fixes one bounded page and the text-only filters", () => {
  const request = logic.buildAniListRequest(source(), 27);
  assert.equal(request.endpoint, "https://graphql.anilist.co");
  assert.equal(request.method, "POST");
  const body = JSON.parse(request.body);
  assert.deepEqual(body.variables, { page: 27 });
  assert.equal(body.query, logic.ANILIST_QUERY);
  assert.match(body.query, /perPage: 6/u);
  assert.match(body.query, /characters\(perPage: 10/u);
  assert.match(body.query, /isAdult: false/u);
  assert.match(body.query, /genre_not_in: \["Ecchi", "Hentai"\]/u);
  assert.match(body.query, /tag_not_in:/u);
  assert.match(body.query, /tags \{ name isAdult \}/u);
  assert.doesNotMatch(body.query, /coverImage|description|bannerImage/u);
  assert.throws(() => logic.buildAniListRequest(source(), 0), /page/);
  assert.throws(() => logic.buildAniListRequest(source(), 61), /page/);
});

test("normalization keeps exact MAIN and SUPPORTING roles with a safe source link", () => {
  const payload = { data: { Page: { media: [media()] } } };
  const entries = logic.normalizeAniList(payload, "en");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].title, "Example Anime");
  assert.equal(entries[0].main.length, 1);
  assert.equal(entries[0].supporting.length, 3);
  assert.equal(entries[0].characters.length, 4);
  assert.equal(entries[0].sourceUrl, "https://anilist.co/anime/100");
  assert.ok(Object.isFrozen(entries));
  assert.ok(Object.isFrozen(entries[0]));
});

test("Chinese mode explicitly preserves native and romanized titles", () => {
  const entries = logic.normalizeAniList({ data: { Page: { media: [media()] } } }, "zh");
  assert.equal(entries[0].title, "作品原文（Example Anime）");
  assert.equal(entries[0].main[0].name, "原文1（Character 1）");
});

test("adult flags, blocked genres and tags, local keywords, unsafe URLs, and incomplete roles fail closed", () => {
  const payload = { data: { Page: { media: [
    media({ id: 1, isAdult: true }),
    media({ id: 2, genres: ["Ecchi"] }),
    media({ id: 7, tags: [{ name: "Nudity", isAdult: false }] }),
    media({ id: 8, tags: [{ name: "Suggestive", isAdult: true }] }),
    media({ id: 3, title: { english: "Pornographic Example", romaji: "Safe", native: "Safe" } }),
    media({ id: 4, siteUrl: "https://anilist.co.evil.example/anime/4" }),
    media({ id: 5, edges: [edge(10, "SUPPORTING"), edge(11, "SUPPORTING")] }),
    media({ id: 6, edges: [edge(60, "MAIN", "Rape"), edge(61, "SUPPORTING"), edge(62, "SUPPORTING"), edge(63, "SUPPORTING")] }),
  ] } } };
  assert.equal(logic.normalizeAniList(payload, "en").length, 0);
});

test("Latin keyword boundaries do not reject unrelated names", () => {
  const entries = logic.normalizeAniList({ data: { Page: { media: [media({
    title: { english: "Grapefruit", native: "グレープフルーツ", romaji: "Grapefruit" },
    edges: [
      edge(1, "MAIN", "Grapefruit"),
      edge(2, "SUPPORTING"),
      edge(3, "SUPPORTING"),
      edge(4, "SUPPORTING"),
    ],
  })] } } }, "en");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].main[0].name, "Grapefruit");
});

test("hostile markup remains inert text and duplicate characters cannot fill options", () => {
  const hostile = media({
    edges: [
      edge(1, "MAIN", '<img src=x onerror="alert(1)">'),
      edge(2, "SUPPORTING"),
      edge(2, "SUPPORTING", "Duplicate"),
      edge(3, "SUPPORTING"),
      edge(4, "SUPPORTING"),
    ],
  });
  const entries = logic.normalizeAniList({ data: { Page: { media: [hostile] } } }, "en");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].main[0].name, '<img src=x onerror="alert(1)">');
  assert.equal(entries[0].supporting.length, 3);
});

test("round creation yields one MAIN answer and three SUPPORTING distractors", () => {
  const entries = logic.normalizeAniList({ data: { Page: { media: [media()] } } }, "en");
  const round = logic.createAniListRound(entries, { randomApi: makeRandom([0]) });
  assert.equal(round.answerKey, "anilist:100:1");
  assert.equal(round.answerLabel, "Character 1");
  assert.equal(round.kind, "anime_to_character");
  assert.equal(round.options.length, 4);
  assert.equal(new Set(round.options.map((option) => option.key)).size, 4);
  assert.equal(round.sourceUrl, "https://anilist.co/anime/100");
  assert.deepEqual(round.promptValues, { title: "Example Anime" });
  assert.deepEqual(round.feedbackValues, { answer: "Character 1", title: "Example Anime" });
  assert.ok(Object.isFrozen(round));
  assert.ok(Object.isFrozen(round.options));
});

test("round creation rejects exhausted history, incomplete data, and bad randomness", () => {
  const entries = logic.normalizeAniList({ data: { Page: { media: [media()] } } }, "en");
  assert.throws(() => logic.createAniListRound(entries, {
    randomApi: makeRandom(),
    recentKeys: ["anilist:round:anime-to-character:100:1"],
  }), (error) => error.code === "no_round");
  assert.throws(() => logic.createAniListRound([], { randomApi: makeRandom() }), /viable/);
  assert.throws(() => logic.createAniListRound(entries, { randomApi: null }), (error) => error.code === "random");
  assert.throws(() => logic.sampleWithoutReplacement(entries, 1, { uintBelow: () => 99 }), /invalid index/);
});

test("a main character can point back to one of four unambiguous anime", () => {
  const payload = { data: { Page: { media: [
    media({
      id: 100,
      title: { english: "Anime A", native: "作品甲", romaji: "Anime A" },
      edges: [edge(1, "MAIN", "Hero A"), edge(2, "SUPPORTING"), edge(3, "SUPPORTING"), edge(4, "SUPPORTING")],
    }),
    media({
      id: 101,
      title: { english: "Anime B", native: "作品乙", romaji: "Anime B" },
      edges: [edge(11, "MAIN", "Hero B"), edge(12, "SUPPORTING"), edge(13, "SUPPORTING"), edge(14, "SUPPORTING")],
    }),
    media({
      id: 102,
      title: { english: "Anime C", native: "作品丙", romaji: "Anime C" },
      edges: [edge(21, "MAIN", "Hero C"), edge(22, "SUPPORTING"), edge(23, "SUPPORTING"), edge(24, "SUPPORTING")],
    }),
    media({
      id: 103,
      title: { english: "Anime D", native: "作品丁", romaji: "Anime D" },
      edges: [edge(31, "MAIN", "Hero D"), edge(32, "SUPPORTING"), edge(33, "SUPPORTING"), edge(34, "SUPPORTING")],
    }),
  ] } } };
  const entries = logic.normalizeAniList(payload, "en");
  const round = logic.createAniListRound(entries, { randomApi: makeRandom([1, 0]) });
  assert.equal(round.kind, "character_to_anime");
  assert.deepEqual(round.promptValues, { character: "Hero A" });
  assert.equal(round.answerLabel, "Anime A");
  assert.equal(round.answerKey, "anilist:100");
  assert.equal(new Set(round.options.map((option) => option.label)).size, 4);
  assert.deepEqual(round.feedbackValues, { answer: "Anime A", character: "Hero A" });
});

test("enabled kinds restrict round creation without changing the response", () => {
  const payload = { data: { Page: { media: [
    media({ id: 100, title: { english: "Anime A", native: "甲", romaji: "Anime A" }, edges: [edge(1, "MAIN", "Hero A"), edge(2, "SUPPORTING"), edge(3, "SUPPORTING"), edge(4, "SUPPORTING")] }),
    media({ id: 101, title: { english: "Anime B", native: "乙", romaji: "Anime B" }, edges: [edge(11, "MAIN", "Hero B")] }),
    media({ id: 102, title: { english: "Anime C", native: "丙", romaji: "Anime C" }, edges: [edge(21, "MAIN", "Hero C")] }),
    media({ id: 103, title: { english: "Anime D", native: "丁", romaji: "Anime D" }, edges: [edge(31, "MAIN", "Hero D")] }),
  ] } } };
  const entries = logic.normalizeAniList(payload, "en");
  const round = logic.createAniListRound(entries, {
    allowedKinds: ["character_to_anime"],
    randomApi: makeRandom([0]),
  });
  assert.equal(round.kind, "character_to_anime");
});

test("one main character can identify a co-main character from the same anime", () => {
  const payload = { data: { Page: { media: [
    media({
      id: 100,
      title: { english: "Two Leads", native: "双主角", romaji: "Two Leads" },
      edges: [
        edge(1, "MAIN", "Lead One"), edge(5, "MAIN", "Lead Two"),
        edge(2, "SUPPORTING"), edge(3, "SUPPORTING"), edge(4, "SUPPORTING"),
      ],
    }),
    media({ id: 101, title: { english: "Anime B", native: "乙", romaji: "Anime B" }, edges: [edge(11, "MAIN", "Other B")] }),
    media({ id: 102, title: { english: "Anime C", native: "丙", romaji: "Anime C" }, edges: [edge(21, "MAIN", "Other C")] }),
    media({ id: 103, title: { english: "Anime D", native: "丁", romaji: "Anime D" }, edges: [edge(31, "MAIN", "Other D")] }),
  ] } } };
  const entries = logic.normalizeAniList(payload, "en");
  const round = logic.createAniListRound(entries, { randomApi: makeRandom([2, 0]) });
  assert.equal(round.kind, "character_to_character");
  assert.deepEqual(round.promptValues, { character: "Lead One" });
  assert.equal(round.answerLabel, "Lead Two");
  assert.equal(round.options.length, 4);
  assert.equal(new Set(round.options.map((option) => option.label)).size, 4);
  assert.deepEqual(round.feedbackValues, {
    answer: "Lead Two",
    character: "Lead One",
    title: "Two Leads",
  });
});

test("reverse formats reject duplicate titles and duplicate or cross-listed character clues", () => {
  const payload = { data: { Page: { media: [
    media({ id: 100, title: { english: "Same", native: "同名", romaji: "Same" }, edges: [edge(1, "MAIN", "Shared")] }),
    media({ id: 101, title: { english: "Same", native: "同名二", romaji: "Same" }, edges: [edge(11, "MAIN", "Other"), edge(12, "BACKGROUND", "Shared")] }),
    media({ id: 102, title: { english: "Third", native: "三", romaji: "Third" }, edges: [edge(1, "MAIN", "Shared")] }),
    media({ id: 103, title: { english: "Fourth", native: "四", romaji: "Fourth" }, edges: [edge(31, "MAIN", "Fourth Lead")] }),
  ] } } };
  const entries = logic.normalizeAniList(payload, "en");
  assert.throws(
    () => logic.createAniListRound(entries, { randomApi: makeRandom([1]) }),
    (error) => error.code === "no_round",
  );
});

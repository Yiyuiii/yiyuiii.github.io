import crypto from "node:crypto";

const API_ENDPOINT = "https://zh.moegirl.org.cn/api.php";
const REQUESTS = 5;
const REQUEST_DELAY_MS = 4000;
const CHARACTER_SIGNAL = /(?:登场|登場|出场)(?:的)?(?:角色|人物)|(?:角色|人物)之一|虚拟(?:UP主|主播|YouTuber)|V[Tt]uber|吉祥物|拟人(?:化形象|角色)/u;
const SENSITIVE_SIGNAL = /R-?18|成人向|色情|性行为|性暴力|强奸|乱伦|恋童|裸露|裸体|乳房|生殖器|自杀|自残|虐杀|血腥|猎奇|纳粹|政治人物/u;
const NON_ARTICLE_SIGNAL = /消歧义页|消歧义|条目列表|列表条目/u;
const NON_CHARACTER_TITLE_SIGNAL = /\/人格面具$/u;
const NON_CHARACTER_CATEGORY_SIGNAL = /Category:\S{0,80}(?:歌曲|音乐作品)/u;

if (!process.argv.includes("--run-live")) {
  console.error("This opt-in audit makes five rate-limited API requests. Re-run with --run-live.");
  process.exitCode = 2;
} else {

const normalizeText = (value) => String(value || "")
  .normalize("NFKC")
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, " ")
  .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu, "")
  .replace(/\s+/gu, " ")
  .trim();

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const expandTitleFragments = (value) => {
  const title = normalizeText(value);
  const symbols = [...title];
  const fragments = [
    title,
    title.replace(/^.*?:/u, ""),
    title.replace(/[（(].*?[）)]/gu, ""),
  ];
  if (!/\p{Script=Han}/u.test(title)) return fragments;
  for (let start = 0; start < symbols.length; start += 1) {
    for (let length = 2; length <= symbols.length - start; length += 1) {
      const fragment = symbols.slice(start, start + length).join("").trim();
      if (/\p{Script=Han}/u.test(fragment)) fragments.push(fragment);
    }
  }
  return fragments;
};

const anonymizeClue = (extract, terms) => {
  const replacement = "⬛";
  let clue = normalizeText(extract);
  let redacted = false;
  const withoutLeadingSubject = clue.replace(
    /^.{3,120}?(?=(?:是|为))/u,
    replacement,
  );
  if (withoutLeadingSubject !== clue) redacted = true;
  clue = withoutLeadingSubject;
  const masks = [...new Set(terms.map(normalizeText))]
    .filter((term) => term.length >= 1 && term.length <= 80)
    .sort((left, right) => right.length - left.length)
    .slice(0, 512);
  for (const term of masks) {
    const withoutTerm = clue.replace(new RegExp(escapeRegExp(term), "giu"), replacement);
    if (withoutTerm !== clue) redacted = true;
    clue = withoutTerm;
  }
  const withoutAlias = clue.replace(
    /((?:又称|亦称|也称|别名|昵称|外文名|英文名|日文名|罗马字)(?:是|为|作|写作|:)?)[^,。;；]{1,80}/gu,
    `$1${replacement}`,
  );
  if (withoutAlias !== clue) redacted = true;
  clue = withoutAlias;
  clue = clue.replace(/(?:\s*⬛\s*){2,}/gu, replacement);
  return redacted && clue.length >= 30 ? clue : null;
};

const buildUrl = () => {
  const url = new URL(API_ENDPOINT);
  url.search = new URLSearchParams({
    action: "query",
    generator: "random",
    grnnamespace: "0",
    grnfilterredir: "nonredirects",
    grnlimit: "50",
    prop: "extracts|info|categories",
    exintro: "1",
    explaintext: "1",
    exchars: "900",
    exlimit: "20",
    inprop: "url",
    cllimit: "max",
    format: "json",
    formatversion: "2",
    origin: "*",
    maxage: "0",
    smaxage: "0",
    requestid: crypto.randomBytes(16).toString("hex"),
  }).toString();
  return url;
};

const sleep = (milliseconds) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

const seenTitles = new Set();
const batches = [];
let crossBatchDuplicates = 0;

for (let index = 0; index < REQUESTS; index += 1) {
  const response = await fetch(buildUrl(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "yiyuiii-site-quality-audit/1.0 (one-off, low-rate)",
    },
  });
  const body = await response.text();
  const payload = JSON.parse(body);
  const pages = Array.isArray(payload?.query?.pages) ? payload.query.pages : [];
  const candidates = [];
  let characterSignals = 0;
  let sensitiveMatches = 0;
  let nonArticleMatches = 0;
  let nonCharacterMatches = 0;

  for (const page of pages) {
    const title = normalizeText(page.title);
    const extract = normalizeText(page.extract);
    const categories = Array.isArray(page.categories)
      ? page.categories.map((category) => normalizeText(category?.title)).join(" ")
      : "";
    const searchable = `${title} ${extract} ${categories}`;
    const titleKey = title.toLocaleLowerCase("zh-Hans-CN");
    if (seenTitles.has(titleKey)) crossBatchDuplicates += 1;
    seenTitles.add(titleKey);

    if (CHARACTER_SIGNAL.test(searchable)) characterSignals += 1;
    if (SENSITIVE_SIGNAL.test(searchable)) sensitiveMatches += 1;
    if (NON_ARTICLE_SIGNAL.test(categories)) nonArticleMatches += 1;
    if (
      NON_CHARACTER_TITLE_SIGNAL.test(title)
      || NON_CHARACTER_CATEGORY_SIGNAL.test(categories)
    ) nonCharacterMatches += 1;

    if (
      !title
      || !extract
      || !CHARACTER_SIGNAL.test(searchable)
      || SENSITIVE_SIGNAL.test(searchable)
      || NON_ARTICLE_SIGNAL.test(categories)
      || NON_CHARACTER_TITLE_SIGNAL.test(title)
      || NON_CHARACTER_CATEGORY_SIGNAL.test(categories)
    ) continue;

    const clue = anonymizeClue(extract, expandTitleFragments(title));
    candidates.push({
      title,
      clueAvailable: Boolean(clue),
      exactTitleLeak: Boolean(clue && clue.includes(title)),
    });
  }

  batches.push({
    batch: index + 1,
    responseStatus: response.status,
    responseChars: body.length,
    returnedPages: pages.length,
    pagesWithExtract: pages.filter((page) => normalizeText(page.extract)).length,
    pagesWithCategories: pages.filter((page) => page.categories?.length).length,
    characterSignals,
    sensitiveMatches,
    nonArticleMatches,
    nonCharacterMatches,
    candidates: candidates.length,
    anonymizedClues: candidates.filter((candidate) => candidate.clueAvailable).length,
    exactTitleLeaks: candidates.filter((candidate) => candidate.exactTitleLeak).length,
    candidateTitles: candidates.map((candidate) => candidate.title),
  });

  if (index + 1 < REQUESTS) await sleep(REQUEST_DELAY_MS);
}
console.log(JSON.stringify({
  auditedAt: new Date().toISOString(),
  requestProfile: {
    requests: REQUESTS,
    delayMilliseconds: REQUEST_DELAY_MS,
    randomPagesPerRequest: 50,
    extractLimit: 20,
    categoryLimit: "max",
  },
  uniqueTitles: seenTitles.size,
  crossBatchDuplicates,
  batches,
}, null, 2));
}

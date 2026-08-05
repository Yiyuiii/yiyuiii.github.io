(() => {
  "use strict";

  const globalScope = typeof window === "undefined" ? globalThis : window;
  const MIN_CLUE_LENGTH = 30;
  const MAX_CLUE_LENGTH = 420;
  const MAX_TITLE_LENGTH = 180;
  const MAX_INTRODUCTION_LENGTH = 1200;

  const SOURCE_DEFINITIONS = Object.freeze({
    moegirl_zh: Object.freeze({
      adapter: "moegirl",
      batchSize: 50,
      endpoint: "https://zh.moegirl.org.cn/api.php",
      language: "zh",
    }),
    wikipedia_en: Object.freeze({
      adapter: "wikipedia",
      batchSize: 20,
      endpoint: "https://en.wikipedia.org/w/api.php",
      language: "en",
    }),
    wikipedia_zh: Object.freeze({
      adapter: "wikipedia",
      batchSize: 20,
      endpoint: "https://zh.wikipedia.org/w/api.php",
      language: "zh",
    }),
  });
  const SEMANTIC_TYPES = Object.freeze([
    "person",
    "place",
    "work",
    "organization",
    "organism",
    "event",
  ]);

  const CHARACTER_SIGNAL = /(?:登场|登場|出场)(?:的)?(?:角色|人物)|(?:角色|人物)之一|虚拟(?:UP主|主播|YouTuber)|V[Tt]uber|吉祥物|拟人(?:化形象|角色)/u;
  const MOEGIRL_SENSITIVE_SIGNAL = /R-?18|成人向|色情|性行为|性暴力|强奸|乱伦|恋童|裸露|裸体|乳房|生殖器|自杀|自残|虐杀|血腥|猎奇|纳粹|政治人物/iu;
  const WIKIPEDIA_SENSITIVE_SIGNAL = /成人向|色情|性行为|性暴力|强奸|乱伦|恋童|裸露|生殖器|自杀|自残|虐杀|血腥|猎奇|pornograph|sexual violence|rape|incest|child sex|genital|self-harm|suicide method|gore/iu;
  const NON_ARTICLE_SIGNAL = /消歧义页|消歧义|条目列表|列表条目|disambiguation pages?|index articles?/iu;
  const NON_CHARACTER_TITLE_SIGNAL = /\/人格面具$/u;
  const NON_CHARACTER_CATEGORY_SIGNAL = /Category:\S{0,80}(?:歌曲|音乐作品)/u;
  const LIST_OR_DATE_TITLE_SIGNAL = /^(?:(?:list of|index of|timeline of)\b.*|\d{1,4}|\d{1,4}年|\d{1,4}年代|\d{1,2}月\d{1,2}日|.+(?:列表|索引|年表))$/iu;
  const NON_CONTENT_CATEGORY_SIGNAL = /(?:消歧义|列表|索引|模板|门户|維基百科維護|维基百科维护|disambiguation|lists? of|indexes?|templates?|portals?|wikipedia maintenance)/iu;

  const CLASSIFICATION_RULES = Object.freeze({
    person: Object.freeze([
      Object.freeze({ pattern: /(?:\b\d{3,4} births\b|\b\d{3,4} deaths\b|\bliving people\b|\bpeople by occupation\b|\bactors?\b|\bactresses\b|\bwriters?\b|\bsingers?\b|\bscientists?\b|\bpoliticians?\b|\bathletes?\b|\bfootballers?\b|\b人物\b|\d{3,4}年出生|\d{3,4}年逝世|在世人物|演員|演员|作家|歌手|科學家|科学家|政治人物|運動員|运动员)/iu, weight: 5 }),
      Object.freeze({ pattern: /(?:people from|alumni|members of|recipients of|人物小作品|人物傳記|人物传记)/iu, weight: 2 }),
    ]),
    place: Object.freeze([
      Object.freeze({ pattern: /(?:\bcities\b|\btowns\b|\bvillages\b|\bsettlements\b|\brivers\b|\bmountains\b|\bislands\b|\bcounties\b|\bprovinces\b|\bdistricts\b|\bcountries\b|城市|城镇|城鎮|村莊|村庄|聚居地|河流|山脈|山脉|島嶼|岛屿|縣|县|省份|行政區|行政区|國家|国家)/iu, weight: 5 }),
      Object.freeze({ pattern: /(?:geography of|geographical articles|地理小作品|地理條目|地理条目)/iu, weight: 2 }),
    ]),
    work: Object.freeze([
      Object.freeze({ pattern: /(?:\bfilms?\b|\bnovels?\b|\bbooks?\b|\balbums?\b|\bsongs?\b|\bvideo games?\b|\btelevision (?:series|programs?|shows?)\b|電影|电影|影片|小說|小说|書籍|书籍|專輯|专辑|歌曲|電子遊戲|电子游戏|電視劇|电视剧|電視節目|电视节目)/iu, weight: 5 }),
      Object.freeze({ pattern: /(?:works by|fiction|literary works|作品小作品|虛構作品|虚构作品)/iu, weight: 2 }),
    ]),
    organization: Object.freeze([
      Object.freeze({ pattern: /(?:\bcompanies\b|\bcorporations\b|\borganizations\b|\binstitutions\b|\buniversities\b|\bcolleges\b|\bpolitical parties\b|\bsports teams\b|\bfootball clubs\b|公司|企業|企业|組織|组织|機構|机构|大學|大学|學院|学院|政黨|政党|運動隊|运动队|足球俱樂部|足球俱乐部)/iu, weight: 5 }),
      Object.freeze({ pattern: /(?:establishments in|founded in|組織小作品|组织小作品)/iu, weight: 2 }),
    ]),
    organism: Object.freeze([
      Object.freeze({ pattern: /(?:\btaxa\b|\bspecies\b|\bgenera\b|\bplant families\b|\banimal families\b|\bfungi\b|\bflora\b|\bfauna\b|物種|物种|生物分類|生物分类|植物|動物|动物|真菌|菌類|菌类|屬$|属$|科$)/iu, weight: 5 }),
      Object.freeze({ pattern: /(?:taxon|biota|生物小作品)/iu, weight: 2 }),
    ]),
    event: Object.freeze([
      Object.freeze({ pattern: /(?:\bbattles\b|\bwars\b|\belections\b|\btournaments\b|\bcompetitions\b|\bdisasters\b|\bearthquakes\b|\bhurricanes\b|\bevents\b|戰役|战役|戰爭|战争|選舉|选举|錦標賽|锦标赛|賽事|赛事|競賽|竞赛|災害|灾害|地震|颶風|飓风|事件)/iu, weight: 5 }),
      Object.freeze({ pattern: /(?:conflicts in|sports seasons|event stubs|事件小作品)/iu, weight: 2 }),
    ]),
  });

  const normalizeText = (value) => String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, " ")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

  const logicError = (code, message) => {
    const error = new Error(message);
    error.code = code;
    return error;
  };

  const normalizeLanguage = (language) => language === "en" ? "en" : "zh";

  const titleKey = (value, language = "zh") => normalizeText(value)
    .toLocaleLowerCase(normalizeLanguage(language) === "en" ? "en-US" : "zh-Hans-CN");

  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

  const getBatchSize = (source) => source?.batchSize ?? source?.batch_size;

  const validateSource = (source) => {
    if (!source || typeof source !== "object") throw new Error("missing quiz source");
    const expected = SOURCE_DEFINITIONS[source.id];
    const batchSize = Number(getBatchSize(source));
    if (
      !expected
      || source.adapter !== expected.adapter
      || source.language !== expected.language
      || source.endpoint !== expected.endpoint
      || batchSize !== expected.batchSize
    ) {
      throw new Error("unexpected quiz source");
    }
    return Object.freeze({
      adapter: expected.adapter,
      batchSize: expected.batchSize,
      endpoint: expected.endpoint,
      id: source.id,
      language: expected.language,
    });
  };

  const buildApiUrl = (rawSource, nonce) => {
    const source = validateSource(rawSource);
    if (!/^[0-9a-f]{32}$/iu.test(String(nonce))) {
      throw new Error("invalid quiz request nonce");
    }
    const url = new URL(source.endpoint);
    const parameters = {
      action: "query",
      generator: "random",
      grnnamespace: "0",
      grnfilterredir: "nonredirects",
      grnlimit: String(source.batchSize),
      prop: source.adapter === "moegirl"
        ? "extracts|info|categories"
        : "extracts|categories|pageprops|revisions",
      exintro: "1",
      explaintext: "1",
      exchars: "900",
      exlimit: "20",
      cllimit: "max",
      format: "json",
      formatversion: "2",
      origin: "*",
      maxage: "0",
      smaxage: "0",
      requestid: String(nonce).toLowerCase(),
    };
    if (source.adapter === "moegirl") parameters.inprop = "url";
    else parameters.rvprop = "ids|timestamp";
    url.search = new URLSearchParams(parameters).toString();
    return url.href;
  };

  const uniqueTexts = (values) => Object.freeze([...new Set(values.map(normalizeText).filter(Boolean))]);

  const buildMaskTerms = (value, language = "zh") => {
    const title = normalizeText(value);
    if (!title) return Object.freeze([]);
    const withoutParentheses = normalizeText(title.replace(/[（(][^）)]*[）)]/gu, " "));
    const afterColon = normalizeText(title.replace(/^.*?[:：]/u, ""));
    const afterColonWithoutParentheses = normalizeText(afterColon.replace(/[（(][^）)]*[）)]/gu, " "));
    const minimum = normalizeLanguage(language) === "en" ? 3 : 1;
    return Object.freeze(uniqueTexts([title, withoutParentheses, afterColon, afterColonWithoutParentheses])
      .filter((term) => [...term].length >= minimum)
      .sort((left, right) => right.length - left.length));
  };

  const containsTerm = (text, term, language) => {
    if (normalizeLanguage(language) === "zh" || /\p{Script=Han}/u.test(term)) {
      return text.includes(term);
    }
    const expression = new RegExp(
      `(?:^|[^\\p{L}\\p{N}])${escapeRegExp(term)}(?=$|[^\\p{L}\\p{N}])`,
      "iu",
    );
    return expression.test(text);
  };

  const replaceTerm = (text, term, replacement, language) => {
    if (normalizeLanguage(language) === "zh" || /\p{Script=Han}/u.test(term)) {
      return text.replace(new RegExp(escapeRegExp(term), "gu"), replacement);
    }
    return text.replace(
      new RegExp(
        `(^|[^\\p{L}\\p{N}])${escapeRegExp(term)}(?=$|[^\\p{L}\\p{N}])`,
        "giu",
      ),
      `$1${replacement}`,
    );
  };

  const truncateClue = (value) => {
    if ([...value].length <= MAX_CLUE_LENGTH) return value;
    const symbols = [...value];
    const draft = symbols.slice(0, MAX_CLUE_LENGTH + 1).join("");
    const boundaries = ["。", "!", "?", ".", "！", "？"]
      .map((marker) => draft.lastIndexOf(marker))
      .filter((index) => index >= Math.floor(MAX_CLUE_LENGTH * 0.55));
    const shortened = boundaries.length
      ? draft.slice(0, Math.max(...boundaries) + 1)
      : symbols.slice(0, MAX_CLUE_LENGTH).join("");
    return `${shortened.trim()}…`;
  };

  const anonymizeIntroduction = (introduction, options = {}) => {
    const language = normalizeLanguage(options.language);
    const replacement = (() => {
      const candidate = normalizeText(options.redaction || "⬛");
      return candidate && [...candidate].length <= 8 ? candidate : "⬛";
    })();
    const titleTerms = buildMaskTerms(options.title, language);
    const extraTerms = Array.isArray(options.terms) ? options.terms : [];
    const terms = uniqueTexts([...titleTerms, ...extraTerms])
      .filter((term) => [...term].length >= (language === "en" ? 3 : 1))
      .sort((left, right) => right.length - left.length)
      .slice(0, 128);
    if (!titleTerms.length) return null;

    let clue = normalizeText(introduction);
    if (!clue) return null;
    const subjectPattern = language === "en"
      ? /^(.{1,180}?)\s+(?=(?:is|was|are|were)\b)/iu
      : /^(.{1,120}?)(?=(?:是|为))/u;
    const subjectMatch = clue.match(subjectPattern);
    if (!subjectMatch || !titleTerms.some((term) => containsTerm(subjectMatch[1], term, language))) {
      return null;
    }

    clue = `${replacement}${clue.slice(subjectMatch[1].length)}`;
    let redacted = true;
    for (const term of terms) {
      const changed = replaceTerm(clue, term, replacement, language);
      if (changed !== clue) redacted = true;
      clue = changed;
    }

    const aliasPattern = language === "en"
      ? /((?:also known as|also called|formerly known as|abbreviated as|nicknamed|native name(?: is|:)?)[ ]*)[^,.;]{1,100}/giu
      : /((?:又称|亦称|也称|别名|昵称|外文名|英文名|日文名|罗马字)(?:是|为|作|写作|:)?)[^,。;；]{1,80}/gu;
    clue = clue.replace(aliasPattern, `$1${replacement}`);
    const repeatedReplacement = new RegExp(
      `(?:\\s*${escapeRegExp(replacement)}\\s*){2,}`,
      "gu",
    );
    clue = normalizeText(clue.replace(repeatedReplacement, replacement));

    if (!redacted || [...clue].length < MIN_CLUE_LENGTH) return null;
    if (titleTerms.some((term) => containsTerm(clue, term, language))) return null;
    return truncateClue(clue);
  };

  const categoryTexts = (pageOrCategories) => {
    const categories = Array.isArray(pageOrCategories)
      ? pageOrCategories
      : pageOrCategories?.categories;
    if (!Array.isArray(categories)) return Object.freeze([]);
    return uniqueTexts(categories.map((category) => (
      typeof category === "string" ? category : category?.title
    )).filter(Boolean));
  };

  const classifyWikipedia = (pageOrCategories) => {
    const searchable = categoryTexts(pageOrCategories).join(" ");
    if (!searchable) return "unknown";
    const scores = SEMANTIC_TYPES.map((type) => ({
      score: CLASSIFICATION_RULES[type].reduce(
        (total, rule) => total + (rule.pattern.test(searchable) ? rule.weight : 0),
        0,
      ),
      type,
    })).sort((left, right) => right.score - left.score || left.type.localeCompare(right.type));
    if (scores[0].score < 3 || scores[0].score === scores[1].score) return "unknown";
    return scores[0].type;
  };

  const searchablePageText = (page) => {
    const categories = categoryTexts(page).join(" ");
    return `${normalizeText(page?.title)} ${normalizeText(page?.extract)} ${categories}`;
  };

  const isMoegirlQualityPage = (page) => {
    if (
      !page
      || page.missing
      || (page.ns !== undefined && page.ns !== 0)
      || !normalizeText(page.title)
      || [...normalizeText(page.title)].length > MAX_TITLE_LENGTH
      || !normalizeText(page.extract)
    ) return false;
    const categories = categoryTexts(page).join(" ");
    const searchable = searchablePageText(page);
    return CHARACTER_SIGNAL.test(searchable)
      && !MOEGIRL_SENSITIVE_SIGNAL.test(searchable)
      && !NON_ARTICLE_SIGNAL.test(categories)
      && !NON_CHARACTER_TITLE_SIGNAL.test(normalizeText(page.title))
      && !NON_CHARACTER_CATEGORY_SIGNAL.test(categories);
  };

  const isWikipediaQualityPage = (page) => {
    const title = normalizeText(page?.title);
    const extract = normalizeText(page?.extract);
    const categories = categoryTexts(page).join(" ");
    return Boolean(
      page
      && !page.missing
      && (page.ns === undefined || page.ns === 0)
      && title
      && [...title].length <= MAX_TITLE_LENGTH
      && extract
      && !Object.prototype.hasOwnProperty.call(page.pageprops || {}, "disambiguation")
      && !LIST_OR_DATE_TITLE_SIGNAL.test(title)
      && !NON_ARTICLE_SIGNAL.test(categories)
      && !NON_CONTENT_CATEGORY_SIGNAL.test(categories)
      && !WIKIPEDIA_SENSITIVE_SIGNAL.test(`${title} ${extract} ${categories}`)
    );
  };

  const safeSourceUrl = (value, rawSource, revisionId) => {
    const source = validateSource(rawSource);
    if (source.adapter === "wikipedia") {
      const parsedRevision = Number(revisionId);
      if (!Number.isSafeInteger(parsedRevision) || parsedRevision <= 0) return null;
      const host = source.language === "en" ? "en.wikipedia.org" : "zh.wikipedia.org";
      return `https://${host}/w/index.php?oldid=${parsedRevision}`;
    }
    try {
      const url = new URL(String(value));
      if (
        url.protocol !== "https:"
        || url.hostname !== "zh.moegirl.org.cn"
        || url.port
        || url.username
        || url.password
      ) return null;
      return url.href;
    } catch (_error) {
      return null;
    }
  };

  const normalizeRemotePage = (page, rawSource) => {
    const source = validateSource(rawSource);
    if (source.adapter === "moegirl" && !isMoegirlQualityPage(page)) return null;
    if (source.adapter === "wikipedia" && !isWikipediaQualityPage(page)) return null;

    const title = normalizeText(page.title);
    const introduction = [...normalizeText(page.extract)]
      .slice(0, MAX_INTRODUCTION_LENGTH)
      .join("");
    const key = titleKey(title, source.language);
    if (!key || !introduction) return null;

    let semanticType = "moegirl_character";
    let revisionId = null;
    let sourceUrl;
    if (source.adapter === "wikipedia") {
      semanticType = classifyWikipedia(page);
      if (semanticType === "unknown") return null;
      revisionId = Number(page?.revisions?.[0]?.revid);
      sourceUrl = safeSourceUrl(null, source, revisionId);
    } else {
      sourceUrl = safeSourceUrl(page.fullurl, source, null);
    }
    if (!sourceUrl) return null;

    return Object.freeze({
      key,
      language: source.language,
      maskTerms: buildMaskTerms(title, source.language),
      plainIntroduction: introduction,
      revisionId,
      semanticType,
      sourceId: source.id,
      sourceUrl,
      title,
    });
  };

  const normalizePages = (payload, rawSource) => {
    const source = validateSource(rawSource);
    const pages = Array.isArray(payload?.query?.pages) ? payload.query.pages : [];
    const entries = new Map();
    for (const page of pages) {
      const normalized = normalizeRemotePage(page, source);
      if (normalized && !entries.has(normalized.key)) entries.set(normalized.key, normalized);
    }
    return Object.freeze([...entries.values()]);
  };

  const hasRandomApi = (randomApi) => Boolean(
    randomApi && typeof randomApi.uintBelow === "function"
  );

  const sampleWithoutReplacement = (entries, count, randomApi) => {
    if (!hasRandomApi(randomApi)) throw logicError("random", "secure randomness is unavailable");
    if (!Array.isArray(entries) || !Number.isSafeInteger(count) || count < 0 || entries.length < count) {
      throw new Error("the discovered entry pool is too small");
    }
    const shuffled = entries.slice();
    for (let index = 0; index < count; index += 1) {
      const selected = index + randomApi.uintBelow(shuffled.length - index);
      if (!Number.isSafeInteger(selected) || selected < index || selected >= shuffled.length) {
        throw logicError("random", "random source returned an invalid index");
      }
      [shuffled[index], shuffled[selected]] = [shuffled[selected], shuffled[index]];
    }
    return shuffled.slice(0, count);
  };

  const createRound = (entries, options = {}) => {
    const randomApi = options.randomApi;
    if (!hasRandomApi(randomApi)) throw logicError("random", "secure randomness is unavailable");
    const recentKeys = new Set(Array.from(options.recentKeys || [], (key) => normalizeText(key)));
    const uniqueEntries = new Map();
    for (const entry of Array.isArray(entries) ? entries : []) {
      if (
        entry
        && entry.key
        && entry.title
        && entry.semanticType
        && entry.plainIntroduction
        && !recentKeys.has(entry.key)
        && !uniqueEntries.has(entry.key)
      ) uniqueEntries.set(entry.key, entry);
    }

    const groups = new Map();
    for (const entry of uniqueEntries.values()) {
      if (!groups.has(entry.semanticType)) groups.set(entry.semanticType, []);
      groups.get(entry.semanticType).push(entry);
    }

    const viableGroups = [];
    for (const [semanticType, group] of groups) {
      if (group.length < 4) continue;
      const eligibleAnswers = group.filter((entry) => anonymizeIntroduction(
        entry.plainIntroduction,
        {
          language: entry.language,
          redaction: options.redaction,
          terms: entry.maskTerms,
          title: entry.title,
        },
      ));
      if (eligibleAnswers.length) viableGroups.push({ eligibleAnswers, group, semanticType });
    }
    if (!viableGroups.length) throw logicError("no_clue", "no viable quiz group");

    const chosenGroup = sampleWithoutReplacement(viableGroups, 1, randomApi)[0];
    const answer = sampleWithoutReplacement(chosenGroup.eligibleAnswers, 1, randomApi)[0];
    const distractors = sampleWithoutReplacement(
      chosenGroup.group.filter((entry) => entry.key !== answer.key),
      3,
      randomApi,
    );
    const selected = [answer, ...distractors];
    const terms = selected.flatMap((entry) => entry.maskTerms || buildMaskTerms(entry.title, entry.language));
    const clue = anonymizeIntroduction(answer.plainIntroduction, {
      language: answer.language,
      redaction: options.redaction,
      terms,
      title: answer.title,
    });
    if (!clue) throw logicError("no_clue", "answer could not be anonymized");
    const shuffledOptions = sampleWithoutReplacement(selected, selected.length, randomApi)
      .map((entry) => Object.freeze({ key: entry.key, title: entry.title }));

    return Object.freeze({
      answer,
      answerKey: answer.key,
      clue,
      options: Object.freeze(shuffledOptions),
      semanticType: chosenGroup.semanticType,
      usedKeys: Object.freeze(selected.map((entry) => entry.key)),
    });
  };

  const logic = Object.freeze({
    SEMANTIC_TYPES,
    SOURCE_DEFINITIONS,
    anonymizeIntroduction,
    buildApiUrl,
    buildMaskTerms,
    classifyWikipedia,
    createRound,
    hasRandomApi,
    isMoegirlQualityPage,
    isWikipediaQualityPage,
    normalizePages,
    normalizeRemotePage,
    normalizeText,
    safeSourceUrl,
    sampleWithoutReplacement,
    titleKey,
    validateSource,
  });
  globalScope.yiyuiiiEncyclopediaQuizLogic = logic;
})();

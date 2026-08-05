(() => {
  "use strict";

  const globalScope = typeof window === "undefined" ? globalThis : window;
  const BLOCKED_GENRES = Object.freeze(["Ecchi", "Hentai"]);
  const BLOCKED_TAGS = Object.freeze([
    "Nudity",
    "Sexual Content",
    "Rape",
    "Incest",
    "Gore",
  ]);
  const SENSITIVE_TEXT = /(?:\bhentai\b|\becchi\b|\bporn(?:ography|ographic)?\b|\bsexual content\b|\brape\b|\bincest\b|\bnudity\b|\bgore\b|\bR-?18\b|18禁|成人向|色情|強姦|强奸|亂倫|乱伦|裸露)/iu;
  const SOURCE_DEFINITIONS = Object.freeze({
    anilist_role: Object.freeze({
      adapter: "anilist_role",
      charactersPerMedia: 10,
      endpoint: "https://graphql.anilist.co",
      mediaPerPage: 6,
      method: "POST",
      pageMax: 60,
      pageMin: 1,
    }),
  });

  const ANILIST_QUERY = `query RelationRound($page: Int!) {
  Page(page: $page, perPage: 6) {
    media(
      type: ANIME
      isAdult: false
      genre_not_in: ["Ecchi", "Hentai"]
      tag_not_in: ["Nudity", "Sexual Content", "Rape", "Incest", "Gore"]
      sort: [POPULARITY_DESC, ID]
    ) {
      id
      isAdult
      genres
      tags { name isAdult }
      siteUrl
      title { romaji english native }
      characters(perPage: 10, sort: [ROLE, RELEVANCE, ID]) {
        edges { role node { id name { full native } } }
      }
    }
  }
}`;

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

  const integerSetting = (source, snake, camel) => Number(source?.[snake] ?? source?.[camel]);

  const validateSource = (source) => {
    const expected = SOURCE_DEFINITIONS[source?.id];
    if (
      !expected
      || source.adapter !== expected.adapter
      || source.endpoint !== expected.endpoint
      || source.method !== expected.method
    ) throw new Error("unexpected ACG relation source");
    if (expected.adapter === "anilist_role") {
      if (
        integerSetting(source, "page_min", "pageMin") !== expected.pageMin
        || integerSetting(source, "page_max", "pageMax") !== expected.pageMax
        || integerSetting(source, "media_per_page", "mediaPerPage") !== expected.mediaPerPage
        || integerSetting(source, "characters_per_media", "charactersPerMedia") !== expected.charactersPerMedia
      ) throw new Error("unexpected AniList query bounds");
    }
    return Object.freeze({ id: source.id, ...expected });
  };

  const buildAniListRequest = (rawSource, page) => {
    const source = validateSource(rawSource);
    if (source.adapter !== "anilist_role") throw new Error("not an AniList source");
    if (!Number.isSafeInteger(page) || page < source.pageMin || page > source.pageMax) {
      throw new Error("invalid AniList page");
    }
    return Object.freeze({
      body: JSON.stringify({ query: ANILIST_QUERY, variables: { page } }),
      endpoint: source.endpoint,
      method: source.method,
    });
  };

  const hasRandomApi = (randomApi) => Boolean(randomApi && typeof randomApi.uintBelow === "function");

  const sampleWithoutReplacement = (entries, count, randomApi) => {
    if (!hasRandomApi(randomApi)) throw logicError("random", "secure randomness is unavailable");
    if (!Array.isArray(entries) || !Number.isSafeInteger(count) || count < 0 || entries.length < count) {
      throw new Error("candidate pool is too small");
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

  const safeUrl = (value, hostname, pathExpression) => {
    try {
      const url = new URL(String(value));
      if (
        url.protocol !== "https:"
        || url.hostname !== hostname
        || url.port
        || url.username
        || url.password
        || !pathExpression.test(url.pathname)
      ) return null;
      url.search = "";
      url.hash = "";
      return url.href;
    } catch (_error) {
      return null;
    }
  };

  const mediaTitle = (title, language) => {
    const romaji = normalizeText(title?.romaji);
    const english = normalizeText(title?.english);
    const native = normalizeText(title?.native);
    if (language === "en") return english || romaji || native;
    if (native && romaji && native.toLocaleLowerCase() !== romaji.toLocaleLowerCase()) {
      const combined = `${native}（${romaji}）`;
      if ([...combined].length <= 120) return combined;
    }
    return native || romaji || english;
  };

  const characterName = (name) => normalizeText(name?.full || name?.native);

  const normalizeAniList = (payload, language = "en") => {
    const rawMedia = Array.isArray(payload?.data?.Page?.media) ? payload.data.Page.media : [];
    const normalized = [];
    const seenMedia = new Set();
    for (const media of rawMedia) {
      const id = Number(media?.id);
      const title = mediaTitle(media?.title, language);
      const genres = Array.isArray(media?.genres) ? media.genres.map(normalizeText) : [];
      const tags = Array.isArray(media?.tags) ? media.tags.map((tag) => ({
        isAdult: tag?.isAdult === true,
        name: normalizeText(tag?.name),
      })) : [];
      const sourceUrl = safeUrl(media?.siteUrl, "anilist.co", /^\/anime\/\d+\/?$/u);
      if (
        !Number.isSafeInteger(id)
        || id <= 0
        || seenMedia.has(id)
        || media?.isAdult !== false
        || genres.some((genre) => BLOCKED_GENRES.includes(genre))
        || tags.some((tag) => tag.isAdult || BLOCKED_TAGS.includes(tag.name))
        || !title
        || SENSITIVE_TEXT.test(title)
        || [...title].length > 120
        || !sourceUrl
      ) continue;

      const main = [];
      const supporting = [];
      const seenCharacters = new Set();
      for (const edge of Array.isArray(media?.characters?.edges) ? media.characters.edges : []) {
        const characterId = Number(edge?.node?.id);
        const name = characterName(edge?.node?.name);
        if (
          !Number.isSafeInteger(characterId)
          || characterId <= 0
          || !name
          || SENSITIVE_TEXT.test(name)
          || [...name].length > 100
          || seenCharacters.has(characterId)
        ) continue;
        seenCharacters.add(characterId);
        const entry = Object.freeze({
          id: characterId,
          key: `anilist:${id}:${characterId}`,
          name,
          role: edge?.role,
        });
        if (edge?.role === "MAIN") main.push(entry);
        else if (edge?.role === "SUPPORTING") supporting.push(entry);
      }
      if (!main.length || supporting.length < 3) continue;
      seenMedia.add(id);
      normalized.push(Object.freeze({
        id,
        key: `anilist:${id}`,
        main: Object.freeze(main),
        sourceUrl,
        supporting: Object.freeze(supporting),
        title,
      }));
    }
    return Object.freeze(normalized);
  };

  const createAniListRound = (mediaEntries, options = {}) => {
    const randomApi = options.randomApi;
    if (!hasRandomApi(randomApi)) throw logicError("random", "secure randomness is unavailable");
    const recentKeys = new Set(options.recentKeys || []);
    const viable = (Array.isArray(mediaEntries) ? mediaEntries : []).filter(
      (media) => media.main.some((character) => !recentKeys.has(character.key)) && media.supporting.length >= 3,
    );
    if (!viable.length) throw logicError("no_round", "no viable AniList role relation");
    const media = sampleWithoutReplacement(viable, 1, randomApi)[0];
    const answer = sampleWithoutReplacement(
      media.main.filter((character) => !recentKeys.has(character.key)),
      1,
      randomApi,
    )[0];
    const distractors = sampleWithoutReplacement(media.supporting, 3, randomApi);
    const selected = sampleWithoutReplacement([answer, ...distractors], 4, randomApi);
    return Object.freeze({
      answerKey: answer.key,
      answerLabel: answer.name,
      promptValues: Object.freeze({ title: media.title }),
      options: Object.freeze(selected.map((character) => Object.freeze({
        key: character.key,
        label: character.name,
      }))),
      provider: "anilist_role",
      sourceLabel: media.title,
      sourceUrl: media.sourceUrl,
      usedKey: answer.key,
    });
  };

  globalScope.yiyuiiiAcgRelationQuizLogic = Object.freeze({
    ANILIST_QUERY,
    BLOCKED_GENRES,
    BLOCKED_TAGS,
    SENSITIVE_TEXT,
    SOURCE_DEFINITIONS,
    buildAniListRequest,
    createAniListRound,
    hasRandomApi,
    normalizeAniList,
    normalizeText,
    sampleWithoutReplacement,
    validateSource,
  });
})();

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
  const ROUND_KINDS = Object.freeze([
    "anime_to_character",
    "character_to_anime",
    "character_to_character",
  ]);

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

  const labelIdentity = (value) => normalizeText(value).toLocaleLowerCase();

  const characterName = (name, language) => {
    const full = normalizeText(name?.full);
    const native = normalizeText(name?.native);
    if (language === "zh" && native && full && labelIdentity(native) !== labelIdentity(full)) {
      const combined = `${native}（${full}）`;
      if ([...combined].length <= 140) return combined;
    }
    return language === "en" ? (full || native) : (native || full);
  };

  const uniqueByLabel = (entries, labelFor = (entry) => entry.name) => {
    const unique = [];
    const seen = new Set();
    for (const entry of entries) {
      const identity = labelIdentity(labelFor(entry));
      if (!identity || seen.has(identity)) continue;
      seen.add(identity);
      unique.push(entry);
    }
    return unique;
  };

  const normalizeRoundKinds = (value = ROUND_KINDS) => {
    const normalized = [...new Set(Array.isArray(value) ? value.map(String) : [])]
      .filter((kind) => ROUND_KINDS.includes(kind));
    if (!normalized.length) throw new RangeError("at least one AniList round kind is required");
    return Object.freeze(normalized);
  };

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
      const characters = [];
      const seenCharacters = new Set();
      for (const edge of Array.isArray(media?.characters?.edges) ? media.characters.edges : []) {
        const characterId = Number(edge?.node?.id);
        const fullName = normalizeText(edge?.node?.name?.full);
        const nativeName = normalizeText(edge?.node?.name?.native);
        const name = characterName(edge?.node?.name, language);
        if (
          !Number.isSafeInteger(characterId)
          || characterId <= 0
          || !name
          || [fullName, nativeName].filter(Boolean).some((value) => SENSITIVE_TEXT.test(value))
          || [...name].length > 140
          || seenCharacters.has(characterId)
        ) continue;
        seenCharacters.add(characterId);
        const entry = Object.freeze({
          id: characterId,
          key: `anilist:${id}:${characterId}`,
          name,
          role: edge?.role,
        });
        characters.push(entry);
        if (edge?.role === "MAIN") main.push(entry);
        else if (edge?.role === "SUPPORTING") supporting.push(entry);
      }
      if (!main.length) continue;
      seenMedia.add(id);
      normalized.push(Object.freeze({
        characterIds: Object.freeze([...seenCharacters]),
        characters: Object.freeze(characters),
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

  const frozenOption = (entry, label = entry.name) => Object.freeze({
    key: entry.key,
    label,
  });

  const roundKey = (...parts) => `anilist:round:${parts.join(":")}`;

  const animeToCharacterSeeds = (mediaEntries, recentKeys) => {
    const seeds = [];
    for (const media of mediaEntries) {
      const supporting = uniqueByLabel(media.supporting);
      for (const answer of uniqueByLabel(media.main)) {
        const answerIdentity = labelIdentity(answer.name);
        const distractors = supporting.filter((entry) => labelIdentity(entry.name) !== answerIdentity);
        const usedKey = roundKey("anime-to-character", media.id, answer.id);
        if (distractors.length >= 3 && !recentKeys.has(usedKey)) {
          seeds.push(Object.freeze({ answer, distractors, media, usedKey }));
        }
      }
    }
    return seeds;
  };

  const createAnimeToCharacterRound = (seeds, randomApi) => {
    const seed = sampleWithoutReplacement(seeds, 1, randomApi)[0];
    const distractors = sampleWithoutReplacement(seed.distractors, 3, randomApi);
    const options = sampleWithoutReplacement([seed.answer, ...distractors], 4, randomApi);
    return Object.freeze({
      answerKey: seed.answer.key,
      answerLabel: seed.answer.name,
      feedbackValues: Object.freeze({ answer: seed.answer.name, title: seed.media.title }),
      kind: "anime_to_character",
      options: Object.freeze(options.map((entry) => frozenOption(entry))),
      promptValues: Object.freeze({ title: seed.media.title }),
      provider: "anilist_role",
      sourceLabel: seed.media.title,
      sourceUrl: seed.media.sourceUrl,
      usedKey: seed.usedKey,
    });
  };

  const characterToAnimeSeeds = (mediaEntries, recentKeys) => {
    const seeds = [];
    for (const media of mediaEntries) {
      for (const character of uniqueByLabel(media.main)) {
        const characterIdentity = labelIdentity(character.name);
        const distractors = uniqueByLabel(
          mediaEntries.filter((candidate) => (
            candidate.id !== media.id
            && !candidate.characterIds.includes(character.id)
            && !candidate.characters.some((entry) => labelIdentity(entry.name) === characterIdentity)
            && labelIdentity(candidate.title) !== labelIdentity(media.title)
          )),
          (candidate) => candidate.title,
        );
        const usedKey = roundKey("character-to-anime", character.id, media.id);
        if (distractors.length >= 3 && !recentKeys.has(usedKey)) {
          seeds.push(Object.freeze({ character, distractors, media, usedKey }));
        }
      }
    }
    return seeds;
  };

  const createCharacterToAnimeRound = (seeds, randomApi) => {
    const seed = sampleWithoutReplacement(seeds, 1, randomApi)[0];
    const distractors = sampleWithoutReplacement(seed.distractors, 3, randomApi);
    const options = sampleWithoutReplacement([seed.media, ...distractors], 4, randomApi);
    return Object.freeze({
      answerKey: seed.media.key,
      answerLabel: seed.media.title,
      feedbackValues: Object.freeze({ answer: seed.media.title, character: seed.character.name }),
      kind: "character_to_anime",
      options: Object.freeze(options.map((entry) => frozenOption(entry, entry.title))),
      promptValues: Object.freeze({ character: seed.character.name }),
      provider: "anilist_role",
      sourceLabel: seed.media.title,
      sourceUrl: seed.media.sourceUrl,
      usedKey: seed.usedKey,
    });
  };

  const sameAnimeDistractorSets = (mediaEntries, targetMedia, clue, answer, limit = Infinity) => {
    const targetIds = new Set(targetMedia.characterIds);
    const forbiddenLabels = new Set(targetMedia.characters.map((character) => labelIdentity(character.name)));
    const groups = mediaEntries
      .filter((media) => media.id !== targetMedia.id)
      .map((media) => Object.freeze({
        characters: uniqueByLabel(media.main).filter((character) => (
          !targetIds.has(character.id) && !forbiddenLabels.has(labelIdentity(character.name))
        )),
        mediaId: media.id,
      }))
      .filter((group) => group.characters.length);
    const selections = [];
    const visit = (start, selected, usedIds, usedLabels) => {
      if (selected.length === 3) {
        selections.push(Object.freeze(selected.slice()));
        return selections.length >= limit;
      }
      for (let groupIndex = start; groupIndex < groups.length; groupIndex += 1) {
        if (selected.length + (groups.length - groupIndex) < 3) break;
        for (const character of groups[groupIndex].characters) {
          const identity = labelIdentity(character.name);
          if (usedIds.has(character.id) || usedLabels.has(identity)) continue;
          usedIds.add(character.id);
          usedLabels.add(identity);
          selected.push(character);
          if (visit(groupIndex + 1, selected, usedIds, usedLabels)) return true;
          selected.pop();
          usedLabels.delete(identity);
          usedIds.delete(character.id);
        }
      }
      return false;
    };
    visit(0, [], new Set([clue.id, answer.id]), new Set(forbiddenLabels));
    return selections;
  };

  const characterToCharacterSeeds = (mediaEntries, recentKeys) => {
    const seeds = [];
    for (const media of mediaEntries) {
      const main = uniqueByLabel(media.main);
      if (main.length < 2) continue;
      for (const clue of main) {
        for (const answer of main) {
          if (answer.id === clue.id || labelIdentity(answer.name) === labelIdentity(clue.name)) continue;
          const usedKey = roundKey("character-to-character", media.id, clue.id, answer.id);
          if (
            !recentKeys.has(usedKey)
            && sameAnimeDistractorSets(mediaEntries, media, clue, answer, 1).length
          ) seeds.push(Object.freeze({ answer, clue, media, usedKey }));
        }
      }
    }
    return seeds;
  };

  const createCharacterToCharacterRound = (seeds, mediaEntries, randomApi) => {
    const seed = sampleWithoutReplacement(seeds, 1, randomApi)[0];
    const sets = sameAnimeDistractorSets(mediaEntries, seed.media, seed.clue, seed.answer);
    const distractors = sampleWithoutReplacement(sets, 1, randomApi)[0];
    const options = sampleWithoutReplacement([seed.answer, ...distractors], 4, randomApi);
    return Object.freeze({
      answerKey: seed.answer.key,
      answerLabel: seed.answer.name,
      feedbackValues: Object.freeze({
        answer: seed.answer.name,
        character: seed.clue.name,
        title: seed.media.title,
      }),
      kind: "character_to_character",
      options: Object.freeze(options.map((entry) => frozenOption(entry))),
      promptValues: Object.freeze({ character: seed.clue.name }),
      provider: "anilist_role",
      sourceLabel: seed.media.title,
      sourceUrl: seed.media.sourceUrl,
      usedKey: seed.usedKey,
    });
  };

  const createAniListRound = (mediaEntries, options = {}) => {
    const randomApi = options.randomApi;
    if (!hasRandomApi(randomApi)) throw logicError("random", "secure randomness is unavailable");
    const recentKeys = new Set(options.recentKeys || []);
    const allowedKinds = normalizeRoundKinds(options.allowedKinds);
    const entries = Array.isArray(mediaEntries) ? mediaEntries : [];
    const seedSets = Object.freeze({
      anime_to_character: animeToCharacterSeeds(entries, recentKeys),
      character_to_anime: characterToAnimeSeeds(entries, recentKeys),
      character_to_character: characterToCharacterSeeds(entries, recentKeys),
    });
    const viableKinds = allowedKinds.filter((kind) => seedSets[kind].length);
    if (!viableKinds.length) throw logicError("no_round", "no viable AniList main-character relation");
    const kind = sampleWithoutReplacement(viableKinds, 1, randomApi)[0];
    if (kind === "anime_to_character") return createAnimeToCharacterRound(seedSets[kind], randomApi);
    if (kind === "character_to_anime") return createCharacterToAnimeRound(seedSets[kind], randomApi);
    return createCharacterToCharacterRound(seedSets[kind], entries, randomApi);
  };

  globalScope.yiyuiiiAcgRelationQuizLogic = Object.freeze({
    ANILIST_QUERY,
    BLOCKED_GENRES,
    BLOCKED_TAGS,
    ROUND_KINDS,
    SENSITIVE_TEXT,
    SOURCE_DEFINITIONS,
    buildAniListRequest,
    createAniListRound,
    hasRandomApi,
    normalizeAniList,
    normalizeRoundKinds,
    normalizeText,
    sampleWithoutReplacement,
    validateSource,
  });
})();

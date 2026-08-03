(() => {
  "use strict";

  const UINT32_RANGE = 0x1_0000_0000;
  const API_HOST = "zh.moegirl.org.cn";
  const API_PATH = "/api.php";
  const MAX_RESPONSE_CHARS = 262_144;
  const MIN_CLUE_LENGTH = 30;
  const MAX_CLUE_LENGTH = 420;
  const CHARACTER_SIGNAL = /(?:登场|登場|出场)(?:的)?(?:角色|人物)|(?:角色|人物)之一|虚拟(?:UP主|主播|YouTuber)|V[Tt]uber|吉祥物|拟人(?:化形象|角色)/u;
  const SENSITIVE_SIGNAL = /R-?18|成人向|色情|性行为|性暴力|强奸|乱伦|恋童|裸露|裸体|乳房|生殖器|自杀|自残|虐杀|血腥|猎奇|纳粹|政治人物/u;
  const NON_ARTICLE_SIGNAL = /消歧义页|消歧义|条目列表|列表条目/u;

  const secureRandomIndex = (maximum) => {
    if (
      !Number.isSafeInteger(maximum)
      || maximum < 1
      || !globalThis.crypto
      || typeof globalThis.crypto.getRandomValues !== "function"
    ) {
      throw new Error("secure randomness is unavailable");
    }

    const acceptedRange = UINT32_RANGE - (UINT32_RANGE % maximum);
    const sample = new Uint32Array(1);
    do {
      globalThis.crypto.getRandomValues(sample);
    } while (sample[0] >= acceptedRange);
    return sample[0] % maximum;
  };

  const secureRequestNonce = () => {
    if (
      !globalThis.crypto
      || typeof globalThis.crypto.getRandomValues !== "function"
    ) {
      throw new Error("secure randomness is unavailable");
    }
    const sample = new Uint32Array(4);
    globalThis.crypto.getRandomValues(sample);
    return Array.from(sample, (value) => value.toString(16).padStart(8, "0")).join("");
  };

  const sampleWithoutReplacement = (entries, count) => {
    if (!Array.isArray(entries) || entries.length < count) {
      throw new Error("the discovered entry pool is too small");
    }

    const shuffled = entries.slice();
    for (let index = 0; index < count; index += 1) {
      const replacement = index + secureRandomIndex(shuffled.length - index);
      [shuffled[index], shuffled[replacement]] = [
        shuffled[replacement],
        shuffled[index],
      ];
    }
    return shuffled.slice(0, count);
  };

  const readJson = (root, selector) => {
    const node = root.querySelector(selector);
    if (!node) throw new Error(`missing quiz data: ${selector}`);
    return JSON.parse(node.textContent || "null");
  };

  const interpolate = (template, title) => String(template).replace("{title}", title);

  const safeMoegirlUrl = (value) => {
    try {
      const parsed = new URL(value);
      if (
        parsed.protocol !== "https:"
        || parsed.hostname !== API_HOST
        || parsed.port
        || parsed.username
        || parsed.password
      ) return null;
      return parsed.href;
    } catch (error) {
      return null;
    }
  };

  const buildApiUrl = (endpoint, batchSize, requestNonce) => {
    const parsed = new URL(endpoint);
    if (
      parsed.protocol !== "https:"
      || parsed.hostname !== API_HOST
      || parsed.pathname !== API_PATH
      || parsed.port
      || parsed.username
      || parsed.password
    ) {
      throw new Error("unexpected quiz API endpoint");
    }
    parsed.search = new URLSearchParams({
      action: "query",
      generator: "random",
      grnnamespace: "0",
      grnfilterredir: "nonredirects",
      grnlimit: String(batchSize),
      prop: "extracts|info|categories",
      exintro: "1",
      explaintext: "1",
      exchars: "900",
      inprop: "url",
      cllimit: "10",
      format: "json",
      formatversion: "2",
      origin: "*",
      maxage: "0",
      smaxage: "0",
      requestid: requestNonce,
    }).toString();
    return parsed.href;
  };

  const normalizeText = (value) => String(value || "")
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, " ")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

  const titleKey = (value) => normalizeText(value).toLocaleLowerCase("zh-Hans-CN");

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

  const anonymizeClue = (extract, terms, replacementValue) => {
    const replacement = normalizeText(replacementValue) || "⬛";
    let clue = normalizeText(extract);

    // The leading subject often contains readings or foreign names absent from the page title.
    clue = clue.replace(
      /^.{1,96}?(?=(?:是|为)(?:一名|一位|一个|由|《|「|动画|漫画|游戏|小说|系列|网页|多媒体|来自))/u,
      replacement,
    );

    const masks = [...new Set(terms.map(normalizeText))]
      .filter((term) => term.length >= 1 && term.length <= 80)
      .sort((left, right) => right.length - left.length)
      .slice(0, 512);
    for (const term of masks) {
      clue = clue.replace(new RegExp(escapeRegExp(term), "giu"), replacement);
    }

    clue = clue.replace(
      /((?:又称|亦称|也称|别名|昵称|外文名|英文名|日文名|罗马字)(?:是|为|作|写作|:)?)[^,。;；]{1,80}/gu,
      `$1${replacement}`,
    );
    const repeatedReplacement = new RegExp(
      `(?:\\s*${escapeRegExp(replacement)}\\s*){2,}`,
      "gu",
    );
    clue = clue.replace(repeatedReplacement, replacement);
    if (clue.length < MIN_CLUE_LENGTH) return null;
    if (clue.length <= MAX_CLUE_LENGTH) return clue;

    const draft = clue.slice(0, MAX_CLUE_LENGTH + 1);
    const boundaries = ["。", "!", "?", ".", "！", "？"]
      .map((marker) => draft.lastIndexOf(marker))
      .filter((index) => index >= Math.floor(MAX_CLUE_LENGTH * 0.55));
    const end = boundaries.length ? Math.max(...boundaries) + 1 : MAX_CLUE_LENGTH;
    return `${draft.slice(0, end).trim()}…`;
  };

  const isCharacterPage = (page) => {
    if (
      !page
      || page.missing
      || (page.ns !== undefined && page.ns !== 0)
      || !normalizeText(page.title)
      || !normalizeText(page.extract)
    ) return false;

    const categories = Array.isArray(page.categories)
      ? page.categories.map((category) => normalizeText(category?.title)).join(" ")
      : "";
    const searchable = `${normalizeText(page.title)} ${normalizeText(page.extract)} ${categories}`;
    return CHARACTER_SIGNAL.test(searchable)
      && !SENSITIVE_SIGNAL.test(searchable)
      && !NON_ARTICLE_SIGNAL.test(categories);
  };

  const initQuiz = (root) => {
    if (root.dataset.quizReady === "true") return;

    let copy;
    try {
      copy = readJson(root, "[data-quiz-copy]");
    } catch (error) {
      return;
    }

    const interactive = root.querySelector("[data-quiz-interactive]");
    const startButton = root.querySelector("[data-quiz-start]");
    const round = root.querySelector("[data-quiz-round]");
    const clue = root.querySelector("[data-quiz-clue]");
    const clueText = root.querySelector("[data-quiz-clue-text]");
    const options = root.querySelector("[data-quiz-options]");
    const status = root.querySelector("[data-quiz-status]");
    const source = root.querySelector("[data-quiz-source]");
    const sourceLink = root.querySelector("[data-quiz-source-link]");

    if (
      !interactive
      || !startButton
      || !round
      || !clue
      || !clueText
      || !options
      || !status
      || !source
      || !sourceLink
    ) return;

    const endpoint = root.dataset.apiEndpoint || "";
    const configuredTimeout = Number.parseInt(root.dataset.timeoutMs || "", 10);
    const timeoutMs = Number.isFinite(configuredTimeout)
      ? Math.min(Math.max(configuredTimeout, 1000), 15000)
      : 10000;
    const configuredBatchSize = Number.parseInt(root.dataset.batchSize || "", 10);
    const batchSize = Number.isFinite(configuredBatchSize)
      ? Math.min(Math.max(configuredBatchSize, 20), 100)
      : 50;
    const configuredHistorySize = Number.parseInt(root.dataset.historySize || "", 10);
    const historySize = Number.isFinite(configuredHistorySize)
      ? Math.min(Math.max(configuredHistorySize, 4), 100)
      : 24;
    const recentTitles = [];
    let activeRound = 0;

    const resetRound = () => {
      activeRound += 1;
      clue.hidden = true;
      clueText.textContent = "";
      options.hidden = true;
      options.replaceChildren();
      round.removeAttribute("aria-hidden");
      source.hidden = true;
      sourceLink.removeAttribute("href");
      sourceLink.textContent = "";
      round.hidden = true;
    };

    const showFailure = (message) => {
      resetRound();
      root.removeAttribute("aria-busy");
      startButton.disabled = false;
      startButton.textContent = copy.retry;
      status.textContent = message;
      startButton.focus();
    };

    const renderOptions = (selected, answer, roundToken) => {
      const fragment = document.createDocumentFragment();
      for (const entry of selected) {
        const button = document.createElement("button");
        button.className = "moegirl-quiz__option";
        button.type = "button";
        button.textContent = entry.title;
        button.addEventListener("click", () => {
          if (roundToken !== activeRound || options.dataset.answered === "true") return;
          options.dataset.answered = "true";
          const correct = entry.key === answer.key;
          for (const choice of options.querySelectorAll("button")) {
            choice.disabled = true;
            if (choice.textContent === answer.title) choice.dataset.result = "correct";
          }
          if (!correct) button.dataset.result = "incorrect";

          status.textContent = interpolate(
            correct ? copy.correct : copy.incorrect,
            answer.title,
          );
          sourceLink.href = answer.fullurl;
          sourceLink.textContent = interpolate(copy.source_label, answer.title);
          source.hidden = false;
          startButton.textContent = copy.again;
          startButton.focus();
        });
        fragment.append(button);
      }
      options.removeAttribute("data-answered");
      options.replaceChildren(fragment);
    };

    const startRound = async () => {
      resetRound();
      const roundToken = activeRound;
      startButton.disabled = true;
      status.textContent = copy.loading;
      root.setAttribute("aria-busy", "true");

      let requestUrl;
      try {
        requestUrl = buildApiUrl(endpoint, batchSize, secureRequestNonce());
      } catch (error) {
        showFailure(copy.random_error);
        return;
      }

      const controller = new AbortController();
      const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
      let payload;
      try {
        const response = await fetch(requestUrl, {
          method: "GET",
          mode: "cors",
          credentials: "omit",
          cache: "no-store",
          redirect: "error",
          referrerPolicy: "no-referrer",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`quiz API returned ${response.status}`);
        const declaredLength = Number.parseInt(response.headers.get("content-length") || "", 10);
        if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_CHARS) {
          throw new Error("quiz API response is too large");
        }
        const body = await response.text();
        if (body.length > MAX_RESPONSE_CHARS) throw new Error("quiz API response is too large");
        payload = JSON.parse(body);
      } catch (error) {
        globalThis.clearTimeout(timeout);
        if (roundToken === activeRound) showFailure(copy.network_error);
        return;
      }
      globalThis.clearTimeout(timeout);

      const recentSet = new Set(recentTitles);
      const discoveredByTitle = new Map();
      const pages = Array.isArray(payload?.query?.pages) ? payload.query.pages : [];
      for (const page of pages) {
        if (!isCharacterPage(page)) continue;
        const fullurl = safeMoegirlUrl(page.fullurl);
        const title = normalizeText(page.title);
        const key = titleKey(title);
        if (!fullurl || !key || recentSet.has(key) || discoveredByTitle.has(key)) continue;
        discoveredByTitle.set(key, {
          title,
          key,
          extract: normalizeText(page.extract),
          fullurl,
        });
      }

      let selected;
      try {
        selected = sampleWithoutReplacement([...discoveredByTitle.values()], 4);
      } catch (error) {
        if (roundToken === activeRound) showFailure(copy.no_clue_error);
        return;
      }

      const sharedMasks = selected.flatMap((entry) => expandTitleFragments(entry.title));
      const eligibleAnswers = selected.flatMap((entry) => {
        const anonymized = anonymizeClue(
          entry.extract,
          sharedMasks,
          copy.redaction || "⬛",
        );
        return anonymized ? [{ ...entry, clue: anonymized }] : [];
      });

      if (roundToken !== activeRound) return;
      if (eligibleAnswers.length === 0) {
        showFailure(copy.no_clue_error);
        return;
      }

      let answer;
      try {
        answer = eligibleAnswers[secureRandomIndex(eligibleAnswers.length)];
      } catch (error) {
        showFailure(copy.random_error);
        return;
      }

      recentTitles.push(...selected.map((entry) => entry.key));
      if (recentTitles.length > historySize) {
        recentTitles.splice(0, recentTitles.length - historySize);
      }

      renderOptions(selected, answer, roundToken);
      clueText.textContent = answer.clue;
      round.hidden = false;
      clue.hidden = false;
      options.hidden = false;
      root.removeAttribute("aria-busy");
      startButton.disabled = false;
      startButton.textContent = copy.again;
      status.textContent = "";
      clue.focus();
    };

    root.dataset.quizReady = "true";
    interactive.hidden = false;
    startButton.addEventListener("click", startRound);
  };

  for (const root of document.querySelectorAll("[data-moegirl-quiz]")) initQuiz(root);
})();

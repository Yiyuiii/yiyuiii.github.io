(() => {
  "use strict";

  const UINT32_RANGE = 0x1_0000_0000;
  const API_HOST = "zh.moegirl.org.cn";
  const API_PATH = "/api.php";
  const MAX_RESPONSE_CHARS = 262_144;
  const MIN_CLUE_LENGTH = 60;
  const MAX_CLUE_LENGTH = 420;

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

  const sampleWithoutReplacement = (entries, count) => {
    if (!Array.isArray(entries) || entries.length < count) {
      throw new Error("the reviewed entry pool is too small");
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

  const buildApiUrl = (endpoint, titles) => {
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
      titles: titles.join("|"),
      prop: "extracts|info",
      exintro: "1",
      explaintext: "1",
      exchars: "900",
      inprop: "url",
      redirects: "1",
      format: "json",
      formatversion: "2",
      origin: "*",
    }).toString();
    return parsed.href;
  };

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
    const fragments = [title];
    if (!/\p{Script=Han}/u.test(title)) return fragments;
    for (let start = 0; start < symbols.length; start += 1) {
      for (let length = 2; length <= symbols.length - start; length += 1) {
        const fragment = symbols.slice(start, start + length).join("").trim();
        if (/\p{Script=Han}/u.test(fragment)) fragments.push(fragment);
      }
    }
    return fragments;
  };

  const anonymizeClue = (extract, terms, replacement) => {
    let clue = normalizeText(extract);
    const masks = [...new Set(terms.map(normalizeText))]
      .filter((term) => term.length >= 1 && term.length <= 80)
      .sort((left, right) => right.length - left.length)
      .slice(0, 512);
    for (const term of masks) {
      clue = clue.replace(new RegExp(escapeRegExp(term), "giu"), replacement);
    }
    clue = clue.replace(/(?:\s*〔角色名已隐藏〕\s*){2,}/gu, "〔角色名已隐藏〕");
    if (clue.length < MIN_CLUE_LENGTH) return null;
    if (clue.length <= MAX_CLUE_LENGTH) return clue;

    const draft = clue.slice(0, MAX_CLUE_LENGTH + 1);
    const boundaries = ["。", "！", "？", ".", "!", "?"]
      .map((marker) => draft.lastIndexOf(marker))
      .filter((index) => index >= Math.floor(MAX_CLUE_LENGTH * 0.55));
    const end = boundaries.length ? Math.max(...boundaries) + 1 : MAX_CLUE_LENGTH;
    return `${draft.slice(0, end).trim()}…`;
  };

  const initQuiz = (root) => {
    if (root.dataset.quizReady === "true") return;

    let entries;
    let copy;
    try {
      entries = readJson(root, "[data-quiz-pool]");
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
          const correct = entry.title === answer.title;
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

      let selected;
      try {
        selected = sampleWithoutReplacement(entries, 4);
      } catch (error) {
        showFailure(copy.random_error);
        return;
      }

      const controller = new AbortController();
      const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
      let payload;
      try {
        const response = await fetch(
          buildApiUrl(endpoint, selected.map((entry) => entry.title)),
          {
            method: "GET",
            mode: "cors",
            credentials: "omit",
            cache: "no-store",
            redirect: "error",
            referrerPolicy: "no-referrer",
            signal: controller.signal,
          },
        );
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

      const selectedTitles = new Set(selected.map((entry) => entry.title));
      const canonicalByOriginal = new Map(
        selected.map((entry) => [entry.title, entry.title]),
      );
      const responseTitles = [];
      for (const relation of [
        ...(Array.isArray(payload?.query?.normalized) ? payload.query.normalized : []),
        ...(Array.isArray(payload?.query?.redirects) ? payload.query.redirects : []),
      ]) {
        if (!relation?.from || !relation?.to) continue;
        responseTitles.push(relation.from, relation.to);
        for (const [original, canonical] of canonicalByOriginal) {
          if (canonical === relation.from) canonicalByOriginal.set(original, relation.to);
        }
      }
      const displayByCanonical = new Map();
      for (const [original, canonical] of canonicalByOriginal) {
        if (displayByCanonical.has(canonical)) {
          displayByCanonical.set(canonical, null);
        } else {
          displayByCanonical.set(canonical, original);
        }
      }

      const sharedMasks = selected.flatMap((entry) => [
        ...expandTitleFragments(entry.title),
        ...(Array.isArray(entry.aliases) ? entry.aliases : []),
      ]).concat(responseTitles);
      const pages = Array.isArray(payload?.query?.pages) ? payload.query.pages : [];
      const eligible = pages.flatMap((page) => {
        const displayTitle = displayByCanonical.get(page?.title);
        if (
          !page
          || page.missing
          || (page.ns !== undefined && page.ns !== 0)
          || !displayTitle
          || !selectedTitles.has(displayTitle)
        ) return [];
        const fullurl = safeMoegirlUrl(page.fullurl);
        const anonymized = anonymizeClue(
          page.extract,
          [...sharedMasks, page.title],
          copy.redaction || "〔角色名已隐藏〕",
        );
        if (!fullurl || !anonymized) return [];
        return [{ title: displayTitle, clue: anonymized, fullurl }];
      });

      if (roundToken !== activeRound) return;
      if (eligible.length === 0) {
        showFailure(copy.no_clue_error);
        return;
      }

      let answer;
      try {
        answer = eligible[secureRandomIndex(eligible.length)];
      } catch (error) {
        showFailure(copy.random_error);
        return;
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

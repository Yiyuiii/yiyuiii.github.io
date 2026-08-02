(() => {
  "use strict";

  const UINT32_RANGE = 0x1_0000_0000;
  const API_HOST = "zh.moegirl.org.cn";
  const IMAGE_HOSTS = new Set([
    "storage.moegirl.org.cn",
    "img.moegirl.org.cn",
    "zh.moegirl.org.cn",
  ]);

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

  const safeHttpsUrl = (value, permittedHosts) => {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "https:" || !permittedHosts.has(parsed.hostname)) return null;
      return parsed.href;
    } catch (error) {
      return null;
    }
  };

  const buildApiUrl = (endpoint, titles) => {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== "https:" || parsed.hostname !== API_HOST) {
      throw new Error("unexpected quiz API endpoint");
    }
    parsed.search = new URLSearchParams({
      action: "query",
      titles: titles.join("|"),
      prop: "pageimages|info",
      piprop: "name|thumbnail",
      pithumbsize: "480",
      inprop: "url",
      redirects: "1",
      format: "json",
      formatversion: "2",
      origin: "*",
    }).toString();
    return parsed.href;
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
    const figure = root.querySelector("[data-quiz-figure]");
    const image = root.querySelector("[data-quiz-image]");
    const options = root.querySelector("[data-quiz-options]");
    const status = root.querySelector("[data-quiz-status]");
    const source = root.querySelector("[data-quiz-source]");
    const sourceLink = root.querySelector("[data-quiz-source-link]");

    if (
      !interactive
      || !startButton
      || !round
      || !figure
      || !image
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
      image.onload = null;
      image.onerror = null;
      image.removeAttribute("src");
      image.removeAttribute("data-loaded");
      figure.hidden = true;
      options.hidden = true;
      options.replaceChildren();
      round.removeAttribute("data-preparing");
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
            referrerPolicy: "no-referrer",
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error(`quiz API returned ${response.status}`);
        payload = await response.json();
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
      for (const relation of [
        ...(Array.isArray(payload?.query?.normalized) ? payload.query.normalized : []),
        ...(Array.isArray(payload?.query?.redirects) ? payload.query.redirects : []),
      ]) {
        if (!relation?.from || !relation?.to) continue;
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
      const pages = Array.isArray(payload?.query?.pages) ? payload.query.pages : [];
      const eligible = pages.flatMap((page) => {
        const displayTitle = displayByCanonical.get(page?.title);
        if (
          !page
          || page.missing
          || !displayTitle
          || !selectedTitles.has(displayTitle)
        ) return [];
        const thumbnail = safeHttpsUrl(page.thumbnail?.source, IMAGE_HOSTS);
        const fullurl = safeHttpsUrl(page.fullurl, new Set([API_HOST]));
        if (!thumbnail || !fullurl) return [];
        return [{ title: displayTitle, thumbnail, fullurl }];
      });

      if (roundToken !== activeRound) return;
      if (eligible.length === 0) {
        showFailure(copy.no_image_error);
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
      round.hidden = false;
      round.dataset.preparing = "true";
      round.setAttribute("aria-hidden", "true");
      figure.hidden = false;
      options.hidden = true;
      const imageTimeout = globalThis.setTimeout(() => {
        if (roundToken === activeRound) showFailure(copy.image_error);
      }, timeoutMs);
      image.onload = () => {
        globalThis.clearTimeout(imageTimeout);
        if (roundToken !== activeRound) return;
        image.dataset.loaded = "true";
        round.removeAttribute("data-preparing");
        round.removeAttribute("aria-hidden");
        options.hidden = false;
        root.removeAttribute("aria-busy");
        startButton.disabled = false;
        startButton.textContent = copy.again;
        status.textContent = "";
        options.querySelector("button")?.focus();
      };
      image.onerror = () => {
        globalThis.clearTimeout(imageTimeout);
        if (roundToken === activeRound) showFailure(copy.image_error);
      };
      image.src = answer.thumbnail;
    };

    root.dataset.quizReady = "true";
    interactive.hidden = false;
    startButton.addEventListener("click", startRound);
  };

  for (const root of document.querySelectorAll("[data-moegirl-quiz]")) initQuiz(root);
})();

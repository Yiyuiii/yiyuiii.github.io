(() => {
  "use strict";

  const logic = globalThis.yiyuiiiEncyclopediaQuizLogic;
  if (!logic) return;

  const UINT32_RANGE = 0x1_0000_0000;
  const DEFAULT_TIMEOUT_MS = 10_000;
  const MAX_RESPONSE_CHARS = 262_144;
  const DEFAULT_HISTORY_SIZE = 24;
  const LICENSE_URLS = Object.freeze({
    moegirl_zh: "https://creativecommons.org/licenses/by-nc-sa/3.0/",
    wikipedia_en: "https://creativecommons.org/licenses/by-sa/4.0/",
    wikipedia_zh: "https://creativecommons.org/licenses/by-sa/4.0/",
  });

  const readJson = (root, selector) => {
    const node = root.querySelector(selector);
    if (!node) throw new Error(`missing quiz data: ${selector}`);
    return JSON.parse(node.textContent || "null");
  };

  const boundedInteger = (value, fallback, minimum, maximum) => {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isSafeInteger(parsed)
      ? Math.min(Math.max(parsed, minimum), maximum)
      : fallback;
  };

  const interpolate = (template, values) => Object.entries(values).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
    String(template || ""),
  );

  const secureRandomApi = Object.freeze({
    uintBelow(maximum) {
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
    },
  });

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

  const normalizeSource = (sourceId, rawSource) => logic.validateSource({
    adapter: rawSource?.adapter,
    batchSize: rawSource?.batch_size,
    endpoint: rawSource?.endpoint,
    id: sourceId,
    language: rawSource?.language,
  });

  const readBoundedResponseText = async (response, responseLimit) => {
    const declaredLength = Number.parseInt(
      response.headers.get("content-length") || "",
      10,
    );
    if (Number.isFinite(declaredLength) && declaredLength > responseLimit) {
      throw new Error("quiz API response is too large");
    }

    if (
      !response.body
      || typeof response.body.getReader !== "function"
      || typeof globalThis.TextDecoder !== "function"
    ) {
      const body = await response.text();
      if (body.length > responseLimit) {
        throw new Error("quiz API response is too large");
      }
      return body;
    }

    const reader = response.body.getReader();
    const decoder = new globalThis.TextDecoder();
    let body = "";
    let receivedBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value?.byteLength || 0;
      body += decoder.decode(value, { stream: true });
      if (receivedBytes > responseLimit || body.length > responseLimit) {
        try {
          await reader.cancel("quiz API response is too large");
        } catch (_error) {
          // The size failure below is authoritative even if cancellation races.
        }
        throw new Error("quiz API response is too large");
      }
    }
    body += decoder.decode();
    if (body.length > responseLimit) {
      throw new Error("quiz API response is too large");
    }
    return body;
  };

  const initQuiz = (root) => {
    if (root.dataset.quizReady === "true") return;

    let config;
    try {
      config = readJson(root, "[data-quiz-config]");
    } catch (_error) {
      return;
    }

    const enhanced = root.querySelector("[data-quiz-enhanced]");
    const sourceSelect = root.querySelector("[data-quiz-source-select]");
    const privacy = root.querySelector("[data-quiz-privacy]");
    const interactive = root.querySelector("[data-quiz-interactive]");
    const startButton = root.querySelector("[data-quiz-start]");
    const round = root.querySelector("[data-quiz-round]");
    const clue = root.querySelector("[data-quiz-clue]");
    const clueText = root.querySelector("[data-quiz-clue-text]");
    const options = root.querySelector("[data-quiz-options]");
    const status = root.querySelector("[data-quiz-status]");
    const source = root.querySelector("[data-quiz-source]");
    const sourceLink = root.querySelector("[data-quiz-source-link]");
    const attribution = root.querySelector("[data-quiz-attribution]");
    const licenseLink = root.querySelector("[data-quiz-license-link]");

    if (
      !enhanced
      || !sourceSelect
      || !privacy
      || !interactive
      || !startButton
      || !round
      || !clue
      || !clueText
      || !options
      || !status
      || !source
      || !sourceLink
      || !attribution
      || !licenseLink
    ) return;

    const copy = config.copy && typeof config.copy === "object" ? config.copy : {};
    const sourceCopies = config.source_copy && typeof config.source_copy === "object"
      ? config.source_copy
      : {};
    const allowedSourceIds = Array.isArray(config.allowed_source_ids)
      ? [...new Set(config.allowed_source_ids.map(String))]
      : [];
    const configuredSources = config.sources && typeof config.sources === "object"
      ? config.sources
      : {};
    const sources = new Map();
    try {
      for (const sourceId of allowedSourceIds) {
        sources.set(sourceId, normalizeSource(sourceId, configuredSources[sourceId]));
      }
    } catch (_error) {
      return;
    }
    if (sources.size !== allowedSourceIds.length || sources.size < 1) return;

    const defaultSourceId = sources.has(String(config.default_source_id))
      ? String(config.default_source_id)
      : allowedSourceIds[0];
    if (!sources.has(sourceSelect.value)) sourceSelect.value = defaultSourceId;

    const timeoutMs = boundedInteger(
      config.timeout_ms,
      DEFAULT_TIMEOUT_MS,
      1_000,
      15_000,
    );
    const responseLimit = boundedInteger(
      config.max_response_chars,
      MAX_RESPONSE_CHARS,
      65_536,
      524_288,
    );
    const historySize = boundedInteger(
      config.recent_history_size,
      DEFAULT_HISTORY_SIZE,
      4,
      100,
    );
    const recentBySource = new Map(allowedSourceIds.map((sourceId) => [sourceId, []]));

    let activeController = null;
    let activeRound = 0;

    const selectedSourceId = () => (
      sources.has(sourceSelect.value) ? sourceSelect.value : defaultSourceId
    );
    const selectedSource = () => sources.get(selectedSourceId());
    const selectedSourceCopy = () => sourceCopies[selectedSourceId()] || {};

    const setState = (value) => {
      root.dataset.quizState = value;
      const loading = value === "loading";
      root.toggleAttribute("aria-busy", loading);
      sourceSelect.disabled = loading;
      startButton.disabled = loading;
    };

    const updateDisclosure = () => {
      privacy.textContent = String(selectedSourceCopy().privacy || "");
    };

    const clearRoundVisuals = () => {
      clue.hidden = true;
      clueText.textContent = "";
      options.hidden = true;
      options.removeAttribute("data-answered");
      options.replaceChildren();
      round.hidden = true;
      source.hidden = true;
      sourceLink.removeAttribute("href");
      sourceLink.textContent = "";
      attribution.textContent = "";
      licenseLink.removeAttribute("href");
      licenseLink.textContent = "";
    };

    const invalidateActiveRequest = () => {
      activeRound += 1;
      if (activeController) activeController.abort();
      activeController = null;
    };

    const resetRound = () => {
      invalidateActiveRequest();
      clearRoundVisuals();
      status.textContent = "";
      startButton.textContent = String(copy.start || "");
      setState("idle");
    };

    const showFailure = (message, roundToken) => {
      if (roundToken !== activeRound) return;
      activeController = null;
      clearRoundVisuals();
      status.textContent = String(message || "");
      startButton.textContent = String(copy.retry || copy.start || "");
      setState("error");
      startButton.focus();
    };

    const revealAttribution = (answer, sourceId, sourceConfig, sourceCopy) => {
      const expectedLicense = LICENSE_URLS[sourceId];
      const configuredLicense = String(configuredSources[sourceId]?.license_url || "");
      if (!expectedLicense || configuredLicense !== expectedLicense) return false;

      sourceLink.href = answer.sourceUrl;
      sourceLink.textContent = interpolate(sourceCopy.source_label, { title: answer.title });
      attribution.textContent = String(sourceCopy.attribution || "");
      licenseLink.href = expectedLicense;
      licenseLink.textContent = String(sourceCopy.license_label || "");
      source.hidden = false;
      return Boolean(sourceConfig);
    };

    const renderOptions = (quizRound, roundToken, sourceId, sourceConfig, sourceCopy) => {
      const fragment = document.createDocumentFragment();
      for (const entry of quizRound.options) {
        const button = document.createElement("button");
        button.className = "encyclopedia-quiz__option";
        button.type = "button";
        button.textContent = entry.title;
        button.addEventListener("click", () => {
          if (roundToken !== activeRound || options.dataset.answered === "true") return;
          options.dataset.answered = "true";
          const correct = entry.key === quizRound.answer.key;
          for (const choice of options.querySelectorAll("button")) {
            choice.disabled = true;
            if (choice.dataset.entryKey === quizRound.answer.key) {
              choice.dataset.result = "correct";
            }
          }
          if (!correct) button.dataset.result = "incorrect";

          status.textContent = interpolate(
            correct ? copy.correct : copy.incorrect,
            { title: quizRound.answer.title },
          );
          revealAttribution(quizRound.answer, sourceId, sourceConfig, sourceCopy);
          startButton.textContent = String(copy.again || copy.start || "");
          setState("answered");
          startButton.focus();
        });
        button.dataset.entryKey = entry.key;
        fragment.append(button);
      }
      options.removeAttribute("data-answered");
      options.replaceChildren(fragment);
    };

    const startRound = async () => {
      resetRound();
      const roundToken = activeRound;
      const sourceId = selectedSourceId();
      const sourceConfig = selectedSource();
      const sourceCopy = selectedSourceCopy();
      status.textContent = String(sourceCopy.loading || "");
      setState("loading");

      let requestUrl;
      try {
        requestUrl = logic.buildApiUrl(sourceConfig, secureRequestNonce());
      } catch (_error) {
        showFailure(copy.random_error, roundToken);
        return;
      }

      const controller = new AbortController();
      activeController = controller;
      const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
      let payload;
      try {
        const response = await fetch(requestUrl, {
          cache: "no-store",
          credentials: "omit",
          headers: { Accept: "application/json" },
          method: "GET",
          mode: "cors",
          redirect: "error",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`quiz API returned ${response.status}`);
        const body = await readBoundedResponseText(response, responseLimit);
        payload = JSON.parse(body);
        if (payload?.error) throw new Error("quiz API returned an error payload");
      } catch (_error) {
        globalThis.clearTimeout(timeout);
        showFailure(sourceCopy.network_error || copy.network_error, roundToken);
        return;
      }
      globalThis.clearTimeout(timeout);
      if (roundToken !== activeRound) return;
      activeController = null;

      let quizRound;
      try {
        const entries = logic.normalizePages(payload, sourceConfig);
        quizRound = logic.createRound(entries, {
          randomApi: secureRandomApi,
          recentKeys: recentBySource.get(sourceId),
          redaction: copy.redaction || "⬛",
        });
      } catch (error) {
        showFailure(
          error?.code === "no_clue" ? copy.no_clue_error : copy.random_error,
          roundToken,
        );
        return;
      }

      if (!quizRound) {
        showFailure(copy.no_clue_error, roundToken);
        return;
      }

      const history = recentBySource.get(sourceId);
      history.push(...quizRound.options.map((entry) => entry.key));
      if (history.length > historySize) history.splice(0, history.length - historySize);

      renderOptions(quizRound, roundToken, sourceId, sourceConfig, sourceCopy);
      clueText.textContent = quizRound.clue;
      round.hidden = false;
      clue.hidden = false;
      options.hidden = false;
      status.textContent = "";
      startButton.textContent = String(copy.again || copy.start || "");
      setState("active");
      clue.focus();
    };

    root.dataset.quizReady = "true";
    sourceSelect.value = selectedSourceId();
    updateDisclosure();
    clearRoundVisuals();
    enhanced.hidden = false;
    interactive.hidden = false;
    setState("idle");
    sourceSelect.addEventListener("change", () => {
      if (!sources.has(sourceSelect.value)) sourceSelect.value = defaultSourceId;
      resetRound();
      updateDisclosure();
    });
    startButton.addEventListener("click", startRound);
  };

  for (const root of document.querySelectorAll("[data-encyclopedia-quiz]")) {
    initQuiz(root);
  }
})();

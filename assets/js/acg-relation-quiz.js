(() => {
  "use strict";

  const logic = globalThis.yiyuiiiAcgRelationQuizLogic;
  if (!logic) return;

  const UINT32_RANGE = 0x1_0000_0000;
  const OFFICIAL_TERMS_URL = "https://docs.anilist.co/guide/terms-of-use";

  const readJson = (root, selector) => {
    const node = root.querySelector(selector);
    if (!node) throw new Error(`missing ACG quiz data: ${selector}`);
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
      ) throw new Error("secure randomness is unavailable");
      const acceptedRange = UINT32_RANGE - (UINT32_RANGE % maximum);
      const sample = new Uint32Array(1);
      do {
        globalThis.crypto.getRandomValues(sample);
      } while (sample[0] >= acceptedRange);
      return sample[0] % maximum;
    },
  });

  const readBoundedResponseText = async (response, responseLimit) => {
    const declaredLength = Number.parseInt(response.headers.get("content-length") || "", 10);
    if (Number.isFinite(declaredLength) && declaredLength > responseLimit) {
      throw new Error("AniList response is too large");
    }
    if (
      !response.body
      || typeof response.body.getReader !== "function"
      || typeof globalThis.TextDecoder !== "function"
    ) {
      const body = await response.text();
      if (body.length > responseLimit) throw new Error("AniList response is too large");
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
          await reader.cancel("AniList response is too large");
        } catch (_error) {
          // The size failure remains authoritative if cancellation races.
        }
        throw new Error("AniList response is too large");
      }
    }
    body += decoder.decode();
    if (body.length > responseLimit) throw new Error("AniList response is too large");
    return body;
  };

  const initQuiz = (root) => {
    if (root.dataset.acgReady === "true") return;
    let config;
    try {
      config = readJson(root, "[data-acg-config]");
    } catch (_error) {
      return;
    }

    const enhanced = root.querySelector("[data-acg-enhanced]");
    const interactive = root.querySelector("[data-acg-interactive]");
    const startButton = root.querySelector("[data-acg-start]");
    const settings = root.querySelector("[data-acg-settings]");
    const settingsSummary = root.querySelector("[data-acg-settings-summary]");
    const settingsApply = root.querySelector("[data-acg-settings-apply]");
    const settingsReset = root.querySelector("[data-acg-settings-reset]");
    const settingsStatus = root.querySelector("[data-acg-settings-status]");
    const round = root.querySelector("[data-acg-round]");
    const prompt = root.querySelector("[data-acg-prompt]");
    const options = root.querySelector("[data-acg-options]");
    const status = root.querySelector("[data-acg-status]");
    const source = root.querySelector("[data-acg-source]");
    const sourceLink = root.querySelector("[data-acg-source-link]");
    const attribution = root.querySelector("[data-acg-attribution]");
    const termsLink = root.querySelector("[data-acg-terms-link]");
    if (
      !enhanced || !interactive || !startButton || !settings || !settingsSummary
      || !settingsApply || !settingsReset || !settingsStatus || !round || !prompt || !options
      || !status || !source || !sourceLink || !attribution || !termsLink
    ) return;

    const copy = config.copy && typeof config.copy === "object" ? config.copy : {};
    const sourceCopy = config.source_copy && typeof config.source_copy === "object"
      ? config.source_copy
      : {};
    const rawSource = config.source;
    let sourceConfig;
    try {
      sourceConfig = logic.validateSource(rawSource);
    } catch (_error) {
      return;
    }
    if (
      rawSource?.terms_url !== OFFICIAL_TERMS_URL
      || rawSource?.source_home !== "https://anilist.co/"
      || termsLink.href !== OFFICIAL_TERMS_URL
    ) return;

    const timeoutMs = boundedInteger(config.timeout_ms, 10_000, 1_000, 10_000);
    const responseLimit = boundedInteger(config.max_response_chars, 262_144, 65_536, 262_144);
    const historySize = boundedInteger(config.recent_history_size, 16, 4, 64);
    const recentKeys = [];
    let allowedKinds = logic.normalizeRoundKinds();
    let activeController = null;
    let activeRound = 0;
    let currentRound = null;

    const kindFields = () => [...root.querySelectorAll("[data-acg-kind]")];
    const setDraftKinds = (kinds) => {
      const selected = new Set(kinds);
      for (const field of kindFields()) field.checked = selected.has(field.value);
    };
    const summaryFor = (kinds) => {
      if (kinds.length === logic.ROUND_KINDS.length) return String(copy.settings_all || "");
      if (kinds.length === 1) return String(copy.type_labels?.[kinds[0]] || "");
      return interpolate(copy.settings_selected, { count: kinds.length });
    };

    const setState = (state) => {
      root.dataset.acgState = state;
      startButton.disabled = state === "loading";
    };

    const clearRound = () => {
      activeRound += 1;
      if (activeController) activeController.abort();
      activeController = null;
      currentRound = null;
      round.hidden = true;
      source.hidden = true;
      options.replaceChildren();
      prompt.textContent = "";
      status.textContent = "";
      sourceLink.removeAttribute("href");
      sourceLink.textContent = "";
      startButton.textContent = String(copy.start || "");
      setState("idle");
    };

    const showFailure = (message, roundToken) => {
      if (roundToken !== activeRound) return;
      activeController = null;
      round.hidden = true;
      source.hidden = true;
      status.textContent = String(message || copy.network_error || "");
      startButton.textContent = String(copy.retry || copy.start || "");
      setState("failed");
      startButton.focus();
    };

    const revealSource = (quizRound) => {
      sourceLink.href = quizRound.sourceUrl;
      sourceLink.textContent = interpolate(sourceCopy.source_link_label, {
        title: quizRound.sourceLabel,
      });
      attribution.textContent = String(sourceCopy.attribution || "");
      termsLink.textContent = String(sourceCopy.terms_label || "");
      source.hidden = false;
    };

    const renderRound = (quizRound, roundToken) => {
      const fragment = document.createDocumentFragment();
      for (const entry of quizRound.options) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = entry.label;
        button.dataset.acgAnswerKey = entry.key;
        button.addEventListener("click", () => {
          if (roundToken !== activeRound || currentRound !== quizRound || options.dataset.answered === "true") return;
          options.dataset.answered = "true";
          const correct = entry.key === quizRound.answerKey;
          for (const choice of options.querySelectorAll("button")) {
            choice.disabled = true;
            if (choice.dataset.acgAnswerKey === quizRound.answerKey) choice.dataset.result = "correct";
          }
          if (!correct) button.dataset.result = "incorrect";
          const feedback = sourceCopy.feedback?.[quizRound.kind];
          status.textContent = interpolate(
            feedback?.[correct ? "correct" : "incorrect"],
            quizRound.feedbackValues,
          );
          revealSource(quizRound);
          startButton.textContent = String(copy.again || copy.start || "");
          setState("answered");
          startButton.focus();
        });
        fragment.append(button);
      }
      options.removeAttribute("data-answered");
      options.replaceChildren(fragment);
      prompt.textContent = interpolate(sourceCopy.prompts?.[quizRound.kind], quizRound.promptValues);
      round.hidden = false;
      source.hidden = true;
      status.textContent = "";
      currentRound = quizRound;
      setState("playing");
      prompt.focus();
    };

    const startRound = async () => {
      clearRound();
      const roundToken = activeRound;
      status.textContent = String(sourceCopy.loading || "");
      setState("loading");

      let request;
      try {
        const pageNumber = sourceConfig.pageMin
          + secureRandomApi.uintBelow(sourceConfig.pageMax - sourceConfig.pageMin + 1);
        request = logic.buildAniListRequest(sourceConfig, pageNumber);
      } catch (_error) {
        showFailure(copy.random_error, roundToken);
        return;
      }

      const controller = new AbortController();
      activeController = controller;
      const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
      let payload;
      try {
        const response = await fetch(request.endpoint, {
          body: request.body,
          cache: "no-store",
          credentials: "omit",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          method: request.method,
          mode: "cors",
          redirect: "error",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`AniList returned ${response.status}`);
        payload = JSON.parse(await readBoundedResponseText(response, responseLimit));
        if (Array.isArray(payload?.errors) && payload.errors.length) {
          throw new Error("AniList returned GraphQL errors");
        }
      } catch (_error) {
        globalThis.clearTimeout(timeout);
        showFailure(copy.network_error, roundToken);
        return;
      }
      globalThis.clearTimeout(timeout);
      if (roundToken !== activeRound) return;
      activeController = null;

      let quizRound;
      try {
        const entries = logic.normalizeAniList(payload, config.page_lang === "en" ? "en" : "zh");
        quizRound = logic.createAniListRound(entries, {
          allowedKinds,
          randomApi: secureRandomApi,
          recentKeys,
        });
      } catch (error) {
        showFailure(error?.code === "no_round" ? copy.no_round_error : copy.random_error, roundToken);
        return;
      }
      recentKeys.push(quizRound.usedKey);
      if (recentKeys.length > historySize) recentKeys.splice(0, recentKeys.length - historySize);
      renderRound(quizRound, roundToken);
    };

    settings.addEventListener("change", () => { settingsStatus.textContent = ""; });
    settingsReset.addEventListener("click", () => {
      setDraftKinds(logic.ROUND_KINDS);
      settingsStatus.textContent = String(copy.settings_defaults_ready || "");
    });
    settingsApply.addEventListener("click", () => {
      const selected = kindFields().filter((field) => field.checked).map((field) => field.value);
      if (!selected.length) {
        settingsStatus.textContent = String(copy.settings_required || "");
        return;
      }
      allowedKinds = logic.normalizeRoundKinds(selected);
      clearRound();
      settingsSummary.textContent = summaryFor(allowedKinds);
      settings.open = false;
      settingsStatus.textContent = String(copy.settings_applied || "");
      status.textContent = String(copy.settings_applied || "");
      startButton.focus();
    });

    startButton.addEventListener("click", startRound);
    setDraftKinds(allowedKinds);
    settingsSummary.textContent = summaryFor(allowedKinds);
    enhanced.hidden = false;
    interactive.hidden = false;
    root.dataset.acgReady = "true";
    setState("idle");
  };

  for (const root of document.querySelectorAll("[data-acg-relation-quiz]")) initQuiz(root);
})();

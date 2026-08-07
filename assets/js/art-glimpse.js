(() => {
  "use strict";

  const UINT32_RANGE = 0x1_0000_0000;
  const EXPECTED = Object.freeze({
    apiHost: "openaccess-api.clevelandart.org",
    endpoint: "https://openaccess-api.clevelandart.org/api/artworks/",
    imageHost: "openaccess-cdn.clevelandart.org",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    openAccessUrl: "https://www.clevelandart.org/open-access",
    query: "landscape",
    type: "Painting",
  });
  const ARTWORK_HOSTS = Object.freeze(new Set([
    "clevelandart.org",
    "www.clevelandart.org",
  ]));
  const RESPONSE_FIELDS = Object.freeze([
    "id", "accession_number", "title", "creation_date", "creators", "images",
    "url", "share_license_status", "type", "department", "description",
  ]);
  const SENSITIVE_TEXT = /\b(?:nude|nudity|naked|erotic|sexual|brothel|prostitut|rape|suicide|corpse|behead|decapitat|execution|massacre|murder|blood|crucifix|martyrdom|battle|war scene)\b/i;
  const ROUND_KINDS = Object.freeze(["metadata_to_image", "image_to_metadata"]);
  const CLUE_FIELDS = Object.freeze(["title", "creator", "date"]);
  const DEFAULT_CLUE_FIELDS = Object.freeze(["title", "creator"]);

  const boundedInteger = (value, fallback, minimum, maximum) => {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isSafeInteger(parsed)
      ? Math.min(Math.max(parsed, minimum), maximum)
      : fallback;
  };

  const secureUintBelow = (maximum) => {
    if (!Number.isSafeInteger(maximum) || maximum < 1 || !globalThis.crypto?.getRandomValues) {
      throw new Error("secure randomness is unavailable");
    }
    const acceptedRange = UINT32_RANGE - (UINT32_RANGE % maximum);
    const sample = new Uint32Array(1);
    do globalThis.crypto.getRandomValues(sample); while (sample[0] >= acceptedRange);
    return sample[0] % maximum;
  };
  const randomApi = Object.freeze({ uintBelow: secureUintBelow });

  const safeHttpsUrl = (value, allowedHosts, pathPattern = null) => {
    let parsed;
    try { parsed = new URL(String(value || "")); } catch (_error) { return null; }
    if (
      parsed.protocol !== "https:"
      || parsed.username
      || parsed.password
      || parsed.port
      || !allowedHosts.has(parsed.hostname)
      || (pathPattern && !pathPattern.test(parsed.pathname))
    ) return null;
    return parsed.href;
  };

  const validateConfig = (raw) => {
    const artworkHosts = Array.isArray(raw?.artwork_hosts)
      ? new Set(raw.artwork_hosts.map(String))
      : new Set();
    if (
      raw?.endpoint !== EXPECTED.endpoint
      || raw?.api_host !== EXPECTED.apiHost
      || raw?.image_host !== EXPECTED.imageHost
      || raw?.license_url !== EXPECTED.licenseUrl
      || raw?.open_access_url !== EXPECTED.openAccessUrl
      || raw?.query !== EXPECTED.query
      || raw?.artwork_type !== EXPECTED.type
      || artworkHosts.size !== ARTWORK_HOSTS.size
      || [...artworkHosts].some((host) => !ARTWORK_HOSTS.has(host))
    ) throw new Error("untrusted art-glimpse configuration");
    return Object.freeze({
      apiHost: EXPECTED.apiHost,
      artworkHosts: ARTWORK_HOSTS,
      batchSize: boundedInteger(raw.batch_size, 12, 4, 20),
      candidateCount: boundedInteger(raw.candidate_count, 4, 4, 4),
      endpoint: EXPECTED.endpoint,
      imageHost: EXPECTED.imageHost,
      imageTimeoutMs: boundedInteger(raw.image_timeout_ms, 10_000, 3_000, 10_000),
      maxImageBytes: boundedInteger(raw.max_image_bytes, 1_200_000, 200_000, 2_000_000),
      maxResponseChars: boundedInteger(raw.max_response_chars, 262_144, 65_536, 524_288),
      maxRoundImageBytes: boundedInteger(raw.max_round_image_bytes, 4_000_000, 800_000, 6_000_000),
      query: EXPECTED.query,
      safeSkipMax: boundedInteger(raw.safe_skip_max, 300, 0, 300),
      timeoutMs: boundedInteger(raw.timeout_ms, 12_000, 3_000, 15_000),
      type: EXPECTED.type,
    });
  };

  const buildApiUrl = (config, skip) => {
    if (!Number.isSafeInteger(skip) || skip < 0 || skip > config.safeSkipMax) {
      throw new Error("invalid shallow offset");
    }
    const url = new URL(config.endpoint);
    url.searchParams.set("q", config.query);
    url.searchParams.set("cc0", "");
    url.searchParams.set("has_image", "1");
    url.searchParams.set("type", config.type);
    url.searchParams.set("limit", String(config.batchSize));
    url.searchParams.set("skip", String(skip));
    url.searchParams.set("fields", RESPONSE_FIELDS.join(","));
    return url.href;
  };

  const normalizeArtworks = (payload, config) => {
    if (!payload || !Array.isArray(payload.data)) return [];
    const normalized = [];
    const seenIds = new Set();
    const seenImages = new Set();
    for (const raw of payload.data) {
      const id = Number.parseInt(String(raw?.id ?? ""), 10);
      const title = String(raw?.title || "").replace(/\s+/g, " ").trim();
      const date = String(raw?.creation_date || "").replace(/\s+/g, " ").trim();
      const description = String(raw?.description || "").replace(/\s+/g, " ").trim();
      const image = raw?.images?.web;
      const width = Number.parseInt(String(image?.width ?? ""), 10);
      const height = Number.parseInt(String(image?.height ?? ""), 10);
      const filesize = Number.parseInt(String(image?.filesize ?? ""), 10);
      const imageUrl = safeHttpsUrl(image?.url, new Set([config.imageHost]), /_web\.jpg$/i);
      const sourceUrl = safeHttpsUrl(raw?.url, config.artworkHosts, /^\/art\/[^/]+\/?$/);
      const creator = Array.isArray(raw?.creators)
        ? String(raw.creators.find((item) => item?.description)?.description || "")
          .replace(/\s+/g, " ").trim()
        : "";
      const aspect = width / height;
      if (
        !Number.isSafeInteger(id) || seenIds.has(id) || !title || title.length > 180
        || !creator || creator.length > 240 || !date || date.length > 120
        || raw?.share_license_status !== "CC0" || raw?.type !== config.type
        || !imageUrl || !sourceUrl || seenImages.has(imageUrl)
        || !Number.isSafeInteger(width) || !Number.isSafeInteger(height)
        || width < 500 || height < 500 || aspect < 0.55 || aspect > 1.85
        || !Number.isSafeInteger(filesize) || filesize < 1 || filesize > config.maxImageBytes
        || SENSITIVE_TEXT.test(`${title} ${description}`)
      ) continue;
      seenIds.add(id);
      seenImages.add(imageUrl);
      normalized.push(Object.freeze({
        creator, date, filesize, height, id, imageUrl, sourceUrl, title, width,
      }));
    }
    return normalized;
  };

  const shuffle = (items, randomness) => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = randomness.uintBelow(index + 1);
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  };

  const normalizeRoundKinds = (value = ROUND_KINDS) => {
    const normalized = [...new Set(Array.isArray(value) ? value.map(String) : [])]
      .filter((kind) => ROUND_KINDS.includes(kind));
    if (!normalized.length) throw new RangeError("at least one artwork round kind is required");
    return Object.freeze(normalized);
  };

  const normalizeClueFields = (value = DEFAULT_CLUE_FIELDS) => {
    const normalized = [...new Set(Array.isArray(value) ? value.map(String) : [])]
      .filter((field) => CLUE_FIELDS.includes(field));
    if (!normalized.length) throw new RangeError("at least one artwork clue field is required");
    return Object.freeze(normalized);
  };

  const metadataSignature = (artwork, clueFields) => clueFields
    .map((field) => String(artwork?.[field] || "").replace(/\s+/g, " ").trim().toLocaleLowerCase())
    .join("\u001f");

  const candidateSets = (artworks, config, clueFields) => {
    const sets = [];
    for (let first = 0; first < artworks.length - 3; first += 1) {
      for (let second = first + 1; second < artworks.length - 2; second += 1) {
        for (let third = second + 1; third < artworks.length - 1; third += 1) {
          for (let fourth = third + 1; fourth < artworks.length; fourth += 1) {
            const selected = [artworks[first], artworks[second], artworks[third], artworks[fourth]];
            const signatures = new Set(selected.map((artwork) => metadataSignature(artwork, clueFields)));
            if (signatures.size === config.candidateCount) sets.push(Object.freeze(selected));
          }
        }
      }
    }
    return sets;
  };

  const createRound = (
    artworks,
    config,
    randomness = randomApi,
    allowedKinds = ROUND_KINDS,
    clueFields = DEFAULT_CLUE_FIELDS,
  ) => {
    if (!Array.isArray(artworks) || artworks.length < config.candidateCount) return null;
    const enabled = normalizeRoundKinds(allowedKinds);
    const visibleFields = normalizeClueFields(clueFields);
    const distinctSets = candidateSets(artworks, config, visibleFields);
    const budgetedSets = distinctSets.filter((selected) => (
      selected.reduce((sum, artwork) => sum + artwork.filesize, 0) <= config.maxRoundImageBytes
    ));
    const viableKinds = enabled.filter((kind) => (
      kind === "image_to_metadata" ? distinctSets.length : budgetedSets.length
    ));
    if (!viableKinds.length) return null;
    const kind = viableKinds[randomness.uintBelow(viableKinds.length)];
    const selected = kind === "metadata_to_image"
      ? budgetedSets[randomness.uintBelow(budgetedSets.length)]
      : distinctSets[randomness.uintBelow(distinctSets.length)];
    const options = shuffle(selected, randomness);
    const answer = options[randomness.uintBelow(options.length)];
    return Object.freeze({
      answer,
      clueFields: visibleFields,
      kind,
      options: Object.freeze(options),
      totalImageBytes: kind === "metadata_to_image"
        ? selected.reduce((sum, artwork) => sum + artwork.filesize, 0)
        : answer.filesize,
    });
  };

  const logic = Object.freeze({
    ARTWORK_HOSTS, CLUE_FIELDS, DEFAULT_CLUE_FIELDS, EXPECTED, RESPONSE_FIELDS,
    ROUND_KINDS, buildApiUrl, createRound, normalizeArtworks, normalizeClueFields,
    normalizeRoundKinds, safeHttpsUrl, shuffle, validateConfig,
  });
  globalThis.yiyuiiiArtGlimpseLogic = logic;
  if (!globalThis.document) return;

  const interpolate = (template, values) => Object.entries(values).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
    String(template || ""),
  );

  const readBoundedResponseText = async (response, limit) => {
    const declared = Number.parseInt(response.headers.get("content-length") || "", 10);
    if (Number.isFinite(declared) && declared > limit) throw new Error("oversize response");
    if (!response.body?.getReader || typeof globalThis.TextDecoder !== "function") {
      const body = await response.text();
      if (body.length > limit) throw new Error("oversize response");
      return body;
    }
    const reader = response.body.getReader();
    const decoder = new globalThis.TextDecoder();
    let body = "";
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value?.byteLength || 0;
      body += decoder.decode(value, { stream: true });
      if (bytes > limit || body.length > limit) {
        try { await reader.cancel("oversize response"); } catch (_error) { /* noop */ }
        throw new Error("oversize response");
      }
    }
    body += decoder.decode();
    if (body.length > limit) throw new Error("oversize response");
    return body;
  };

  const init = (root) => {
    if (root.dataset.artGlimpseReady === "true") return;
    let rawConfig;
    let config;
    try {
      rawConfig = JSON.parse(root.querySelector("[data-art-glimpse-config]")?.textContent || "null");
      config = validateConfig(rawConfig);
    } catch (_error) { return; }

    const find = (selector) => root.querySelector(selector);
    const enhanced = find("[data-art-glimpse-enhanced]");
    const interactive = find("[data-art-glimpse-interactive]");
    const settings = find("[data-art-glimpse-settings]");
    const settingsSummary = find("[data-art-glimpse-settings-summary]");
    const settingsApply = find("[data-art-glimpse-settings-apply]");
    const settingsReset = find("[data-art-glimpse-settings-reset]");
    const settingsStatus = find("[data-art-glimpse-settings-status]");
    const startButton = find("[data-art-glimpse-start]");
    const roundElement = find("[data-art-glimpse-round]");
    const clue = find("[data-art-glimpse-clue]");
    const prompt = find("[data-art-glimpse-prompt]");
    const clueCard = find("[data-art-glimpse-clue-card]");
    const clueImage = find("[data-art-glimpse-clue-image]");
    const clueTitle = find("[data-art-glimpse-clue-title]");
    const clueMaker = find("[data-art-glimpse-clue-maker]");
    const clueDate = find("[data-art-glimpse-clue-date]");
    const clueFieldRows = [...root.querySelectorAll("[data-art-glimpse-clue-field]")];
    const choices = find("[data-art-glimpse-choices]");
    const status = find("[data-art-glimpse-status]");
    const reveal = find("[data-art-glimpse-reveal]");
    const title = find("[data-art-glimpse-title]");
    const maker = find("[data-art-glimpse-maker]");
    const date = find("[data-art-glimpse-date]");
    const source = find("[data-art-glimpse-source]");
    if ([enhanced, interactive, settings, settingsSummary, settingsApply, settingsReset,
      settingsStatus, startButton, roundElement, clue, prompt, clueCard, clueImage,
      clueTitle, clueMaker, clueDate, choices,
      status, reveal, title, maker, date, source].some((node) => !node)
      || clueFieldRows.length !== CLUE_FIELDS.length) return;

    const copy = rawConfig.copy && typeof rawConfig.copy === "object" ? rawConfig.copy : {};
    let activeController = null;
    let activeImages = [];
    let activeToken = 0;
    let allowedKinds = normalizeRoundKinds();
    let allowedClueFields = normalizeClueFields();

    const kindFields = () => [...root.querySelectorAll("[data-art-glimpse-kind]")];
    const clueFieldInputs = () => [...root.querySelectorAll("[data-art-glimpse-clue-field-option]")];
    const setDraftKinds = (kinds) => {
      const selected = new Set(kinds);
      for (const field of kindFields()) field.checked = selected.has(field.value);
    };
    const setDraftClueFields = (fields) => {
      const selected = new Set(fields);
      for (const field of clueFieldInputs()) field.checked = selected.has(field.value);
    };
    const typeSummaryFor = (kinds) => kinds.length === ROUND_KINDS.length
      ? String(copy.settings_all || "")
      : String(copy.type_labels?.[kinds[0]] || "");
    const clueSummaryFor = (fields) => fields
      .map((field) => String(copy.clue_setting_labels?.[field] || ""))
      .filter(Boolean)
      .join(String(copy.clue_settings_separator || ", "));
    const summaryFor = (kinds, fields) => interpolate(copy.settings_summary, {
      clues: clueSummaryFor(fields),
      types: typeSummaryFor(kinds),
    });

    const setState = (state) => {
      root.dataset.artGlimpseState = state;
      const loading = state === "loading";
      root.toggleAttribute("aria-busy", loading);
      startButton.disabled = loading;
    };
    const clearRound = () => {
      for (const image of activeImages) image.removeAttribute("src");
      activeImages = [];
      prompt.textContent = "";
      clueTitle.textContent = "";
      clueMaker.textContent = "";
      clueDate.textContent = "";
      clueCard.hidden = false;
      clueImage.replaceChildren();
      clueImage.hidden = true;
      choices.replaceChildren();
      choices.removeAttribute("data-answered");
      choices.removeAttribute("data-kind");
      roundElement.hidden = true;
      roundElement.removeAttribute("data-kind");
      reveal.hidden = true;
      title.textContent = "";
      maker.textContent = "";
      date.textContent = "";
      source.textContent = "";
      source.removeAttribute("href");
    };
    const invalidate = () => {
      activeToken += 1;
      activeController?.abort();
      activeController = null;
      clearRound();
    };
    const fail = (message, token) => {
      if (token !== activeToken) return;
      activeController = null;
      clearRound();
      status.textContent = String(message || "");
      startButton.textContent = String(copy.retry || copy.start || "");
      setState("error");
      startButton.focus();
    };

    const loadImage = (artwork) => new Promise((resolve, reject) => {
      const image = new Image();
      activeImages.push(image);
      image.alt = "";
      image.decoding = "async";
      image.draggable = false;
      image.referrerPolicy = "no-referrer";
      const timer = globalThis.setTimeout(() => {
        image.removeAttribute("src");
        reject(new Error("image timeout"));
      }, config.imageTimeoutMs);
      image.addEventListener("load", async () => {
        try {
          if (typeof image.decode === "function") await image.decode();
          globalThis.clearTimeout(timer);
          resolve(image);
        } catch (_error) {
          globalThis.clearTimeout(timer);
          reject(new Error("image decode error"));
        }
      }, { once: true });
      image.addEventListener("error", () => {
        globalThis.clearTimeout(timer);
        reject(new Error("image error"));
      }, { once: true });
      image.src = artwork.imageUrl;
    });

    const appendBadge = (button, label) => {
      const badge = document.createElement("span");
      badge.className = "art-glimpse__badge";
      badge.textContent = String(label || "");
      button.append(badge);
    };

    const finishRound = (gameRound, artwork, button, token) => {
      if (token !== activeToken || choices.dataset.answered === "true") return;
      choices.dataset.answered = "true";
      const correct = artwork.id === gameRound.answer.id;
      for (const choice of choices.querySelectorAll("button")) {
        choice.disabled = true;
        if (choice.dataset.artworkId === String(gameRound.answer.id)) {
          choice.dataset.result = "correct";
          appendBadge(choice, copy.correct_badge);
        }
      }
      if (!correct) {
        button.dataset.result = "incorrect";
        appendBadge(button, copy.selected_badge);
      }
      const feedback = copy.feedback?.[gameRound.kind];
      status.textContent = interpolate(feedback?.[correct ? "correct" : "incorrect"], {
        title: gameRound.answer.title,
      });
      title.textContent = gameRound.answer.title;
      maker.textContent = gameRound.answer.creator || String(copy.unknown_artist || "");
      date.textContent = gameRound.answer.date || String(copy.unknown_date || "");
      source.href = gameRound.answer.sourceUrl;
      source.textContent = interpolate(copy.source_label, { title: gameRound.answer.title });
      reveal.hidden = false;
      startButton.textContent = String(copy.again || copy.start || "");
      setState("answered");
      startButton.focus();
    };

    const renderRound = (gameRound, images, token) => {
      const imageChoices = gameRound.kind === "metadata_to_image";
      prompt.textContent = String(copy.prompts?.[gameRound.kind] || "");
      clue.setAttribute("aria-label", prompt.textContent);
      choices.setAttribute("aria-label", String(copy.options_labels?.[gameRound.kind] || ""));
      choices.dataset.kind = gameRound.kind;
      clueCard.hidden = !imageChoices;
      clueImage.hidden = imageChoices;
      const visibleFields = new Set(gameRound.clueFields);
      for (const row of clueFieldRows) row.hidden = !visibleFields.has(row.dataset.artGlimpseClueField);
      if (imageChoices) {
        clueTitle.textContent = gameRound.answer.title;
        clueMaker.textContent = gameRound.answer.creator;
        clueDate.textContent = gameRound.answer.date;
      } else {
        const clueArtwork = images[0];
        clueArtwork.alt = String(copy.clue_image_alt || "");
        clueImage.replaceChildren(clueArtwork);
      }

      const fragment = document.createDocumentFragment();
      gameRound.options.forEach((artwork, index) => {
        const button = document.createElement("button");
        const number = index + 1;
        button.className = "art-glimpse__choice";
        button.type = "button";
        button.dataset.artworkId = String(artwork.id);
        if (imageChoices) {
          const image = images[index];
          button.setAttribute("aria-label", interpolate(copy.choice_label, { number }));
          image.alt = interpolate(copy.choice_image_alt, { number });
          button.append(image);
        } else {
          button.classList.add("art-glimpse__choice--metadata");
          const values = {
            creator: artwork.creator,
            date: artwork.date,
            title: artwork.title,
          };
          const details = gameRound.clueFields.map((field) => interpolate(copy.metadata_detail_label, {
            label: copy.clue_setting_labels?.[field] || field,
            value: values[field],
          })).join("; ");
          button.setAttribute("aria-label", interpolate(copy.metadata_choice_label, {
            details,
            number,
          }));
          gameRound.clueFields.forEach((field, fieldIndex) => {
            const optionField = document.createElement(fieldIndex === 0 ? "strong" : "span");
            optionField.dataset.clueField = field;
            optionField.textContent = values[field];
            button.append(optionField);
          });
        }
        button.addEventListener("click", () => finishRound(gameRound, artwork, button, token));
        fragment.append(button);
      });
      choices.replaceChildren(fragment);
      roundElement.dataset.kind = gameRound.kind;
      roundElement.hidden = false;
    };

    const start = async () => {
      invalidate();
      const token = activeToken;
      status.textContent = String(copy.loading_metadata || "");
      startButton.textContent = String(copy.again || copy.start || "");
      setState("loading");
      let requestUrl;
      try {
        requestUrl = buildApiUrl(config, secureUintBelow(config.safeSkipMax + 1));
      } catch (_error) {
        fail(copy.random_error, token);
        return;
      }
      const controller = new AbortController();
      activeController = controller;
      const timeout = globalThis.setTimeout(() => controller.abort(), config.timeoutMs);
      let payload;
      try {
        const response = await fetch(requestUrl, {
          cache: "no-store", credentials: "omit", headers: { Accept: "application/json" },
          method: "GET", mode: "cors", redirect: "error", referrerPolicy: "no-referrer",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`art API returned ${response.status}`);
        payload = JSON.parse(await readBoundedResponseText(response, config.maxResponseChars));
      } catch (_error) {
        globalThis.clearTimeout(timeout);
        fail(copy.network_error, token);
        return;
      }
      globalThis.clearTimeout(timeout);
      if (token !== activeToken) return;
      activeController = null;
      let gameRound;
      try {
        gameRound = createRound(
          normalizeArtworks(payload, config),
          config,
          randomApi,
          allowedKinds,
          allowedClueFields,
        );
      }
      catch (_error) { fail(copy.random_error, token); return; }
      if (!gameRound) { fail(copy.no_question, token); return; }

      status.textContent = String(copy.loading_images?.[gameRound.kind] || "");
      try {
        const imageTargets = gameRound.kind === "metadata_to_image"
          ? gameRound.options
          : [gameRound.answer];
        const images = await Promise.all(imageTargets.map(loadImage));
        if (token !== activeToken) return;
        renderRound(gameRound, images, token);
      } catch (_error) { fail(copy.image_errors?.[gameRound.kind], token); return; }
      status.textContent = "";
      startButton.textContent = String(copy.again || copy.start || "");
      setState("active");
      clue.focus();
    };

    settings.addEventListener("change", () => { settingsStatus.textContent = ""; });
    settingsReset.addEventListener("click", () => {
      setDraftKinds(ROUND_KINDS);
      setDraftClueFields(DEFAULT_CLUE_FIELDS);
      settingsStatus.textContent = String(copy.settings_defaults_ready || "");
    });
    settingsApply.addEventListener("click", () => {
      const selected = kindFields().filter((field) => field.checked).map((field) => field.value);
      if (!selected.length) {
        settingsStatus.textContent = String(copy.settings_required || "");
        return;
      }
      const selectedClueFields = clueFieldInputs()
        .filter((field) => field.checked)
        .map((field) => field.value);
      if (!selectedClueFields.length) {
        settingsStatus.textContent = String(copy.clue_settings_required || "");
        return;
      }
      allowedKinds = normalizeRoundKinds(selected);
      allowedClueFields = normalizeClueFields(selectedClueFields);
      invalidate();
      settingsSummary.textContent = summaryFor(allowedKinds, allowedClueFields);
      settings.open = false;
      settingsStatus.textContent = String(copy.settings_applied || "");
      status.textContent = String(copy.settings_applied || "");
      startButton.textContent = String(copy.start || "");
      setState("idle");
      startButton.focus();
    });

    root.dataset.artGlimpseReady = "true";
    enhanced.hidden = false;
    interactive.hidden = false;
    clearRound();
    setState("idle");
    setDraftKinds(allowedKinds);
    setDraftClueFields(allowedClueFields);
    settingsSummary.textContent = summaryFor(allowedKinds, allowedClueFields);
    startButton.addEventListener("click", start);
  };
  for (const root of document.querySelectorAll("[data-art-glimpse]")) init(root);
})();

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

  const createRound = (artworks, config, randomness = randomApi) => {
    const selected = [];
    let selectedBytes = 0;
    for (const artwork of shuffle(artworks, randomness)) {
      if (selectedBytes + artwork.filesize > config.maxRoundImageBytes) continue;
      selected.push(artwork);
      selectedBytes += artwork.filesize;
      if (selected.length === config.candidateCount) break;
    }
    if (selected.length !== config.candidateCount) return null;
    const options = shuffle(selected, randomness);
    const answer = options[randomness.uintBelow(options.length)];
    const positions = [20, 50, 80];
    const zooms = [1.9, 2.15, 2.4];
    return Object.freeze({
      answer,
      cropX: positions[randomness.uintBelow(positions.length)],
      cropY: positions[randomness.uintBelow(positions.length)],
      options: Object.freeze(options),
      totalImageBytes: selectedBytes,
      zoom: zooms[randomness.uintBelow(zooms.length)],
    });
  };

  const logic = Object.freeze({
    ARTWORK_HOSTS, EXPECTED, RESPONSE_FIELDS, buildApiUrl, createRound,
    normalizeArtworks, safeHttpsUrl, shuffle, validateConfig,
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
    const startButton = find("[data-art-glimpse-start]");
    const roundElement = find("[data-art-glimpse-round]");
    const clue = find("[data-art-glimpse-clue]");
    const clueCanvas = find("[data-art-glimpse-clue-canvas]");
    const choices = find("[data-art-glimpse-choices]");
    const status = find("[data-art-glimpse-status]");
    const reveal = find("[data-art-glimpse-reveal]");
    const title = find("[data-art-glimpse-title]");
    const maker = find("[data-art-glimpse-maker]");
    const date = find("[data-art-glimpse-date]");
    const source = find("[data-art-glimpse-source]");
    if ([enhanced, interactive, startButton, roundElement, clue, clueCanvas, choices,
      status, reveal, title, maker, date, source].some((node) => !node)) return;

    const copy = rawConfig.copy && typeof rawConfig.copy === "object" ? rawConfig.copy : {};
    let activeController = null;
    let activeImages = [];
    let activeToken = 0;

    const setState = (state) => {
      root.dataset.artGlimpseState = state;
      const loading = state === "loading";
      root.toggleAttribute("aria-busy", loading);
      startButton.disabled = loading;
    };
    const clearRound = () => {
      for (const image of activeImages) image.removeAttribute("src");
      activeImages = [];
      const clueContext = clueCanvas.getContext("2d");
      clueContext?.clearRect(0, 0, clueCanvas.width, clueCanvas.height);
      choices.replaceChildren();
      choices.removeAttribute("data-answered");
      roundElement.hidden = true;
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

    const renderRound = (gameRound, images, token) => {
      const fragment = document.createDocumentFragment();
      gameRound.options.forEach((artwork, index) => {
        const button = document.createElement("button");
        const image = images[index];
        const number = index + 1;
        button.className = "art-glimpse__choice";
        button.type = "button";
        button.dataset.artworkId = String(artwork.id);
        button.setAttribute("aria-label", interpolate(copy.choice_label, { number }));
        image.alt = interpolate(copy.choice_image_alt, { number });
        button.append(image);
        button.addEventListener("click", () => {
          if (token !== activeToken || choices.dataset.answered === "true") return;
          choices.dataset.answered = "true";
          const correct = artwork.id === gameRound.answer.id;
          for (const choice of choices.querySelectorAll("button")) {
            choice.disabled = true;
            if (choice.dataset.artworkId === String(gameRound.answer.id)) {
              choice.dataset.result = "correct";
              const badge = document.createElement("span");
              badge.className = "art-glimpse__badge";
              badge.textContent = String(copy.correct_badge || "");
              choice.append(badge);
            }
          }
          if (!correct) {
            button.dataset.result = "incorrect";
            const badge = document.createElement("span");
            badge.className = "art-glimpse__badge";
            badge.textContent = String(copy.selected_badge || "");
            button.append(badge);
          }
          status.textContent = String(correct ? copy.correct : copy.incorrect);
          title.textContent = gameRound.answer.title;
          maker.textContent = gameRound.answer.creator || String(copy.unknown_artist || "");
          date.textContent = gameRound.answer.date || String(copy.unknown_date || "");
          source.href = gameRound.answer.sourceUrl;
          source.textContent = interpolate(copy.source_label, { title: gameRound.answer.title });
          reveal.hidden = false;
          startButton.textContent = String(copy.again || copy.start || "");
          setState("answered");
          startButton.focus();
        });
        fragment.append(button);
      });
      choices.replaceChildren(fragment);
      const answerIndex = gameRound.options.findIndex((item) => item.id === gameRound.answer.id);
      const answerImage = images[answerIndex];
      const context = clueCanvas.getContext("2d");
      if (!context || !answerImage?.naturalWidth || !answerImage?.naturalHeight) {
        throw new Error("clue canvas is unavailable");
      }
      const destinationAspect = clueCanvas.width / clueCanvas.height;
      let sourceWidth;
      let sourceHeight;
      if (answerImage.naturalWidth / answerImage.naturalHeight >= destinationAspect) {
        sourceHeight = answerImage.naturalHeight / gameRound.zoom;
        sourceWidth = sourceHeight * destinationAspect;
      } else {
        sourceWidth = answerImage.naturalWidth / gameRound.zoom;
        sourceHeight = sourceWidth / destinationAspect;
      }
      const centerX = answerImage.naturalWidth * gameRound.cropX / 100;
      const centerY = answerImage.naturalHeight * gameRound.cropY / 100;
      const sourceX = Math.min(
        Math.max(centerX - sourceWidth / 2, 0),
        answerImage.naturalWidth - sourceWidth,
      );
      const sourceY = Math.min(
        Math.max(centerY - sourceHeight / 2, 0),
        answerImage.naturalHeight - sourceHeight,
      );
      context.clearRect(0, 0, clueCanvas.width, clueCanvas.height);
      context.drawImage(
        answerImage,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        clueCanvas.width,
        clueCanvas.height,
      );
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
      try { gameRound = createRound(normalizeArtworks(payload, config), config, randomApi); }
      catch (_error) { fail(copy.random_error, token); return; }
      if (!gameRound) { fail(copy.no_question, token); return; }

      status.textContent = String(copy.loading_images || "");
      try {
        const images = await Promise.all(gameRound.options.map(loadImage));
        if (token !== activeToken) return;
        renderRound(gameRound, images, token);
      } catch (_error) { fail(copy.image_error, token); return; }
      status.textContent = "";
      startButton.textContent = String(copy.again || copy.start || "");
      setState("active");
      clue.focus();
    };

    root.dataset.artGlimpseReady = "true";
    enhanced.hidden = false;
    interactive.hidden = false;
    clearRound();
    setState("idle");
    startButton.addEventListener("click", start);
  };
  for (const root of document.querySelectorAll("[data-art-glimpse]")) init(root);
})();

(() => {
  "use strict";

  const root = document.querySelector("[data-toy-index]");
  if (!root) return;

  const allowedPaths = Object.freeze({
    random: "/assets/js/toy-random.js",
    generators: "/assets/js/toy-generators.js",
    history: "/assets/js/toy-challenge-history.js",
    challenges: "/assets/js/toy-challenges.js",
    color: "/assets/js/toy-color-challenge.js",
    codebreaker: "/assets/js/toy-codebreaker.js",
    make24: "/assets/js/toy-make-24.js",
    lights: "/assets/js/toy-lights-out.js",
    moegirl: "/assets/js/moegirl-quiz.js",
    art: "/assets/js/art-glimpse.js",
    "acg-logic": "/assets/js/acg-relation-quiz-logic.js",
    "acg-ui": "/assets/js/acg-relation-quiz.js",
  });
  const allowedDependencies = Object.freeze({
    "moegirl-quiz": ["moegirl"],
    "art-glimpse": ["art"],
    "anilist-role-quiz": ["acg-logic", "acg-ui"],
    "color-challenge": ["random", "color"],
    "ten-second": ["random", "history", "challenges"],
    "reaction-time": ["random", "history", "challenges"],
    codebreaker: ["random", "codebreaker"],
    "make-24": ["random", "make24"],
    "lights-out": ["random", "lights"],
    "random-password": ["random", "generators"],
    "random-number": ["random", "generators"],
  });
  const manifestNode = root.querySelector("[data-toy-asset-manifest]");
  const assetUrls = new Map();
  const assetPromises = new Map();
  const disclosurePromises = new WeakMap();

  const normalizeManifest = () => {
    const manifest = JSON.parse(manifestNode?.textContent || "{}");
    for (const [token, expectedPath] of Object.entries(allowedPaths)) {
      const url = new URL(manifest[token], window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== expectedPath || url.hash) {
        throw new Error(`Rejected toy asset: ${token}`);
      }
      assetUrls.set(token, url.href);
    }
  };

  const loadAsset = (token) => {
    if (!assetUrls.has(token)) return Promise.reject(new Error(`Unknown toy asset: ${token}`));
    if (assetPromises.has(token)) return assetPromises.get(token);

    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = assetUrls.get(token);
      script.async = false;
      script.dataset.toyAsset = token;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => {
        script.remove();
        reject(new Error(`Failed to load toy asset: ${token}`));
      }, { once: true });
      document.head.append(script);
    });
    assetPromises.set(token, promise);
    promise.catch(() => {
      if (assetPromises.get(token) === promise) assetPromises.delete(token);
    });
    return promise;
  };

  const setStatus = (disclosure, state) => {
    const status = disclosure.querySelector(":scope > .toy-entry__body > [data-toy-loader-status]");
    const message = status?.querySelector("[data-toy-loader-message]");
    const retry = status?.querySelector("[data-toy-loader-retry]");
    disclosure.dataset.toyLoadState = state;
    disclosure.toggleAttribute("aria-busy", state === "loading");
    if (!status || !message || !retry) return;
    status.dataset.state = state;
    status.hidden = state === "ready";
    retry.hidden = state !== "error";
    message.textContent = state === "error" ? root.dataset.toyLoadError : root.dataset.toyLoading;
  };

  const loadDisclosure = (disclosure) => {
    if (disclosure.dataset.toyLoadState === "ready") return Promise.resolve();
    if (disclosurePromises.has(disclosure)) return disclosurePromises.get(disclosure);

    setStatus(disclosure, "loading");
    const tokens = allowedDependencies[disclosure.id];
    if (!tokens || tokens.join(" ") !== disclosure.dataset.toyAssets) {
      setStatus(disclosure, "error");
      return Promise.resolve();
    }
    const promise = tokens.reduce(
      (previous, token) => previous.then(() => loadAsset(token)),
      Promise.resolve(),
    ).then(() => setStatus(disclosure, "ready"), () => setStatus(disclosure, "error"));
    disclosurePromises.set(disclosure, promise);
    promise.finally(() => {
      if (disclosurePromises.get(disclosure) === promise) disclosurePromises.delete(disclosure);
    });
    return promise;
  };

  const openHashTarget = (event) => {
    const hash = event?.detail?.hash || window.location.hash;
    if (!hash) return;
    let targetId;
    try {
      targetId = decodeURIComponent(hash.slice(1));
    } catch (_error) {
      return;
    }
    const target = document.getElementById(targetId);
    const disclosure = target?.matches("details") ? target : target?.closest("details");
    if (!disclosure?.matches("[data-toy-disclosure]")) return;
    disclosure.open = true;
    loadDisclosure(disclosure);
  };

  try {
    normalizeManifest();
  } catch (_error) {
    root.querySelectorAll("[data-toy-disclosure]").forEach((disclosure) => setStatus(disclosure, "error"));
    return;
  }

  root.querySelectorAll("[data-toy-disclosure]").forEach((disclosure) => {
    disclosure.addEventListener("toggle", () => {
      if (disclosure.open) loadDisclosure(disclosure);
    });
    disclosure.querySelector("[data-toy-loader-retry]")?.addEventListener("click", () => {
      loadDisclosure(disclosure);
    });
    if (disclosure.open) loadDisclosure(disclosure);
  });
  openHashTarget();
  window.addEventListener("hashchange", openHashTarget);
  window.addEventListener("yiyuiii:open-hash-target", openHashTarget);
})();

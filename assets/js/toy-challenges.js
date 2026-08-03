(() => {
  "use strict";

  const globalScope = typeof window === "undefined" ? globalThis : window;
  const TARGET_TEN_SECONDS_MS = 10_000;

  const interpolate = (template, values) => Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    String(template),
  );

  const hasRandomApi = (randomApi) => Boolean(
    randomApi
    && typeof randomApi.intInclusive === "function"
    && typeof randomApi.uintBelow === "function"
    && typeof randomApi.pick === "function"
  );

  const tenSecondTransition = (state, event, now) => {
    const current = state || Object.freeze({ phase: "idle" });
    if (!Number.isFinite(now)) return current;
    if (event === "start") {
      return Object.freeze({ phase: "running", startedAt: now });
    }
    if (event === "stop" && current.phase === "running") {
      const elapsed = Math.max(0, now - current.startedAt);
      return Object.freeze({
        phase: "finished",
        elapsed,
        difference: Math.abs(elapsed - TARGET_TEN_SECONDS_MS),
      });
    }
    if (event === "cancel" && current.phase === "running") {
      return Object.freeze({ phase: "cancelled" });
    }
    return current;
  };

  const reactionTransition = (state, event, now, delay) => {
    const current = state || Object.freeze({ phase: "idle" });
    if (!Number.isFinite(now)) return current;
    if (event === "start") {
      if (!Number.isFinite(delay) || delay < 0) return current;
      return Object.freeze({ phase: "waiting", startedAt: now, delay });
    }
    if (event === "signal" && current.phase === "waiting") {
      return Object.freeze({ phase: "ready", signalledAt: now });
    }
    if (event === "press" && current.phase === "waiting") {
      return Object.freeze({ phase: "tooSoon" });
    }
    if (event === "press" && current.phase === "ready") {
      return Object.freeze({
        phase: "finished",
        elapsed: Math.max(0, now - current.signalledAt),
      });
    }
    if (event === "cancel" && (current.phase === "waiting" || current.phase === "ready")) {
      return Object.freeze({ phase: "cancelled" });
    }
    return current;
  };

  const logic = Object.freeze({
    hasRandomApi,
    reactionTransition,
    tenSecondTransition,
  });
  globalScope.yiyuiiiToyChallengeLogic = logic;

  if (typeof document === "undefined") return;
  if (globalScope.yiyuiiiToyChallengesReady === true) return;
  globalScope.yiyuiiiToyChallengesReady = true;

  const readCopy = (root) => {
    const node = root.querySelector("[data-challenge-copy]");
    if (!node) throw new Error("missing challenge copy");
    return JSON.parse(node.textContent || "null");
  };

  const disableChallenge = (root, copy) => {
    const interactive = root.querySelector("[data-challenge-interactive]");
    const unavailable = root.querySelector("[data-challenge-unavailable]");
    if (interactive) interactive.hidden = true;
    if (unavailable) {
      unavailable.textContent = copy?.unavailable || unavailable.textContent;
      unavailable.hidden = false;
    }
    root.dataset.state = "unavailable";
  };

  const prepareChallenge = (root, requiresRandom = true) => {
    let copy;
    try {
      copy = readCopy(root);
    } catch (_error) {
      disableChallenge(root, null);
      return null;
    }
    const randomApi = globalScope.yiyuiiiToyRandom;
    if (requiresRandom && !hasRandomApi(randomApi)) {
      disableChallenge(root, copy);
      return null;
    }
    const interactive = root.querySelector("[data-challenge-interactive]");
    if (!interactive) {
      disableChallenge(root, copy);
      return null;
    }
    interactive.hidden = false;
    return { copy, randomApi };
  };

  const bindCancellation = (root, cancel) => {
    const cancelWhenHidden = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener("visibilitychange", cancelWhenHidden);
    globalScope.addEventListener("pagehide", cancel);

    const disclosure = root.closest("details");
    if (disclosure) {
      disclosure.addEventListener("toggle", () => {
        if (!disclosure.open) cancel();
      });
    }
  };

  const noopHistory = Object.freeze({
    append() {},
    falseStart() {},
    refresh() {},
  });

  const prepareHistory = (root, kind, copy) => {
    const historyApi = globalScope.yiyuiiiToyChallengeHistory;
    if (!historyApi || typeof historyApi.createHistoryController !== "function") {
      return noopHistory;
    }
    try {
      return historyApi.createHistoryController({ root, kind, copy });
    } catch (_error) {
      return noopHistory;
    }
  };

  const initTenSecond = (root) => {
    if (root.dataset.challengeReady === "true") return;
    let history = noopHistory;
    try {
      history = prepareHistory(root, "ten-second", readCopy(root));
    } catch (_error) {
      // The ordinary timer remains available when local history cannot initialize.
    }
    const prepared = prepareChallenge(root, false);
    if (!prepared) return;
    const { copy } = prepared;
    const primary = root.querySelector("[data-ten-primary]");
    const restart = root.querySelector("[data-ten-restart]");
    const status = root.querySelector("[data-challenge-status]");
    if (!primary || !restart || !status) {
      disableChallenge(root, copy);
      return;
    }

    let state = Object.freeze({ phase: "idle" });

    const render = () => {
      root.dataset.state = state.phase;
      if (state.phase === "running") {
        primary.textContent = copy.stop;
        restart.hidden = false;
        status.textContent = copy.running;
        return;
      }
      restart.hidden = true;
      primary.textContent = state.phase === "idle" ? copy.start : copy.again;
      if (state.phase === "finished") {
        const elapsed = (state.elapsed / 1000).toFixed(2);
        const difference = (state.difference / 1000).toFixed(2);
        if (state.difference < 10) {
          status.textContent = interpolate(copy.exact, { elapsed });
        } else {
          status.textContent = interpolate(copy.result, {
            difference,
            direction: state.elapsed < TARGET_TEN_SECONDS_MS ? copy.early : copy.late,
            elapsed,
          });
        }
      } else if (state.phase === "cancelled") {
        status.textContent = copy.cancelled;
      } else {
        status.textContent = "";
      }
    };

    const start = () => {
      state = tenSecondTransition(state, "start", performance.now());
      render();
    };
    const cancel = () => {
      const nextState = tenSecondTransition(state, "cancel", performance.now());
      if (nextState !== state) {
        state = nextState;
        render();
      }
    };

    primary.addEventListener("click", () => {
      if (state.phase === "running") {
        const nextState = tenSecondTransition(state, "stop", performance.now());
        if (nextState.phase === "finished") history.append(Math.round(nextState.elapsed));
        state = nextState;
        render();
      } else {
        start();
      }
    });
    restart.addEventListener("click", start);
    bindCancellation(root, cancel);
    root.dataset.challengeReady = "true";
    render();
  };

  const initReactionTime = (root) => {
    if (root.dataset.challengeReady === "true") return;
    let history = noopHistory;
    try {
      history = prepareHistory(root, "reaction-time", readCopy(root));
    } catch (_error) {
      // Saved results remain optional; the reaction challenge has its own availability check.
    }
    const prepared = prepareChallenge(root);
    if (!prepared) return;
    const { copy, randomApi } = prepared;
    const primary = root.querySelector("[data-reaction-primary]");
    const status = root.querySelector("[data-challenge-status]");
    if (!primary || !status) {
      disableChallenge(root, copy);
      return;
    }

    let state = Object.freeze({ phase: "idle" });
    let timer = 0;
    let signalFrame = 0;
    let attemptToken = 0;

    const clearSignal = () => {
      if (timer) globalScope.clearTimeout(timer);
      if (signalFrame) globalScope.cancelAnimationFrame(signalFrame);
      timer = 0;
      signalFrame = 0;
      attemptToken += 1;
    };

    const render = () => {
      root.dataset.state = state.phase;
      if (state.phase === "waiting") {
        primary.textContent = copy.wait;
        status.textContent = copy.waiting;
      } else if (state.phase === "ready") {
        primary.textContent = copy.now;
        status.textContent = copy.ready;
      } else if (state.phase === "tooSoon") {
        primary.textContent = copy.again;
        status.textContent = copy.tooSoon;
      } else if (state.phase === "finished") {
        primary.textContent = copy.again;
        status.textContent = interpolate(copy.result, {
          milliseconds: Math.round(state.elapsed),
        });
      } else if (state.phase === "cancelled") {
        primary.textContent = copy.again;
        status.textContent = copy.cancelled;
      } else {
        primary.textContent = copy.start;
        status.textContent = "";
      }
    };

    const cancel = () => {
      const nextState = reactionTransition(state, "cancel", performance.now());
      if (nextState !== state) {
        clearSignal();
        state = nextState;
        render();
      }
    };

    const start = () => {
      clearSignal();
      let delay;
      try {
        delay = randomApi.intInclusive(1500, 4000);
      } catch (_error) {
        disableChallenge(root, copy);
        return;
      }
      state = reactionTransition(state, "start", performance.now(), delay);
      render();
      const token = attemptToken;
      timer = globalScope.setTimeout(() => {
        if (token !== attemptToken || state.phase !== "waiting") return;
        timer = 0;
        if (document.hidden) {
          cancel();
          return;
        }
        signalFrame = globalScope.requestAnimationFrame(() => {
          signalFrame = 0;
          if (token !== attemptToken || state.phase !== "waiting" || document.hidden) {
            cancel();
            return;
          }
          state = reactionTransition(state, "signal", performance.now());
          render();
        });
      }, delay);
    };

    primary.addEventListener("click", () => {
      if (state.phase === "waiting") {
        clearSignal();
        const nextState = reactionTransition(state, "press", performance.now());
        if (nextState.phase === "tooSoon") history.falseStart();
        state = nextState;
        render();
      } else if (state.phase === "ready") {
        const nextState = reactionTransition(state, "press", performance.now());
        if (nextState.phase === "finished") history.append(Math.round(nextState.elapsed));
        state = nextState;
        render();
      } else {
        start();
      }
    });
    bindCancellation(root, cancel);
    root.dataset.challengeReady = "true";
    render();
  };

  for (const root of document.querySelectorAll("[data-toy-ten-second]")) {
    initTenSecond(root);
  }
  for (const root of document.querySelectorAll("[data-toy-reaction-time]")) {
    initReactionTime(root);
  }
})();

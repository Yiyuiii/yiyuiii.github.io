(() => {
  "use strict";

  const globalScope = typeof window === "undefined" ? globalThis : window;
  const TARGET_TEN_SECONDS_MS = 10_000;
  const COLOR_DELTAS = Object.freeze([12, 7, 4]);

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

  const colorDifficulty = (consecutiveCorrect) => {
    const streak = Number.isSafeInteger(consecutiveCorrect) && consecutiveCorrect > 0
      ? consecutiveCorrect
      : 0;
    return Math.min(Math.floor(streak / 2), COLOR_DELTAS.length - 1);
  };

  const createColorRound = (randomApi, consecutiveCorrect) => {
    if (!hasRandomApi(randomApi)) throw new Error("local random interface is unavailable");
    const difficulty = colorDifficulty(consecutiveCorrect);
    const hue = randomApi.intInclusive(0, 359);
    const saturation = randomApi.intInclusive(60, 74);
    const lightness = randomApi.intInclusive(44, 56);
    const direction = randomApi.pick([-1, 1]);
    if (direction !== -1 && direction !== 1) throw new Error("unexpected random choice");
    const oddIndex = randomApi.uintBelow(16);
    if (!Number.isSafeInteger(oddIndex) || oddIndex < 0 || oddIndex >= 16) {
      throw new Error("unexpected random index");
    }
    const oddLightness = lightness + (direction * COLOR_DELTAS[difficulty]);
    return Object.freeze({
      difficulty,
      normalColor: `hsl(${hue} ${saturation}% ${lightness}%)`,
      oddColor: `hsl(${hue} ${saturation}% ${oddLightness}%)`,
      oddIndex,
    });
  };

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
    colorDifficulty,
    createColorRound,
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
    } catch (error) {
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

  const initColorChallenge = (root) => {
    if (root.dataset.challengeReady === "true") return;
    const prepared = prepareChallenge(root);
    if (!prepared) return;
    const { copy, randomApi } = prepared;
    const grid = root.querySelector("[data-color-grid]");
    const nextButton = root.querySelector("[data-color-next]");
    const status = root.querySelector("[data-challenge-status]");
    if (!grid || !nextButton || !status || !Array.isArray(copy.levels)) {
      disableChallenge(root, copy);
      return;
    }

    let consecutiveCorrect = 0;
    let activeRound = null;
    let answered = false;

    const renderRound = (moveFocus = false) => {
      try {
        activeRound = createColorRound(randomApi, consecutiveCorrect);
      } catch (error) {
        disableChallenge(root, copy);
        return;
      }
      answered = false;
      nextButton.disabled = true;
      status.textContent = "";
      root.dataset.difficulty = String(activeRound.difficulty);

      const fragment = document.createDocumentFragment();
      for (let index = 0; index < 16; index += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "toy-color-challenge__cell";
        button.dataset.colorIndex = String(index);
        button.setAttribute("aria-label", interpolate(copy.cellLabel, { number: index + 1 }));
        button.style.backgroundColor = index === activeRound.oddIndex
          ? activeRound.oddColor
          : activeRound.normalColor;
        fragment.append(button);
      }
      grid.replaceChildren(fragment);
      if (moveFocus) grid.querySelector("button")?.focus();
    };

    grid.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-color-index]");
      if (!button || answered || !activeRound) return;
      answered = true;
      const selectedIndex = Number.parseInt(button.dataset.colorIndex || "", 10);
      const correct = selectedIndex === activeRound.oddIndex;
      consecutiveCorrect = correct ? consecutiveCorrect + 1 : 0;

      for (const choice of grid.querySelectorAll("button")) choice.disabled = true;
      const answer = grid.querySelector(`[data-color-index="${activeRound.oddIndex}"]`);
      if (answer) answer.dataset.result = "correct";
      if (!correct) button.dataset.result = "incorrect";

      const level = copy.levels[activeRound.difficulty] || copy.levels[0];
      status.textContent = `${correct ? copy.correct : copy.incorrect} ${interpolate(
        copy.levelLabel,
        { level },
      )}`;
      nextButton.disabled = false;
      nextButton.focus();
    });

    nextButton.addEventListener("click", () => renderRound(true));
    root.dataset.challengeReady = "true";
    root.dataset.state = "ready";
    renderRound();
  };

  const initTenSecond = (root) => {
    if (root.dataset.challengeReady === "true") return;
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
        state = tenSecondTransition(state, "stop", performance.now());
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
    let attemptToken = 0;

    const clearSignal = () => {
      if (timer) globalScope.clearTimeout(timer);
      timer = 0;
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

    const start = () => {
      clearSignal();
      let delay;
      try {
        delay = randomApi.intInclusive(1500, 4000);
      } catch (error) {
        disableChallenge(root, copy);
        return;
      }
      state = reactionTransition(state, "start", performance.now(), delay);
      render();
      const token = attemptToken;
      timer = globalScope.setTimeout(() => {
        if (token !== attemptToken || state.phase !== "waiting") return;
        timer = 0;
        state = reactionTransition(state, "signal", performance.now());
        render();
      }, delay);
    };

    const cancel = () => {
      const nextState = reactionTransition(state, "cancel", performance.now());
      if (nextState !== state) {
        clearSignal();
        state = nextState;
        render();
      }
    };

    primary.addEventListener("click", () => {
      if (state.phase === "waiting") {
        clearSignal();
        state = reactionTransition(state, "press", performance.now());
        render();
      } else if (state.phase === "ready") {
        state = reactionTransition(state, "press", performance.now());
        render();
      } else {
        start();
      }
    });
    bindCancellation(root, cancel);
    root.dataset.challengeReady = "true";
    render();
  };

  for (const root of document.querySelectorAll("[data-toy-color-challenge]")) {
    initColorChallenge(root);
  }
  for (const root of document.querySelectorAll("[data-toy-ten-second]")) {
    initTenSecond(root);
  }
  for (const root of document.querySelectorAll("[data-toy-reaction-time]")) {
    initReactionTime(root);
  }
})();

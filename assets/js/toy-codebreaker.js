(() => {
  "use strict";

  const globalScope = typeof window === "undefined" ? globalThis : window;
  const CODE_LENGTHS = Object.freeze([3, 4, 5, 6]);
  const ATTEMPT_LIMITS = Object.freeze([6, 8, 10, 12]);
  const DEFAULT_CONFIG = Object.freeze({
    allowDuplicates: false,
    attempts: 8,
    length: 4,
  });
  const PRESETS = Object.freeze({
    beginner: Object.freeze({ allowDuplicates: false, attempts: 8, length: 3 }),
    duplicates: Object.freeze({ allowDuplicates: true, attempts: 10, length: 4 }),
    standard: DEFAULT_CONFIG,
  });

  const interpolate = (template, values) => Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    String(template),
  );

  const hasRandomApi = (randomApi) => Boolean(
    randomApi && typeof randomApi.uintBelow === "function"
  );

  const normalizeConfig = (rawConfig = DEFAULT_CONFIG) => {
    const config = {
      allowDuplicates: rawConfig.allowDuplicates ?? DEFAULT_CONFIG.allowDuplicates,
      attempts: rawConfig.attempts ?? DEFAULT_CONFIG.attempts,
      length: rawConfig.length ?? DEFAULT_CONFIG.length,
    };
    if (typeof config.allowDuplicates !== "boolean") {
      throw new RangeError("allowDuplicates must be boolean");
    }
    if (!CODE_LENGTHS.includes(config.length)) {
      throw new RangeError("unsupported code length");
    }
    if (!ATTEMPT_LIMITS.includes(config.attempts)) {
      throw new RangeError("unsupported attempt limit");
    }
    return Object.freeze(config);
  };

  const candidateCount = (rawConfig = DEFAULT_CONFIG) => {
    const config = normalizeConfig(rawConfig);
    if (config.allowDuplicates) return 10 ** config.length;
    let count = 1;
    for (let index = 0; index < config.length; index += 1) count *= 10 - index;
    return count;
  };

  const createSecret = (randomApi, rawConfig = DEFAULT_CONFIG) => {
    if (!hasRandomApi(randomApi)) throw new Error("secure randomness is unavailable");
    const config = normalizeConfig(rawConfig);
    if (config.allowDuplicates) {
      return Array.from({ length: config.length }, () => String(randomApi.uintBelow(10))).join("");
    }

    const digits = Array.from({ length: 10 }, (_, digit) => String(digit));
    for (let index = 0; index < config.length; index += 1) {
      const selected = index + randomApi.uintBelow(digits.length - index);
      [digits[index], digits[selected]] = [digits[selected], digits[index]];
    }
    return digits.slice(0, config.length).join("");
  };

  const validateGuess = (guess, rawConfig = DEFAULT_CONFIG) => {
    const config = normalizeConfig(rawConfig);
    const value = String(guess);
    if (!new RegExp(`^[0-9]{${config.length}}$`).test(value)) {
      return Object.freeze({ code: "digits", valid: false });
    }
    if (!config.allowDuplicates && new Set(value).size !== value.length) {
      return Object.freeze({ code: "duplicates", valid: false });
    }
    return Object.freeze({ code: null, valid: true });
  };

  const scoreGuess = (secret, guess) => {
    const answer = String(secret);
    const attempt = String(guess);
    if (answer.length !== attempt.length || !/^[0-9]+$/.test(answer + attempt)) {
      throw new RangeError("secret and guess must be equal-length digit strings");
    }

    let exact = 0;
    const answerCounts = Array(10).fill(0);
    const guessCounts = Array(10).fill(0);
    for (let index = 0; index < answer.length; index += 1) {
      if (answer[index] === attempt[index]) {
        exact += 1;
      } else {
        answerCounts[Number(answer[index])] += 1;
        guessCounts[Number(attempt[index])] += 1;
      }
    }
    const misplaced = answerCounts.reduce(
      (total, count, digit) => total + Math.min(count, guessCounts[digit]),
      0,
    );
    return Object.freeze({ exact, misplaced });
  };

  const createGameState = (randomApi, rawConfig = DEFAULT_CONFIG) => {
    const config = normalizeConfig(rawConfig);
    return Object.freeze({
      config,
      history: Object.freeze([]),
      phase: "playing",
      secret: createSecret(randomApi, config),
    });
  };

  const submitGuess = (state, guess) => {
    if (!state || state.phase !== "playing") return state;
    const validation = validateGuess(guess, state.config);
    if (!validation.valid) throw new RangeError(validation.code);
    const score = scoreGuess(state.secret, guess);
    const entry = Object.freeze({
      attempt: state.history.length + 1,
      exact: score.exact,
      guess: String(guess),
      misplaced: score.misplaced,
    });
    const history = Object.freeze([...state.history, entry]);
    const phase = score.exact === state.config.length
      ? "won"
      : history.length >= state.config.attempts ? "lost" : "playing";
    return Object.freeze({
      ...state,
      history,
      phase,
    });
  };

  const revealAnswer = (state) => state.phase === "playing"
    ? Object.freeze({ ...state, phase: "revealed" })
    : state;

  const logic = Object.freeze({
    ATTEMPT_LIMITS,
    CODE_LENGTHS,
    DEFAULT_CONFIG,
    PRESETS,
    candidateCount,
    createGameState,
    createSecret,
    hasRandomApi,
    normalizeConfig,
    revealAnswer,
    scoreGuess,
    submitGuess,
    validateGuess,
  });
  globalScope.yiyuiiiToyCodebreakerLogic = logic;

  if (typeof document === "undefined") return;

  const readCopy = (root) => {
    const node = root.querySelector("[data-code-copy]");
    if (!node) throw new Error("missing codebreaker copy");
    return JSON.parse(node.textContent || "null");
  };

  const disableGame = (root, copy) => {
    const interactive = root.querySelector("[data-code-interactive]");
    const unavailable = root.querySelector("[data-code-unavailable]");
    if (interactive) interactive.hidden = true;
    if (unavailable) {
      unavailable.textContent = copy?.unavailable || unavailable.textContent;
      unavailable.hidden = false;
    }
    root.dataset.state = "unavailable";
  };

  const initialize = (root) => {
    if (root.dataset.codebreakerReady === "true") return;
    let copy;
    try {
      copy = readCopy(root);
    } catch (_error) {
      disableGame(root, null);
      return;
    }

    const randomApi = globalScope.yiyuiiiToyRandom;
    const interactive = root.querySelector("[data-code-interactive]");
    const settings = root.querySelector("[data-code-settings]");
    const settingsSummary = root.querySelector("[data-code-settings-summary]");
    const settingsStatus = root.querySelector("[data-code-settings-status]");
    const lengthField = root.querySelector("[data-code-length]");
    const attemptsField = root.querySelector("[data-code-attempts]");
    const duplicatesField = root.querySelector("[data-code-duplicates]");
    const candidatesOutput = root.querySelector("[data-code-candidates]");
    const resetButton = root.querySelector("[data-code-reset]");
    const applyButton = root.querySelector("[data-code-apply]");
    const form = root.querySelector("[data-code-form]");
    const input = root.querySelector("[data-code-input]");
    const inputHelp = root.querySelector("[data-code-input-help]");
    const submitButton = root.querySelector("[data-code-submit]");
    const newButton = root.querySelector("[data-code-new]");
    const revealButton = root.querySelector("[data-code-reveal]");
    const status = root.querySelector("[data-code-status]");
    const attemptsUsed = root.querySelector("[data-code-attempts-used]");
    const remaining = root.querySelector("[data-code-remaining]");
    const history = root.querySelector("[data-code-history]");
    const historyBody = root.querySelector("[data-code-history-body]");

    if (!hasRandomApi(randomApi) || [
      interactive, settings, settingsSummary, settingsStatus, lengthField, attemptsField,
      duplicatesField, candidatesOutput, resetButton, applyButton, form, input, inputHelp,
      submitButton, newButton, revealButton, status, attemptsUsed, remaining, history, historyBody,
    ].some((node) => !node)) {
      disableGame(root, copy);
      return;
    }

    const numberFormatter = new Intl.NumberFormat(copy.locale, { maximumFractionDigits: 0 });
    let config = normalizeConfig(DEFAULT_CONFIG);
    let state;

    const readDraftConfig = () => normalizeConfig({
      allowDuplicates: duplicatesField.checked,
      attempts: Number.parseInt(attemptsField.value, 10),
      length: Number.parseInt(lengthField.value, 10),
    });

    const draftCandidateText = (draft) => interpolate(copy.candidateValue, {
      count: numberFormatter.format(candidateCount(draft)),
    });

    const setDraftConfig = (rawConfig) => {
      const draft = normalizeConfig(rawConfig);
      lengthField.value = String(draft.length);
      attemptsField.value = String(draft.attempts);
      duplicatesField.checked = draft.allowDuplicates;
      candidatesOutput.value = draftCandidateText(draft);
    };

    const summaryText = (activeConfig) => interpolate(copy.settingsSummary, {
      attempts: activeConfig.attempts,
      candidates: numberFormatter.format(candidateCount(activeConfig)),
      duplicates: activeConfig.allowDuplicates
        ? copy.duplicatesAllowed
        : copy.duplicatesDisallowed,
      length: activeConfig.length,
    });

    const renderInputRules = () => {
      input.maxLength = config.length;
      input.placeholder = "012345".slice(0, config.length);
      inputHelp.textContent = interpolate(copy.inputHelp, {
        length: config.length,
        unique: config.allowDuplicates ? "" : copy.uniqueSuffix,
      });
    };

    const renderHistory = () => {
      const fragment = document.createDocumentFragment();
      for (const entry of state.history) {
        const row = document.createElement("tr");
        const values = [entry.attempt, entry.guess, entry.exact, entry.misplaced];
        for (const [index, value] of values.entries()) {
          const cell = document.createElement(index === 0 ? "th" : "td");
          if (index === 0) cell.scope = "row";
          cell.textContent = String(value);
          if (index === 1) cell.className = "toy-codebreaker__guess";
          row.append(cell);
        }
        fragment.append(row);
      }
      historyBody.replaceChildren(fragment);
      history.hidden = state.history.length === 0;
    };

    const renderState = (moveFocus = false) => {
      const used = state.history.length;
      root.dataset.state = state.phase;
      root.dataset.codeLength = String(config.length);
      root.dataset.duplicates = String(config.allowDuplicates);
      attemptsUsed.textContent = interpolate(copy.attemptsValue, {
        total: config.attempts,
        used,
      });
      remaining.textContent = String(Math.max(0, config.attempts - used));
      const complete = state.phase !== "playing";
      input.disabled = complete;
      submitButton.disabled = complete;
      revealButton.disabled = complete;
      input.setAttribute("aria-invalid", "false");
      renderHistory();
      if (moveFocus && !complete) input.focus();
      else if (moveFocus) newButton.focus();
    };

    const startNewGame = (message, closeSettings = false, moveFocus = true) => {
      try {
        state = createGameState(randomApi, config);
      } catch (_error) {
        disableGame(root, copy);
        return;
      }
      input.value = "";
      renderInputRules();
      renderState(moveFocus);
      status.textContent = message;
      settingsSummary.textContent = summaryText(config);
      if (closeSettings) settings.open = false;
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (state.phase !== "playing") return;
      const validation = validateGuess(input.value, config);
      if (!validation.valid) {
        input.setAttribute("aria-invalid", "true");
        status.textContent = interpolate(
          validation.code === "duplicates" ? copy.invalidDuplicates : copy.invalidDigits,
          { length: config.length },
        );
        input.focus();
        return;
      }

      state = submitGuess(state, input.value);
      const entry = state.history.at(-1);
      input.value = "";
      renderState(true);
      if (state.phase === "won") {
        status.textContent = interpolate(copy.won, {
          attempts: state.history.length,
          secret: state.secret,
        });
      } else if (state.phase === "lost") {
        status.textContent = interpolate(copy.lost, { secret: state.secret });
      } else {
        status.textContent = interpolate(copy.feedback, {
          exact: entry.exact,
          guess: entry.guess,
          misplaced: entry.misplaced,
          remaining: config.attempts - state.history.length,
        });
      }
    });

    input.addEventListener("input", () => {
      input.setAttribute("aria-invalid", "false");
    });

    settings.addEventListener("change", () => {
      settingsStatus.textContent = "";
      try {
        candidatesOutput.value = draftCandidateText(readDraftConfig());
      } catch (_error) {
        candidatesOutput.value = "";
      }
    });

    for (const presetButton of root.querySelectorAll("[data-code-preset]")) {
      presetButton.addEventListener("click", () => {
        setDraftConfig(PRESETS[presetButton.dataset.codePreset]);
        settingsStatus.textContent = copy.presetReady;
      });
    }

    resetButton.addEventListener("click", () => {
      setDraftConfig(DEFAULT_CONFIG);
      settingsStatus.textContent = copy.defaultsReady;
    });

    applyButton.addEventListener("click", () => {
      try {
        config = readDraftConfig();
      } catch (_error) {
        disableGame(root, copy);
        return;
      }
      setDraftConfig(config);
      settingsStatus.textContent = copy.applied;
      startNewGame(copy.applied, true);
    });

    newButton.addEventListener("click", () => startNewGame(copy.newGame));
    revealButton.addEventListener("click", () => {
      if (state.phase !== "playing") return;
      state = revealAnswer(state);
      renderState();
      status.textContent = interpolate(copy.revealed, { secret: state.secret });
      newButton.focus();
    });

    interactive.hidden = false;
    root.dataset.codebreakerReady = "true";
    setDraftConfig(config);
    startNewGame("", false, false);
  };

  const initializeAll = () => {
    for (const root of document.querySelectorAll("[data-toy-codebreaker]")) initialize(root);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAll, { once: true });
  } else {
    initializeAll();
  }
})();

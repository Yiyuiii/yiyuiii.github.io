(() => {
  "use strict";

  const globalScope = typeof window === "undefined" ? globalThis : window;
  const TARGET = 24;
  const POOL_KEYS = Object.freeze(["integer", "fraction", "all"]);
  const OPERATORS = Object.freeze(["+", "-", "*", "/"]);
  const SYMBOLS = Object.freeze({ "+": "+", "-": "−", "*": "×", "/": "÷" });
  let puzzlePoolsCache;

  const gcd = (left, right) => {
    let a = Math.abs(left);
    let b = Math.abs(right);
    while (b !== 0) [a, b] = [b, a % b];
    return a || 1;
  };

  const fraction = (numerator, denominator = 1) => {
    if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) {
      throw new RangeError("invalid fraction");
    }
    let nextNumerator = numerator;
    let nextDenominator = denominator;
    if (nextDenominator < 0) {
      nextNumerator *= -1;
      nextDenominator *= -1;
    }
    const divisor = gcd(nextNumerator, nextDenominator);
    return Object.freeze({
      denominator: nextDenominator / divisor,
      numerator: nextNumerator / divisor,
    });
  };

  const formatFraction = (value) => value.denominator === 1
    ? String(value.numerator)
    : `${value.numerator}/${value.denominator}`;

  const fractionKey = (value) => `${value.numerator}/${value.denominator}`;
  const stateKey = (values) => values.map(fractionKey).sort().join(",");
  const isTarget = (value) => value.numerator === TARGET * value.denominator;

  const applyOperation = (left, operator, right) => {
    switch (operator) {
      case "+":
        return fraction(
          left.numerator * right.denominator + right.numerator * left.denominator,
          left.denominator * right.denominator,
        );
      case "-":
        return fraction(
          left.numerator * right.denominator - right.numerator * left.denominator,
          left.denominator * right.denominator,
        );
      case "*":
        return fraction(
          left.numerator * right.numerator,
          left.denominator * right.denominator,
        );
      case "/":
        return right.numerator === 0
          ? null
          : fraction(
            left.numerator * right.denominator,
            left.denominator * right.numerator,
          );
      default:
        throw new RangeError("unknown operator");
    }
  };

  const candidateResults = (left, right) => [
    applyOperation(left, "+", right),
    applyOperation(left, "*", right),
    applyOperation(left, "-", right),
    applyOperation(right, "-", left),
    applyOperation(left, "/", right),
    applyOperation(right, "/", left),
  ];

  const hasSolution = (rawValues, options = {}, memo = new Map()) => {
    const values = rawValues.map((value) => typeof value === "number" ? fraction(value) : value);
    const positiveIntegerOnly = options.positiveIntegerOnly === true;
    const key = `${positiveIntegerOnly ? "integer:" : "exact:"}${stateKey(values)}`;
    if (memo.has(key)) return memo.get(key);
    if (values.length === 1) {
      const solved = isTarget(values[0]);
      memo.set(key, solved);
      return solved;
    }

    for (let leftIndex = 0; leftIndex < values.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < values.length; rightIndex += 1) {
        const rest = values.filter((_, index) => index !== leftIndex && index !== rightIndex);
        const seen = new Set();
        for (const result of candidateResults(values[leftIndex], values[rightIndex])) {
          if (!result) continue;
          const resultKey = fractionKey(result);
          if (seen.has(resultKey)) continue;
          seen.add(resultKey);
          if (positiveIntegerOnly && (result.denominator !== 1 || result.numerator <= 0)) continue;
          if (hasSolution([...rest, result], options, memo)) {
            memo.set(key, true);
            return true;
          }
        }
      }
    }
    memo.set(key, false);
    return false;
  };

  const numbersSignature = (numbers) => numbers.join(",");

  const buildPuzzlePools = () => {
    const all = [];
    const integer = [];
    const fractionRequired = [];
    const exactMemo = new Map();
    const integerMemo = new Map();
    for (let first = 1; first <= 10; first += 1) {
      for (let second = first; second <= 10; second += 1) {
        for (let third = second; third <= 10; third += 1) {
          for (let fourth = third; fourth <= 10; fourth += 1) {
            const numbers = Object.freeze([first, second, third, fourth]);
            if (!hasSolution(numbers, {}, exactMemo)) continue;
            all.push(numbers);
            if (hasSolution(numbers, { positiveIntegerOnly: true }, integerMemo)) integer.push(numbers);
            else fractionRequired.push(numbers);
          }
        }
      }
    }
    if (all.length !== 566 || integer.length !== 556 || fractionRequired.length !== 10) {
      throw new Error("unexpected make-24 pool");
    }
    return Object.freeze({
      all: Object.freeze(all),
      fraction: Object.freeze(fractionRequired),
      integer: Object.freeze(integer),
    });
  };

  const getPuzzlePools = () => {
    if (!puzzlePoolsCache) puzzlePoolsCache = buildPuzzlePools();
    return puzzlePoolsCache;
  };

  const poolFor = (pools, poolKey) => {
    if (!POOL_KEYS.includes(poolKey) || !Array.isArray(pools[poolKey])) {
      throw new RangeError("invalid puzzle pool");
    }
    return pools[poolKey];
  };

  const choosePuzzle = (randomApi, pool, currentSignature = "") => {
    if (!randomApi || typeof randomApi.uintBelow !== "function" || pool.length === 0) {
      throw new Error("random source unavailable");
    }
    const currentIndex = currentSignature
      ? pool.findIndex((numbers) => numbersSignature(numbers) === currentSignature)
      : -1;
    let index;
    if (currentIndex >= 0 && pool.length > 1) {
      const draw = randomApi.uintBelow(pool.length - 1);
      index = draw >= currentIndex ? draw + 1 : draw;
    } else {
      index = randomApi.uintBelow(pool.length);
    }
    if (!Number.isInteger(index) || index < 0 || index >= pool.length) {
      throw new RangeError("random source returned an invalid index");
    }
    return Object.freeze({
      index,
      numbers: pool[index],
      signature: numbersSignature(pool[index]),
    });
  };

  const createValue = (id, value) => Object.freeze({ id, value });
  const emptySelection = () => Object.freeze({ leftId: "", operator: "" });

  const createGameState = (numbers) => {
    if (!Array.isArray(numbers) || numbers.length !== 4 || numbers.some((value) => !Number.isInteger(value))) {
      throw new RangeError("invalid make-24 puzzle");
    }
    return Object.freeze({
      history: Object.freeze([]),
      nextId: 4,
      original: Object.freeze([...numbers]),
      phase: "playing",
      selection: emptySelection(),
      steps: Object.freeze([]),
      values: Object.freeze(numbers.map((value, index) => createValue(`value-${index}`, fraction(value)))),
    });
  };

  const replaceState = (state, changes) => Object.freeze({ ...state, ...changes });

  const selectOperator = (state, operator) => {
    if (state.phase !== "playing" || !state.selection.leftId || !OPERATORS.includes(operator)) {
      return Object.freeze({ event: "ignored", state });
    }
    const selection = Object.freeze({ leftId: state.selection.leftId, operator });
    return Object.freeze({ event: "operator", state: replaceState(state, { selection }) });
  };

  const selectValue = (state, valueId) => {
    if (state.phase !== "playing") return Object.freeze({ event: "ignored", state });
    const chosen = state.values.find((entry) => entry.id === valueId);
    if (!chosen) return Object.freeze({ event: "ignored", state });
    const { leftId, operator } = state.selection;

    if (!leftId) {
      return Object.freeze({
        event: "left",
        state: replaceState(state, {
          selection: Object.freeze({ leftId: valueId, operator: "" }),
        }),
      });
    }
    if (!operator) {
      return Object.freeze({
        event: valueId === leftId ? "cancel" : "left",
        state: replaceState(state, {
          selection: valueId === leftId
            ? emptySelection()
            : Object.freeze({ leftId: valueId, operator: "" }),
        }),
      });
    }
    if (valueId === leftId) {
      return Object.freeze({ event: "cancel", state: replaceState(state, { selection: emptySelection() }) });
    }

    const left = state.values.find((entry) => entry.id === leftId);
    const result = applyOperation(left.value, operator, chosen.value);
    if (!result) return Object.freeze({ event: "divideByZero", state });

    const equation = `${formatFraction(left.value)} ${SYMBOLS[operator]} ${formatFraction(chosen.value)} = ${formatFraction(result)}`;
    const snapshot = Object.freeze({
      nextId: state.nextId,
      steps: state.steps,
      values: state.values,
    });
    const values = Object.freeze([
      ...state.values.filter((entry) => entry.id !== leftId && entry.id !== valueId),
      createValue(`value-${state.nextId}`, result),
    ]);
    const steps = Object.freeze([...state.steps, equation]);
    let phase = "playing";
    if (values.length === 1) phase = isTarget(values[0].value) ? "won" : "stuck";
    const nextState = replaceState(state, {
      history: Object.freeze([...state.history, snapshot]),
      nextId: state.nextId + 1,
      phase,
      selection: emptySelection(),
      steps,
      values,
    });
    return Object.freeze({ equation, event: phase === "playing" ? "merged" : phase, state: nextState });
  };

  const undoMove = (state) => {
    if (state.history.length === 0) {
      return replaceState(state, { phase: "playing", selection: emptySelection() });
    }
    const snapshot = state.history[state.history.length - 1];
    return replaceState(state, {
      history: Object.freeze(state.history.slice(0, -1)),
      nextId: snapshot.nextId,
      phase: "playing",
      selection: emptySelection(),
      steps: snapshot.steps,
      values: snapshot.values,
    });
  };

  const resetGameState = (state) => createGameState(state.original);

  const logic = Object.freeze({
    OPERATORS,
    POOL_KEYS,
    applyOperation,
    buildPuzzlePools,
    choosePuzzle,
    createGameState,
    formatFraction,
    fraction,
    hasSolution,
    numbersSignature,
    resetGameState,
    selectOperator,
    selectValue,
    undoMove,
  });
  globalScope.yiyuiiiToyMake24Logic = logic;

  if (typeof document === "undefined") return;

  const interpolate = (template, values) => Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );

  const readCopy = (root) => {
    const node = root.querySelector("[data-make24-copy]");
    if (!node) throw new Error("missing make-24 copy");
    return JSON.parse(node.textContent || "null");
  };

  const disableGame = (root, copy) => {
    const interactive = root.querySelector("[data-make24-interactive]");
    const unavailable = root.querySelector("[data-make24-unavailable]");
    if (interactive) interactive.hidden = true;
    if (unavailable) {
      unavailable.textContent = copy?.unavailable || unavailable.textContent;
      unavailable.hidden = false;
    }
    root.dataset.state = "unavailable";
  };

  const activate = (root) => {
    if (root.dataset.make24Ready === "true" || root.dataset.state === "unavailable") return;
    let copy;
    try {
      copy = readCopy(root);
    } catch (_error) {
      disableGame(root, null);
      return;
    }

    const randomApi = globalScope.yiyuiiiToyRandom;
    const nodes = {
      apply: root.querySelector("[data-make24-settings-apply]"),
      count: root.querySelector("[data-make24-pool-count]"),
      interactive: root.querySelector("[data-make24-interactive]"),
      newPuzzle: root.querySelector("[data-make24-new]"),
      operators: root.querySelector("[data-make24-operators]"),
      pool: root.querySelector("[data-make24-pool]"),
      prompt: root.querySelector("[data-make24-prompt]"),
      reset: root.querySelector("[data-make24-reset]"),
      settings: root.querySelector("[data-make24-settings]"),
      settingsReset: root.querySelector("[data-make24-settings-reset]"),
      settingsStatus: root.querySelector("[data-make24-settings-status]"),
      steps: root.querySelector("[data-make24-steps]"),
      stepList: root.querySelector("[data-make24-step-list]"),
      status: root.querySelector("[data-make24-status]"),
      summary: root.querySelector("[data-make24-settings-summary]"),
      undo: root.querySelector("[data-make24-undo]"),
      values: root.querySelector("[data-make24-values]"),
    };
    if (!randomApi || typeof randomApi.uintBelow !== "function"
      || Object.values(nodes).some((node) => !node)) {
      disableGame(root, copy);
      return;
    }

    let pools;
    try {
      pools = getPuzzlePools();
    } catch (_error) {
      disableGame(root, copy);
      return;
    }

    const formatter = new Intl.NumberFormat(copy.locale, { maximumFractionDigits: 0 });
    const poolLabels = { all: copy.poolAll, fraction: copy.poolFraction, integer: copy.poolInteger };
    let activePool = "integer";
    let currentSignature = "";
    let state;

    const poolCountText = (poolKey) => interpolate(copy.poolCount, {
      count: formatter.format(poolFor(pools, poolKey).length),
    });

    const renderSettings = () => {
      const draftPool = POOL_KEYS.includes(nodes.pool.value) ? nodes.pool.value : activePool;
      nodes.count.value = poolCountText(draftPool);
      nodes.summary.textContent = interpolate(copy.settingsSummary, {
        count: formatter.format(poolFor(pools, activePool).length),
        pool: poolLabels[activePool],
      });
    };

    const render = () => {
      root.dataset.state = state.phase;
      const complete = state.phase !== "playing";
      const selectedLeft = state.values.find((entry) => entry.id === state.selection.leftId);
      const valuesFragment = document.createDocumentFragment();
      state.values.forEach((entry, index) => {
        const displayed = formatFraction(entry.value);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "toy-make-24__value";
        button.dataset.make24Value = entry.id;
        button.textContent = displayed;
        button.disabled = complete;
        button.setAttribute("aria-label", interpolate(copy.valueName, { index: index + 1, value: displayed }));
        button.setAttribute("aria-pressed", String(entry.id === state.selection.leftId));
        button.addEventListener("click", () => {
          const transition = selectValue(state, entry.id);
          state = transition.state;
          if (transition.event === "divideByZero") nodes.status.textContent = copy.dividedByZero;
          else if (transition.event === "merged") {
            nodes.status.textContent = interpolate(copy.merged, {
              equation: transition.equation,
              values: state.values.map((value) => formatFraction(value.value)).join(", "),
            });
          } else if (transition.event === "won") nodes.status.textContent = copy.won;
          else if (transition.event === "stuck") {
            nodes.status.textContent = interpolate(copy.stuck, {
              value: formatFraction(state.values[0].value),
            });
          }
          render();
        });
        valuesFragment.append(button);
      });
      nodes.values.replaceChildren(valuesFragment);

      for (const button of nodes.operators.querySelectorAll("[data-make24-operator]")) {
        const operator = button.dataset.make24Operator;
        button.disabled = complete || !selectedLeft;
        button.setAttribute("aria-pressed", String(operator === state.selection.operator));
      }
      if (!selectedLeft) nodes.prompt.textContent = copy.promptIdle;
      else if (!state.selection.operator) {
        nodes.prompt.textContent = interpolate(copy.promptOperator, {
          value: formatFraction(selectedLeft.value),
        });
      } else {
        nodes.prompt.textContent = interpolate(copy.promptRight, {
          operator: SYMBOLS[state.selection.operator],
          value: formatFraction(selectedLeft.value),
        });
      }

      const stepFragment = document.createDocumentFragment();
      for (const equation of state.steps) {
        const item = document.createElement("li");
        item.textContent = equation;
        stepFragment.append(item);
      }
      nodes.stepList.replaceChildren(stepFragment);
      nodes.steps.hidden = state.steps.length === 0;
      nodes.undo.disabled = state.history.length === 0 && !state.selection.leftId;
    };

    const startPuzzle = (message, poolKey = activePool, closeSettings = false) => {
      try {
        const selected = choosePuzzle(randomApi, poolFor(pools, poolKey), currentSignature);
        activePool = poolKey;
        currentSignature = selected.signature;
        state = createGameState(selected.numbers);
      } catch (_error) {
        disableGame(root, copy);
        return;
      }
      nodes.pool.value = activePool;
      renderSettings();
      render();
      nodes.status.textContent = message;
      if (closeSettings) nodes.settings.open = false;
    };

    for (const button of nodes.operators.querySelectorAll("[data-make24-operator]")) {
      button.addEventListener("click", () => {
        state = selectOperator(state, button.dataset.make24Operator).state;
        nodes.status.textContent = "";
        render();
      });
    }
    nodes.undo.addEventListener("click", () => {
      const completedSteps = state.history.length;
      state = undoMove(state);
      render();
      nodes.status.textContent = completedSteps > 0
        ? interpolate(copy.undone, { count: state.values.length })
        : copy.selectionCleared;
    });
    nodes.reset.addEventListener("click", () => {
      state = resetGameState(state);
      nodes.status.textContent = copy.reset;
      render();
    });
    nodes.newPuzzle.addEventListener("click", () => startPuzzle(copy.newGame));
    nodes.pool.addEventListener("change", () => {
      nodes.settingsStatus.textContent = "";
      renderSettings();
    });
    nodes.settingsReset.addEventListener("click", () => {
      nodes.pool.value = "integer";
      nodes.settingsStatus.textContent = copy.defaultsReady;
      renderSettings();
    });
    nodes.apply.addEventListener("click", () => {
      const draft = nodes.pool.value;
      if (!POOL_KEYS.includes(draft)) {
        disableGame(root, copy);
        return;
      }
      nodes.settingsStatus.textContent = copy.applied;
      startPuzzle(copy.applied, draft, true);
    });

    root.dataset.make24Ready = "true";
    nodes.interactive.hidden = false;
    startPuzzle("");
  };

  const initialize = (root) => {
    if (root.dataset.make24Bound === "true") return;
    root.dataset.make24Bound = "true";
    const disclosure = root.closest("details.toy-entry");
    const maybeActivate = () => {
      if (!disclosure || disclosure.open) activate(root);
    };
    if (disclosure && !disclosure.open) disclosure.addEventListener("toggle", maybeActivate);
    else maybeActivate();
  };

  const initializeAll = () => {
    for (const root of document.querySelectorAll("[data-toy-make-24]")) initialize(root);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAll, { once: true });
  } else {
    initializeAll();
  }
})();

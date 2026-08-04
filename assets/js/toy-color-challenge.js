(() => {
  "use strict";

  const globalScope = typeof window === "undefined" ? globalThis : window;
  const LEVEL_COUNT = 25;
  const LEVEL_MIN = 0;
  const LEVEL_MAX = LEVEL_COUNT - 1;
  const START_LEVEL = 8;
  const BLOCK_SIZE = 3;
  const HARD_DELTA = 0.0014;
  const MID_LIGHTNESS_MIN = 0.52;
  const MID_LIGHTNESS_MAX = 0.68;
  const RGB_MAX_DISTANCE = Math.sqrt(3 * (255 ** 2));

  const TARGETS = Object.freeze(Array.from(
    { length: LEVEL_COUNT },
    (_, level) => Math.pow(HARD_DELTA, level / LEVEL_MAX),
  ));

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

  const clampByte = (value) => Math.min(255, Math.max(0, Math.round(value)));

  const srgbByteToLinear = (value) => {
    const encoded = value / 255;
    return encoded <= 0.04045
      ? encoded / 12.92
      : ((encoded + 0.055) / 1.055) ** 2.4;
  };

  const linearToSrgbByte = (value) => {
    const encoded = value <= 0.0031308
      ? 12.92 * value
      : (1.055 * (value ** (1 / 2.4))) - 0.055;
    return clampByte(encoded * 255);
  };

  const rgb8ToOklab = (rgb) => {
    const [red, green, blue] = rgb.map(srgbByteToLinear);
    const l = (0.4122214708 * red) + (0.5363325363 * green) + (0.0514459929 * blue);
    const m = (0.2119034982 * red) + (0.6806995451 * green) + (0.1073969566 * blue);
    const s = (0.0883024619 * red) + (0.2817188376 * green) + (0.6299787005 * blue);
    const lRoot = Math.cbrt(l);
    const mRoot = Math.cbrt(m);
    const sRoot = Math.cbrt(s);
    return Object.freeze([
      (0.2104542553 * lRoot) + (0.793617785 * mRoot) - (0.0040720468 * sRoot),
      (1.9779984951 * lRoot) - (2.428592205 * mRoot) + (0.4505937099 * sRoot),
      (0.0259040371 * lRoot) + (0.7827717662 * mRoot) - (0.808675766 * sRoot),
    ]);
  };

  const oklabToRgb8 = ([lightness, a, b]) => {
    const lRoot = lightness + (0.3963377774 * a) + (0.2158037573 * b);
    const mRoot = lightness - (0.1055613458 * a) - (0.0638541728 * b);
    const sRoot = lightness - (0.0894841775 * a) - (1.291485548 * b);
    const l = lRoot ** 3;
    const m = mRoot ** 3;
    const s = sRoot ** 3;
    const red = (4.0767416621 * l) - (3.3077115913 * m) + (0.2309699292 * s);
    const green = (-1.2684380046 * l) + (2.6097574011 * m) - (0.3413193965 * s);
    const blue = (-0.0041960863 * l) - (0.7034186147 * m) + (1.707614701 * s);
    const epsilon = 1e-7;
    if ([red, green, blue].some((value) => value < -epsilon || value > 1 + epsilon)) {
      return null;
    }
    return Object.freeze([
      linearToSrgbByte(Math.min(1, Math.max(0, red))),
      linearToSrgbByte(Math.min(1, Math.max(0, green))),
      linearToSrgbByte(Math.min(1, Math.max(0, blue))),
    ]);
  };

  const oklabDistance = (left, right) => Math.sqrt(
    left.reduce((sum, value, index) => sum + ((value - right[index]) ** 2), 0),
  );

  const rgbDistance = (left, right) => oklabDistance(
    rgb8ToOklab(left),
    rgb8ToOklab(right),
  );

  const pairMidpointLightness = (left, right) => (
    (rgb8ToOklab(left)[0] + rgb8ToOklab(right)[0]) / 2
  );

  const pairUsesMidLightness = (left, right) => {
    const midpoint = pairMidpointLightness(left, right);
    return midpoint >= MID_LIGHTNESS_MIN && midpoint <= MID_LIGHTNESS_MAX;
  };

  const colorsDiffer = (left, right) => left.some((value, index) => value !== right[index]);

  const bandForLevel = (level) => {
    if (!Number.isSafeInteger(level) || level <= LEVEL_MIN || level >= LEVEL_MAX) {
      throw new RangeError("only intermediate levels have a perceptual band");
    }
    return Object.freeze({
      lower: Math.sqrt(TARGETS[level] * TARGETS[level + 1]),
      target: TARGETS[level],
      upper: Math.sqrt(TARGETS[level - 1] * TARGETS[level]),
    });
  };

  const pairMatchesLevel = (level, normalRgb, oddRgb) => {
    if (!colorsDiffer(normalRgb, oddRgb)) return false;
    if (level === LEVEL_MIN) {
      return normalRgb.every((value, index) => Math.abs(value - oddRgb[index]) === 255);
    }
    if (!pairUsesMidLightness(normalRgb, oddRgb)) return false;
    if (level === LEVEL_MAX) {
      const channelDifferences = normalRgb.map(
        (value, index) => Math.abs(value - oddRgb[index]),
      );
      return channelDifferences.filter(Boolean).length === 1
        && Math.max(...channelDifferences) === 1
        && rgbDistance(normalRgb, oddRgb) < Math.sqrt(
          TARGETS[LEVEL_MAX - 1] * TARGETS[LEVEL_MAX],
        );
    }
    const { lower, upper } = bandForLevel(level);
    const actual = rgbDistance(normalRgb, oddRgb);
    return actual >= lower && actual < upper;
  };

  const randomFraction = (randomApi) => randomApi.intInclusive(0, 1_000_000) / 1_000_000;

  const maybeSwap = (pair, randomApi) => (
    randomApi.pick([false, true])
      ? pair
      : Object.freeze({ normalRgb: pair.oddRgb, oddRgb: pair.normalRgb })
  );

  const createOklabPair = (level, randomApi) => {
    const { target } = bandForLevel(level);
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const margin = 0.004;
      const minimumMidpoint = Math.max(MID_LIGHTNESS_MIN, (target / 2) + margin);
      const maximumMidpoint = Math.min(
        MID_LIGHTNESS_MAX,
        1 - (target / 2) - margin,
      );
      if (minimumMidpoint > maximumMidpoint) return null;
      const midpoint = minimumMidpoint
        + ((maximumMidpoint - minimumMidpoint) * randomFraction(randomApi));
      const hue = randomApi.intInclusive(0, 359) * (Math.PI / 180);
      const requestedChroma = randomFraction(randomApi) * (
        target > 0.25 ? 0.025 : target > 0.1 ? 0.07 : 0.14
      );
      let chroma = requestedChroma;
      let normalRgb = null;
      let oddRgb = null;

      for (let gamutAttempt = 0; gamutAttempt < 18; gamutAttempt += 1) {
        const a = chroma * Math.cos(hue);
        const b = chroma * Math.sin(hue);
        normalRgb = oklabToRgb8([midpoint - (target / 2), a, b]);
        oddRgb = oklabToRgb8([midpoint + (target / 2), a, b]);
        if (normalRgb && oddRgb) break;
        chroma *= 0.72;
      }

      if (normalRgb && oddRgb && pairMatchesLevel(level, normalRgb, oddRgb)) {
        return maybeSwap(Object.freeze({ normalRgb, oddRgb }), randomApi);
      }
    }
    return null;
  };

  const createIntegerNeighbourPair = (level, randomApi) => {
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const normalRgb = Object.freeze([
        randomApi.intInclusive(32, 223),
        randomApi.intInclusive(32, 223),
        randomApi.intInclusive(32, 223),
      ]);
      const candidates = [];
      candidateSearch:
      for (let red = -6; red <= 6; red += 1) {
        for (let green = -6; green <= 6; green += 1) {
          for (let blue = -6; blue <= 6; blue += 1) {
            if (red === 0 && green === 0 && blue === 0) continue;
            const oddRgb = Object.freeze([
              normalRgb[0] + red,
              normalRgb[1] + green,
              normalRgb[2] + blue,
            ]);
            if (oddRgb.some((value) => value < 0 || value > 255)) continue;
            if (pairMatchesLevel(level, normalRgb, oddRgb)) candidates.push(oddRgb);
            if (candidates.length >= 64) break candidateSearch;
          }
        }
      }
      if (candidates.length > 0) {
        return maybeSwap(Object.freeze({
          normalRgb,
          oddRgb: randomApi.pick(candidates),
        }), randomApi);
      }
    }
    return null;
  };

  const fallbackCache = new Map();

  const verifiedFallback = (level) => {
    if (!Number.isSafeInteger(level) || level < LEVEL_MIN || level > LEVEL_MAX) {
      throw new RangeError("unexpected color level");
    }
    if (fallbackCache.has(level)) return fallbackCache.get(level);

    if (level === LEVEL_MIN) {
      const endpoint = Object.freeze({
        normalRgb: Object.freeze([0, 0, 0]),
        oddRgb: Object.freeze([255, 255, 255]),
      });
      fallbackCache.set(level, endpoint);
      return endpoint;
    }
    if (level === LEVEL_MAX) {
      const endpoint = Object.freeze({
        normalRgb: Object.freeze([128, 128, 128]),
        oddRgb: Object.freeze([129, 128, 128]),
      });
      fallbackCache.set(level, endpoint);
      return endpoint;
    }

    let result = null;
    fallbackSearch:
    for (let lower = 0; lower < 255; lower += 1) {
      for (let upper = lower + 1; upper <= 255; upper += 1) {
        const normalRgb = Object.freeze([lower, lower, lower]);
        const oddRgb = Object.freeze([upper, upper, upper]);
        if (pairMatchesLevel(level, normalRgb, oddRgb)) {
          result = Object.freeze({ normalRgb, oddRgb });
          break fallbackSearch;
        }
      }
    }

    if (!result) {
      fallbackSearch:
      for (let value = 80; value <= 192; value += 1) {
        const normalRgb = Object.freeze([value, value, value]);
        for (let red = -6; red <= 6; red += 1) {
          for (let green = -6; green <= 6; green += 1) {
            for (let blue = -6; blue <= 6; blue += 1) {
              if (red === 0 && green === 0 && blue === 0) continue;
              const oddRgb = Object.freeze([
                value + red,
                value + green,
                value + blue,
              ]);
              if (oddRgb.some((channel) => channel < 0 || channel > 255)) continue;
              if (pairMatchesLevel(level, normalRgb, oddRgb)) {
                result = Object.freeze({ normalRgb, oddRgb });
                break fallbackSearch;
              }
            }
          }
        }
      }
    }

    if (!result) throw new Error(`no verified fallback for color level ${level}`);
    fallbackCache.set(level, result);
    return result;
  };

  const createSingleCodePair = (randomApi) => {
    const value = randomApi.intInclusive(112, 152);
    const channel = randomApi.pick([0, 2]);
    const direction = randomApi.pick([-1, 1]);
    if (![0, 2].includes(channel) || ![-1, 1].includes(direction)) {
      throw new Error("unexpected endpoint random choice");
    }
    const normalRgb = Object.freeze([value, value, value]);
    const odd = [...normalRgb];
    odd[channel] += direction;
    const oddRgb = Object.freeze(odd);
    const pair = Object.freeze({ normalRgb, oddRgb });
    if (!pairMatchesLevel(LEVEL_MAX, normalRgb, oddRgb)) {
      return verifiedFallback(LEVEL_MAX);
    }
    return maybeSwap(pair, randomApi);
  };

  const rgbCss = (rgb) => `rgb(${rgb.join(" ")})`;

  const createColorRound = (randomApi, level) => {
    if (!hasRandomApi(randomApi)) throw new Error("local random interface is unavailable");
    if (!Number.isSafeInteger(level) || level < LEVEL_MIN || level > LEVEL_MAX) {
      throw new RangeError("unexpected color level");
    }
    let pair;
    if (level === LEVEL_MIN) {
      pair = maybeSwap(verifiedFallback(level), randomApi);
    } else if (level === LEVEL_MAX) {
      pair = createSingleCodePair(randomApi);
    } else if (level <= 19) {
      pair = createOklabPair(level, randomApi) || verifiedFallback(level);
    } else {
      pair = createIntegerNeighbourPair(level, randomApi) || verifiedFallback(level);
    }

    const oddIndex = randomApi.uintBelow(16);
    if (!Number.isSafeInteger(oddIndex) || oddIndex < 0 || oddIndex >= 16) {
      throw new Error("unexpected random index");
    }
    const actualDelta = rgbDistance(pair.normalRgb, pair.oddRgb);
    return Object.freeze({
      actualDelta,
      level,
      normalColor: rgbCss(pair.normalRgb),
      normalRgb: pair.normalRgb,
      oddColor: rgbCss(pair.oddRgb),
      oddIndex,
      oddRgb: pair.oddRgb,
      targetDelta: TARGETS[level],
    });
  };

  const createInitialColorState = () => Object.freeze({
    bestStreak: 0,
    blockAnswered: 0,
    blockScore: 0,
    currentStreak: 0,
    extremeClears: 0,
    foundationRetries: 0,
    hasCleared: false,
    highestLevel: START_LEVEL,
    lastSettlement: null,
    level: START_LEVEL,
    phase: "ready",
    totalAnswered: 0,
    totalCorrect: 0,
    totalScore: 0,
    totalWrong: 0,
  });

  const answerColorState = (state, correct) => {
    if (!state || state.phase !== "ready" || typeof correct !== "boolean") return state;
    const point = correct ? 1 : -1;
    const answered = state.blockAnswered + 1;
    const blockScore = state.blockScore + point;
    const streak = correct ? state.currentStreak + 1 : 0;
    let level = state.level;
    let extremeClears = state.extremeClears;
    let foundationRetries = state.foundationRetries;
    let hasCleared = state.hasCleared;
    let lastSettlement = null;
    let nextBlockAnswered = answered;
    let nextBlockScore = blockScore;

    if (answered === BLOCK_SIZE) {
      const previousLevel = level;
      const direction = blockScore > 0 ? 1 : -1;
      const attemptedLevel = level + direction;
      let kind = direction > 0 ? "up" : "down";
      let clearedNow = false;

      if (attemptedLevel > LEVEL_MAX) {
        level = LEVEL_MAX;
        extremeClears += 1;
        clearedNow = !hasCleared;
        hasCleared = true;
        kind = "extreme";
      } else if (attemptedLevel < LEVEL_MIN) {
        level = LEVEL_MIN;
        foundationRetries += 1;
        kind = "foundation";
      } else {
        level = attemptedLevel;
      }

      lastSettlement = Object.freeze({
        blockScore,
        clearedNow,
        kind,
        nextLevel: level,
        previousLevel,
      });
      nextBlockAnswered = 0;
      nextBlockScore = 0;
    }

    return Object.freeze({
      ...state,
      blockAnswered: nextBlockAnswered,
      blockScore: nextBlockScore,
      currentStreak: streak,
      extremeClears,
      foundationRetries,
      hasCleared,
      highestLevel: Math.max(state.highestLevel, level),
      lastSettlement,
      level,
      phase: "answered",
      totalAnswered: state.totalAnswered + 1,
      totalCorrect: state.totalCorrect + (correct ? 1 : 0),
      totalScore: state.totalScore + point,
      totalWrong: state.totalWrong + (correct ? 0 : 1),
      bestStreak: Math.max(state.bestStreak || 0, streak),
    });
  };

  const nextColorState = (state) => {
    if (!state || state.phase !== "answered") return state;
    return Object.freeze({ ...state, lastSettlement: null, phase: "ready" });
  };

  const logic = Object.freeze({
    BLOCK_SIZE,
    LEVEL_COUNT,
    LEVEL_MAX,
    LEVEL_MIN,
    MID_LIGHTNESS_MAX,
    MID_LIGHTNESS_MIN,
    RGB_MAX_DISTANCE,
    START_LEVEL,
    TARGETS,
    answerColorState,
    bandForLevel,
    createColorRound,
    createInitialColorState,
    hasRandomApi,
    nextColorState,
    oklabToRgb8,
    pairMidpointLightness,
    pairMatchesLevel,
    rgb8ToOklab,
    rgbDistance,
    verifiedFallback,
  });
  globalScope.yiyuiiiToyColorChallengeLogic = logic;

  if (typeof document === "undefined") return;

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

  const zoneIndex = (level) => {
    if (level === LEVEL_MIN) return 0;
    if (level <= 7) return 1;
    if (level <= 19) return 2;
    if (level <= 23) return 3;
    return 4;
  };

  const signed = (value) => (value > 0 ? `+${value}` : String(value));

  const initialize = (root) => {
    if (root.dataset.colorChallengeReady === "true") return;
    let copy;
    try {
      copy = readCopy(root);
    } catch (error) {
      disableChallenge(root, null);
      return;
    }
    const randomApi = globalScope.yiyuiiiToyRandom;
    const interactive = root.querySelector("[data-challenge-interactive]");
    const grid = root.querySelector("[data-color-grid]");
    const nextButton = root.querySelector("[data-color-next]");
    const status = root.querySelector("[data-challenge-status]");
    if (!hasRandomApi(randomApi) || !interactive || !grid || !nextButton || !status) {
      disableChallenge(root, copy);
      return;
    }

    const outputs = Object.fromEntries([
      "score", "level", "block", "difference", "answered", "record", "streak",
      "highest", "extreme", "foundation",
    ].map((name) => [name, root.querySelector(`[data-color-${name}]`)]));
    if (Object.values(outputs).some((node) => !node)) {
      disableChallenge(root, copy);
      return;
    }

    let state = createInitialColorState();
    let activeRound = null;

    const differenceText = () => {
      if (!activeRound) return copy.notAvailable;
      if (activeRound.level === LEVEL_MIN) {
        return interpolate(copy.maximumDifference, {
          distance: RGB_MAX_DISTANCE.toFixed(2),
        });
      }
      if (activeRound.level === LEVEL_MAX) {
        const changes = activeRound.normalRgb.map(
          (value, index) => activeRound.oddRgb[index] - value,
        );
        const channel = changes.findIndex((value) => value !== 0);
        return interpolate(copy.singleCodeDifference, {
          channel: copy.channels[channel],
          code: signed(changes[channel]),
          delta: activeRound.actualDelta.toFixed(5),
        });
      }
      return interpolate(copy.perceptualDifference, {
        delta: activeRound.actualDelta.toFixed(5),
      });
    };

    const renderStats = () => {
      const accuracy = state.totalAnswered === 0
        ? copy.notAvailable
        : `${((state.totalCorrect / state.totalAnswered) * 100).toFixed(1)}%`;
      outputs.score.textContent = String(state.totalScore);
      outputs.level.textContent = interpolate(copy.levelValue, {
        count: LEVEL_COUNT,
        level: state.level + 1,
        zone: copy.zones[zoneIndex(state.level)],
      });
      outputs.block.textContent = state.lastSettlement
        ? interpolate(copy.blockSettledValue, {
          score: signed(state.lastSettlement.blockScore),
        })
        : interpolate(copy.blockValue, {
          answered: state.blockAnswered,
          score: signed(state.blockScore),
        });
      outputs.difference.textContent = differenceText();
      outputs.answered.textContent = String(state.totalAnswered);
      outputs.record.textContent = interpolate(copy.recordValue, {
        accuracy,
        correct: state.totalCorrect,
        wrong: state.totalWrong,
      });
      outputs.streak.textContent = interpolate(copy.streakValue, {
        best: state.bestStreak || 0,
        current: state.currentStreak,
      });
      outputs.highest.textContent = interpolate(copy.highestValue, {
        count: LEVEL_COUNT,
        level: state.highestLevel + 1,
      });
      outputs.extreme.textContent = String(state.extremeClears);
      outputs.foundation.textContent = String(state.foundationRetries);
    };

    const renderRound = (moveFocus = false) => {
      try {
        activeRound = createColorRound(randomApi, state.level);
      } catch (error) {
        disableChallenge(root, copy);
        return;
      }
      nextButton.disabled = true;
      status.textContent = "";
      root.dataset.difficulty = String(state.level);
      root.dataset.mode = state.level === LEVEL_MAX && state.hasCleared ? "endless" : "levels";
      root.dataset.state = "ready";

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
      renderStats();
      if (moveFocus) grid.querySelector("button")?.focus();
    };

    grid.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-color-index]");
      if (!button || state.phase !== "ready" || !activeRound) return;
      const selectedIndex = Number.parseInt(button.dataset.colorIndex || "", 10);
      const correct = selectedIndex === activeRound.oddIndex;
      state = answerColorState(state, correct);

      for (const choice of grid.querySelectorAll("button")) choice.disabled = true;
      const answer = grid.querySelector(`[data-color-index="${activeRound.oddIndex}"]`);
      if (answer) {
        answer.dataset.result = "correct";
        answer.textContent = "✓";
        answer.setAttribute("aria-label", interpolate(copy.correctCellLabel, {
          number: activeRound.oddIndex + 1,
        }));
      }
      if (!correct) {
        button.dataset.result = "incorrect";
        button.textContent = "×";
      }

      let result = interpolate(correct ? copy.correct : copy.incorrect, {
        answer: activeRound.oddIndex + 1,
        score: state.totalScore,
      });
      const settlement = state.lastSettlement;
      if (settlement) {
        if (settlement.kind === "extreme") {
          result += ` ${interpolate(
            settlement.clearedNow ? copy.cleared : copy.extremeContinues,
            { count: state.extremeClears },
          )}`;
        } else if (settlement.kind === "foundation") {
          result += ` ${copy.foundationContinues}`;
        } else {
          result += ` ${interpolate(
            settlement.kind === "up" ? copy.levelUp : copy.levelDown,
            { count: LEVEL_COUNT, level: settlement.nextLevel + 1 },
          )}`;
        }
      }
      status.textContent = result;
      root.dataset.state = "answered";
      renderStats();
      nextButton.disabled = false;
      nextButton.focus();
    });

    nextButton.addEventListener("click", () => {
      state = nextColorState(state);
      renderRound(true);
    });
    interactive.hidden = false;
    root.dataset.colorChallengeReady = "true";
    renderRound();
  };

  const initializeAll = () => {
    for (const root of document.querySelectorAll("[data-toy-color-challenge]")) initialize(root);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAll, { once: true });
  } else {
    initializeAll();
  }
})();

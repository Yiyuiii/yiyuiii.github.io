(() => {
  "use strict";

  const globalScope = typeof window === "undefined" ? globalThis : window;
  const LEVEL_COUNT = 25;
  const LEVEL_MIN = 0;
  const LEVEL_MAX = LEVEL_COUNT - 1;
  const START_LEVEL = 8;
  const BLOCK_SIZE = 3;
  const MID_LIGHTNESS_MIN = 0.52;
  const MID_LIGHTNESS_MAX = 0.68;
  const VARIATIONS = Object.freeze(["lightness", "chroma", "hue"]);
  const HUE_SECTORS = Object.freeze([0, 1, 2, 3, 4, 5]);
  const CURVE_ENDPOINTS = Object.freeze({
    lightness: Object.freeze({ easy: 0.28, hard: 0.004 }),
    chroma: Object.freeze({ easy: 0.07, hard: 0.0045 }),
    hue: Object.freeze({ easy: 0.06, hard: 0.005 }),
  });
  const TARGETS = Object.freeze(Object.fromEntries(VARIATIONS.map((variation) => {
    const { easy, hard } = CURVE_ENDPOINTS[variation];
    return [variation, Object.freeze(Array.from(
      { length: LEVEL_COUNT },
      (_, level) => easy * ((hard / easy) ** (level / LEVEL_MAX)),
    ))];
  })));
  const DEFAULT_CONFIG = Object.freeze({
    fixedLevel: START_LEVEL,
    hueSectors: HUE_SECTORS,
    includeNeutral: true,
    progression: "auto",
    variations: VARIATIONS,
  });
  const MAX_GENERATION_ATTEMPTS = 96;
  const CHROMATIC_CHROMA_MIN = 0.018;
  const NEUTRAL_CHROMA_MAX = 0.012;

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
  const degreesToRadians = (degrees) => degrees * (Math.PI / 180);
  const radiansToDegrees = (radians) => radians * (180 / Math.PI);
  const normalizeHue = (degrees) => ((degrees % 360) + 360) % 360;

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

  const oklabToLinearRgb = ([lightness, a, b]) => {
    const lRoot = lightness + (0.3963377774 * a) + (0.2158037573 * b);
    const mRoot = lightness - (0.1055613458 * a) - (0.0638541728 * b);
    const sRoot = lightness - (0.0894841775 * a) - (1.291485548 * b);
    const l = lRoot ** 3;
    const m = mRoot ** 3;
    const s = sRoot ** 3;
    return Object.freeze([
      (4.0767416621 * l) - (3.3077115913 * m) + (0.2309699292 * s),
      (-1.2684380046 * l) + (2.6097574011 * m) - (0.3413193965 * s),
      (-0.0041960863 * l) - (0.7034186147 * m) + (1.707614701 * s),
    ]);
  };

  const oklabToRgb8 = (lab) => {
    const linear = oklabToLinearRgb(lab);
    const epsilon = 1e-7;
    if (linear.some((value) => value < -epsilon || value > 1 + epsilon)) return null;
    return Object.freeze(linear.map((value) => (
      linearToSrgbByte(Math.min(1, Math.max(0, value)))
    )));
  };

  const oklchToOklab = ([lightness, chroma, hue]) => Object.freeze([
    lightness,
    chroma * Math.cos(degreesToRadians(hue)),
    chroma * Math.sin(degreesToRadians(hue)),
  ]);

  const oklabToOklch = ([lightness, a, b]) => Object.freeze([
    lightness,
    Math.sqrt((a ** 2) + (b ** 2)),
    normalizeHue(radiansToDegrees(Math.atan2(b, a))),
  ]);

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

  const angularDistance = (left, right) => {
    const difference = Math.abs(normalizeHue(left) - normalizeHue(right));
    return Math.min(difference, 360 - difference);
  };

  const pairAnalysis = (left, right) => {
    const leftLab = rgb8ToOklab(left);
    const rightLab = rgb8ToOklab(right);
    const leftLch = oklabToOklch(leftLab);
    const rightLch = oklabToOklch(rightLab);
    const hueAngle = degreesToRadians(angularDistance(leftLch[2], rightLch[2]));
    const lightness = Math.abs(leftLch[0] - rightLch[0]);
    const chroma = Math.abs(leftLch[1] - rightLch[1]);
    const hue = 2 * Math.sqrt(leftLch[1] * rightLch[1]) * Math.sin(hueAngle / 2);
    const total = oklabDistance(leftLab, rightLab);
    return Object.freeze({
      chroma,
      hue,
      leftLch,
      lightness,
      rightLch,
      total,
    });
  };

  const maxChromaFor = (lightness, hue) => {
    let lower = 0;
    let upper = 0.4;
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const middle = (lower + upper) / 2;
      if (oklabToRgb8(oklchToOklab([lightness, middle, hue]))) lower = middle;
      else upper = middle;
    }
    return lower;
  };

  const bandForLevel = (variation, level) => {
    if (!VARIATIONS.includes(variation)) throw new RangeError("unexpected color variation");
    if (!Number.isSafeInteger(level) || level < LEVEL_MIN || level > LEVEL_MAX) {
      throw new RangeError("unexpected color level");
    }
    const targets = TARGETS[variation];
    return Object.freeze({
      lower: targets[level] * (level === LEVEL_MAX ? 0.45 : 0.7),
      target: targets[level],
      upper: targets[level] * 1.35,
    });
  };

  const representativeHue = (analysis) => (
    analysis.leftLch[1] >= analysis.rightLch[1]
      ? analysis.leftLch[2]
      : analysis.rightLch[2]
  );

  const hueInSector = (hue, sector) => {
    if (!HUE_SECTORS.includes(sector)) return false;
    const normalized = normalizeHue(hue);
    const start = sector * 60;
    return normalized >= start && normalized < start + 60;
  };

  const directionThreshold = (level) => (level >= 20 ? 0.58 : 0.72);

  const pairMatchesLevel = (variation, level, normalRgb, oddRgb, options = {}) => {
    if (!colorsDiffer(normalRgb, oddRgb) || !pairUsesMidLightness(normalRgb, oddRgb)) {
      return false;
    }
    const analysis = pairAnalysis(normalRgb, oddRgb);
    const { lower, upper } = bandForLevel(variation, level);
    if (analysis.total < lower || analysis.total >= upper) return false;
    if ((analysis[variation] / analysis.total) < directionThreshold(level)) return false;
    if (options.neutral) {
      if (variation !== "lightness") return false;
      if (Math.max(analysis.leftLch[1], analysis.rightLch[1]) > NEUTRAL_CHROMA_MAX) {
        return false;
      }
    } else if (Math.max(analysis.leftLch[1], analysis.rightLch[1]) < CHROMATIC_CHROMA_MIN) {
      return false;
    }
    if (!options.neutral && Number.isSafeInteger(options.hueSector)) {
      const hue = variation === "hue" ? analysis.leftLch[2] : representativeHue(analysis);
      if (!hueInSector(hue, options.hueSector)) return false;
    }
    return true;
  };

  const randomFraction = (randomApi) => randomApi.intInclusive(0, 1_000_000) / 1_000_000;
  const randomRange = (randomApi, minimum, maximum) => (
    minimum + ((maximum - minimum) * randomFraction(randomApi))
  );

  const maybeSwap = (pair, randomApi) => (
    randomApi.pick([false, true])
      ? pair
      : Object.freeze({ normalRgb: pair.oddRgb, oddRgb: pair.normalRgb })
  );

  const buildCandidate = (variation, target, parameters) => {
    const { chromaFraction, direction, hue, lightness, neutral } = parameters;
    let normalLab;
    let oddLab;

    if (variation === "lightness") {
      const lowerLightness = lightness - (target / 2);
      const upperLightness = lightness + (target / 2);
      if (lowerLightness <= 0 || upperLightness >= 1) return null;
      const chroma = neutral ? 0 : chromaFraction * Math.min(
        maxChromaFor(lowerLightness, hue),
        maxChromaFor(upperLightness, hue),
      );
      normalLab = oklchToOklab([lowerLightness, chroma, hue]);
      oddLab = oklchToOklab([upperLightness, chroma, hue]);
    } else if (variation === "chroma") {
      const maximum = maxChromaFor(lightness, hue) * 0.96;
      const room = maximum - target;
      if (room <= 0.006) return null;
      const lowerChroma = 0.006 + ((room - 0.006) * chromaFraction);
      normalLab = oklchToOklab([lightness, lowerChroma, hue]);
      oddLab = oklchToOklab([lightness, lowerChroma + target, hue]);
    } else {
      let chroma = chromaFraction * maxChromaFor(lightness, hue);
      if (chroma <= target / 2) return null;
      let angle = radiansToDegrees(2 * Math.asin(Math.min(1, target / (2 * chroma))));
      if (angle > 78) return null;
      const oddHue = normalizeHue(hue + (direction * angle));
      chroma = chromaFraction * Math.min(
        maxChromaFor(lightness, hue),
        maxChromaFor(lightness, oddHue),
      );
      if (chroma <= target / 2) return null;
      angle = radiansToDegrees(2 * Math.asin(Math.min(1, target / (2 * chroma))));
      if (angle > 78) return null;
      normalLab = oklchToOklab([lightness, chroma, hue]);
      oddLab = oklchToOklab([
        lightness,
        chroma,
        normalizeHue(hue + (direction * angle)),
      ]);
    }

    const normalRgb = oklabToRgb8(normalLab);
    const oddRgb = oklabToRgb8(oddLab);
    return normalRgb && oddRgb ? Object.freeze({ normalRgb, oddRgb }) : null;
  };

  const randomHueForSector = (randomApi, sector) => (
    (sector * 60) + randomRange(randomApi, 2, 58)
  );

  const createTypedPair = (randomApi, variation, level, hueSector, neutral) => {
    const { target } = bandForLevel(variation, level);
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const parameters = {
        chromaFraction: variation === "hue"
          ? randomRange(randomApi, 0.62, 0.82)
          : randomRange(randomApi, 0.12, 0.62),
        direction: randomApi.pick([-1, 1]),
        hue: randomHueForSector(randomApi, hueSector),
        lightness: randomRange(randomApi, MID_LIGHTNESS_MIN, MID_LIGHTNESS_MAX),
        neutral,
      };
      let pair = buildCandidate(variation, target, parameters);
      if (!pair) continue;
      if (variation !== "hue") pair = maybeSwap(pair, randomApi);
      if (pairMatchesLevel(variation, level, pair.normalRgb, pair.oddRgb, {
        hueSector,
        neutral,
      })) return pair;
    }
    return null;
  };

  const fallbackCache = new Map();

  const verifiedFallback = (variation, level, hueSector = 0, neutral = false) => {
    if (!VARIATIONS.includes(variation) || !HUE_SECTORS.includes(hueSector)) {
      throw new RangeError("unexpected fallback configuration");
    }
    if (!Number.isSafeInteger(level) || level < LEVEL_MIN || level > LEVEL_MAX) {
      throw new RangeError("unexpected color level");
    }
    if (neutral && variation !== "lightness") {
      throw new RangeError("neutral is available only for lightness rounds");
    }
    const cacheKey = `${variation}:${level}:${hueSector}:${neutral}`;
    if (fallbackCache.has(cacheKey)) return fallbackCache.get(cacheKey);
    const { target } = bandForLevel(variation, level);
    const lightnesses = [0.6, 0.56, 0.64, 0.53, 0.67];
    const hueOffsets = [30, 18, 42, 8, 52, 25, 35];
    const chromaFractions = variation === "hue"
      ? [0.72, 0.8, 0.64, 0.76]
      : [0.22, 0.38, 0.54, 0.14];
    for (const lightness of lightnesses) {
      for (const offset of hueOffsets) {
        for (const chromaFraction of chromaFractions) {
          for (const direction of [-1, 1]) {
            const pair = buildCandidate(variation, target, {
              chromaFraction,
              direction,
              hue: (hueSector * 60) + offset,
              lightness,
              neutral,
            });
            if (pair && pairMatchesLevel(variation, level, pair.normalRgb, pair.oddRgb, {
              hueSector,
              neutral,
            })) {
              fallbackCache.set(cacheKey, pair);
              return pair;
            }
          }
        }
      }
    }
    throw new Error(`no verified fallback for ${cacheKey}`);
  };

  const normalizeConfig = (input = DEFAULT_CONFIG) => {
    const variations = [...new Set(input.variations || [])]
      .filter((value) => VARIATIONS.includes(value));
    const hueSectors = [...new Set(input.hueSectors || [])]
      .filter((value) => HUE_SECTORS.includes(value))
      .sort((left, right) => left - right);
    const progression = input.progression === "fixed" ? "fixed" : "auto";
    const fixedLevel = Number.isSafeInteger(input.fixedLevel)
      ? Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, input.fixedLevel))
      : START_LEVEL;
    if (variations.length === 0) throw new RangeError("select at least one variation");
    if (hueSectors.length === 0) throw new RangeError("select at least one hue sector");
    return Object.freeze({
      fixedLevel,
      hueSectors: Object.freeze(hueSectors),
      includeNeutral: Boolean(input.includeNeutral) && variations.includes("lightness"),
      progression,
      variations: Object.freeze(variations),
    });
  };

  const shuffleEntries = (randomApi, entries) => {
    const shuffled = [...entries];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const selected = randomApi.uintBelow(index + 1);
      [shuffled[index], shuffled[selected]] = [shuffled[selected], shuffled[index]];
    }
    return shuffled;
  };

  const createShuffleBag = (randomApi, entries) => {
    if (!hasRandomApi(randomApi) || !Array.isArray(entries) || entries.length === 0) {
      throw new Error("cannot create an empty shuffle bag");
    }
    let bag = [];
    let last = null;
    return Object.freeze({
      next() {
        if (bag.length === 0) {
          bag = shuffleEntries(randomApi, entries);
          if (bag.length > 1 && bag[bag.length - 1] === last) {
            [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
          }
        }
        last = bag.pop();
        return last;
      },
    });
  };

  const createRoundScheduler = (randomApi, rawConfig = DEFAULT_CONFIG) => {
    const config = normalizeConfig(rawConfig);
    const variationBag = createShuffleBag(randomApi, config.variations);
    const hueBags = new Map(config.variations.map((variation) => [
      variation,
      createShuffleBag(randomApi, config.hueSectors),
    ]));
    const neutralBag = config.includeNeutral
      ? createShuffleBag(randomApi, [true, false, false, false, false, false, false])
      : null;
    return Object.freeze({
      next() {
        const variation = variationBag.next();
        const neutral = variation === "lightness" && neutralBag?.next() === true;
        return Object.freeze({
          hueSector: neutral ? config.hueSectors[0] : hueBags.get(variation).next(),
          neutral,
          variation,
        });
      },
    });
  };

  const rgbCss = (rgb) => `rgb(${rgb.join(" ")})`;

  const createColorRound = (randomApi, level, selection = {}) => {
    if (!hasRandomApi(randomApi)) throw new Error("local random interface is unavailable");
    if (!Number.isSafeInteger(level) || level < LEVEL_MIN || level > LEVEL_MAX) {
      throw new RangeError("unexpected color level");
    }
    const variation = VARIATIONS.includes(selection.variation)
      ? selection.variation
      : "lightness";
    const hueSector = HUE_SECTORS.includes(selection.hueSector)
      ? selection.hueSector
      : 0;
    const neutral = Boolean(selection.neutral) && variation === "lightness";
    const pair = createTypedPair(randomApi, variation, level, hueSector, neutral)
      || verifiedFallback(variation, level, hueSector, neutral);
    const oddIndex = randomApi.uintBelow(16);
    if (!Number.isSafeInteger(oddIndex) || oddIndex < 0 || oddIndex >= 16) {
      throw new Error("unexpected random index");
    }
    return Object.freeze({
      actualDelta: rgbDistance(pair.normalRgb, pair.oddRgb),
      hueSector,
      level,
      neutral,
      normalColor: rgbCss(pair.normalRgb),
      normalRgb: pair.normalRgb,
      oddColor: rgbCss(pair.oddRgb),
      oddIndex,
      oddRgb: pair.oddRgb,
      targetDelta: TARGETS[variation][level],
      variation,
    });
  };

  const createInitialColorState = (rawConfig = DEFAULT_CONFIG) => {
    const config = normalizeConfig(rawConfig);
    const level = config.progression === "fixed" ? config.fixedLevel : START_LEVEL;
    return Object.freeze({
      bestStreak: 0,
      blockAnswered: 0,
      blockScore: 0,
      currentStreak: 0,
      extremeClears: 0,
      foundationRetries: 0,
      hasCleared: false,
      highestLevel: level,
      lastSettlement: null,
      level,
      phase: "ready",
      progression: config.progression,
      totalAnswered: 0,
      totalCorrect: 0,
      totalScore: 0,
      totalWrong: 0,
    });
  };

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
      let kind = "fixed";
      let clearedNow = false;
      if (state.progression === "auto") {
        const direction = blockScore > 0 ? 1 : -1;
        const attemptedLevel = level + direction;
        kind = direction > 0 ? "up" : "down";
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
      bestStreak: Math.max(state.bestStreak, streak),
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
    });
  };

  const nextColorState = (state) => {
    if (!state || state.phase !== "answered") return state;
    return Object.freeze({ ...state, lastSettlement: null, phase: "ready" });
  };

  const logic = Object.freeze({
    BLOCK_SIZE,
    CURVE_ENDPOINTS,
    DEFAULT_CONFIG,
    HUE_SECTORS,
    LEVEL_COUNT,
    LEVEL_MAX,
    LEVEL_MIN,
    MID_LIGHTNESS_MAX,
    MID_LIGHTNESS_MIN,
    START_LEVEL,
    TARGETS,
    VARIATIONS,
    answerColorState,
    bandForLevel,
    createColorRound,
    createInitialColorState,
    createRoundScheduler,
    createShuffleBag,
    hasRandomApi,
    hueInSector,
    maxChromaFor,
    nextColorState,
    normalizeConfig,
    oklabToOklch,
    oklabToRgb8,
    oklchToOklab,
    pairAnalysis,
    pairMatchesLevel,
    pairMidpointLightness,
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

  const zoneIndex = (level) => (level <= 4 ? 0 : level <= 19 ? 1 : 2);
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
    const settings = root.querySelector("[data-color-settings]");
    const settingsStatus = root.querySelector("[data-color-settings-status]");
    if (!hasRandomApi(randomApi) || !interactive || !grid || !nextButton || !status
      || !settings || !settingsStatus) {
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

    const summary = root.querySelector("[data-color-settings-summary]");
    const customHues = root.querySelector("[data-color-custom-hues]");
    const fixedWrap = root.querySelector("[data-color-fixed-wrap]");
    const fixedRange = root.querySelector("[data-color-fixed-level]");
    const fixedOutput = root.querySelector("[data-color-fixed-output]");
    const applyButton = root.querySelector("[data-color-apply]");
    const resetButton = root.querySelector("[data-color-reset]");
    if (!summary || !customHues || !fixedWrap || !fixedRange || !fixedOutput
      || !applyButton || !resetButton) {
      disableChallenge(root, copy);
      return;
    }

    let config = normalizeConfig(DEFAULT_CONFIG);
    let state = createInitialColorState(config);
    let scheduler = createRoundScheduler(randomApi, config);
    let activeRound = null;

    const checkedValues = (selector) => [...root.querySelectorAll(selector)]
      .filter((field) => field.checked)
      .map((field) => field.value);

    const setDraftConfig = (rawConfig) => {
      const draft = normalizeConfig(rawConfig);
      for (const field of root.querySelectorAll("[data-color-variation]")) {
        field.checked = draft.variations.includes(field.value);
      }
      const allHues = draft.hueSectors.length === HUE_SECTORS.length;
      [...root.querySelectorAll("[data-color-hue-scope]")]
        .find((field) => field.value === (allHues ? "all" : "custom")).checked = true;
      for (const field of root.querySelectorAll("[data-color-hue-sector]")) {
        field.checked = draft.hueSectors.includes(Number.parseInt(field.value, 10));
      }
      root.querySelector("[data-color-neutral]").checked = draft.includeNeutral;
      [...root.querySelectorAll("[data-color-progression]")]
        .find((field) => field.value === draft.progression).checked = true;
      fixedRange.value = String(draft.fixedLevel + 1);
      fixedOutput.value = `${draft.fixedLevel + 1}/${LEVEL_COUNT}`;
      customHues.hidden = allHues;
      fixedWrap.hidden = draft.progression !== "fixed";
    };

    const readDraftConfig = () => {
      const scope = root.querySelector("[data-color-hue-scope]:checked")?.value;
      return normalizeConfig({
        fixedLevel: Number.parseInt(fixedRange.value, 10) - 1,
        hueSectors: scope === "all"
          ? HUE_SECTORS
          : checkedValues("[data-color-hue-sector]").map(Number),
        includeNeutral: root.querySelector("[data-color-neutral]").checked,
        progression: root.querySelector("[data-color-progression]:checked")?.value,
        variations: checkedValues("[data-color-variation]"),
      });
    };

    const summaryText = (activeConfig) => {
      let variationText;
      if (activeConfig.variations.length === VARIATIONS.length) {
        variationText = copy.summaryComposite;
      } else if (activeConfig.variations.length === 1) {
        variationText = copy.variations[activeConfig.variations[0]];
      } else {
        variationText = interpolate(copy.summaryMixed, {
          count: activeConfig.variations.length,
        });
      }
      let hueText = activeConfig.hueSectors.length === HUE_SECTORS.length
        ? copy.summaryAllHues
        : interpolate(copy.summaryHueCount, { count: activeConfig.hueSectors.length });
      if (activeConfig.includeNeutral) hueText += copy.summaryNeutralSuffix;
      const progressionText = activeConfig.progression === "auto"
        ? copy.summaryAuto
        : interpolate(copy.summaryFixed, { level: activeConfig.fixedLevel + 1 });
      return [variationText, hueText, progressionText].join(" · ");
    };

    const differenceText = () => activeRound
      ? interpolate(copy.perceptualDifference, {
        delta: activeRound.actualDelta.toFixed(5),
        variation: copy.variations[activeRound.variation],
      })
      : copy.notAvailable;

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
        ? interpolate(copy.blockSettledValue, { score: signed(state.lastSettlement.blockScore) })
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
      outputs.extreme.textContent = state.progression === "auto"
        ? String(state.extremeClears)
        : copy.notAvailable;
      outputs.foundation.textContent = state.progression === "auto"
        ? String(state.foundationRetries)
        : copy.notAvailable;
    };

    const renderRound = (moveFocus = false) => {
      try {
        const selection = scheduler.next();
        activeRound = createColorRound(randomApi, state.level, selection);
      } catch (error) {
        disableChallenge(root, copy);
        return;
      }
      nextButton.disabled = true;
      status.textContent = "";
      root.dataset.difficulty = String(state.level);
      root.dataset.mode = config.progression;
      root.dataset.state = "ready";
      root.dataset.variation = activeRound.variation;

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
        answer.setAttribute("aria-label", interpolate(copy.correctCellLabel, {
          number: activeRound.oddIndex + 1,
        }));
      }
      if (!correct) {
        button.dataset.result = "incorrect";
        button.setAttribute("aria-label", interpolate(copy.incorrectCellLabel, {
          number: selectedIndex + 1,
        }));
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
        } else if (settlement.kind === "fixed") {
          result += ` ${interpolate(copy.fixedContinues, {
            level: state.level + 1,
            score: signed(settlement.blockScore),
          })}`;
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

    settings.addEventListener("change", (event) => {
      if (event.target.matches("[data-color-hue-scope]")) {
        customHues.hidden = event.target.value === "all";
      }
      if (event.target.matches("[data-color-progression]")) {
        fixedWrap.hidden = event.target.value !== "fixed";
      }
      settingsStatus.textContent = "";
    });

    fixedRange.addEventListener("input", () => {
      fixedOutput.value = `${fixedRange.value}/${LEVEL_COUNT}`;
      settingsStatus.textContent = "";
    });

    for (const preset of root.querySelectorAll("[data-color-preset]")) {
      preset.addEventListener("click", () => {
        const name = preset.dataset.colorPreset;
        const variations = name === "all" ? VARIATIONS : [name];
        setDraftConfig({
          ...DEFAULT_CONFIG,
          includeNeutral: name === "all" || name === "lightness",
          variations,
        });
        settingsStatus.textContent = copy.presetReady;
      });
    }

    resetButton.addEventListener("click", () => {
      setDraftConfig(DEFAULT_CONFIG);
      settingsStatus.textContent = copy.defaultsReady;
    });

    applyButton.addEventListener("click", () => {
      let nextConfig;
      try {
        nextConfig = readDraftConfig();
      } catch (error) {
        settingsStatus.textContent = error.message.includes("variation")
          ? copy.variationRequired
          : copy.hueRequired;
        return;
      }
      config = nextConfig;
      state = createInitialColorState(config);
      scheduler = createRoundScheduler(randomApi, config);
      setDraftConfig(config);
      summary.textContent = summaryText(config);
      settings.open = false;
      settingsStatus.textContent = copy.applied;
      renderRound(true);
      status.textContent = copy.applied;
    });

    interactive.hidden = false;
    root.dataset.colorChallengeReady = "true";
    setDraftConfig(config);
    summary.textContent = summaryText(config);
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

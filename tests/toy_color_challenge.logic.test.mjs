import assert from "node:assert/strict";
import test from "node:test";

await import("../assets/js/toy-color-challenge.js");

const logic = globalThis.yiyuiiiToyColorChallengeLogic;

const makeRandom = (seed = 0x51f15e) => {
  let value = seed >>> 0;
  const next = () => {
    value = ((value * 1664525) + 1013904223) >>> 0;
    return value;
  };
  const uintBelow = (maximum) => {
    assert.ok(Number.isSafeInteger(maximum) && maximum > 0);
    return next() % maximum;
  };
  return {
    intInclusive(minimum, maximum) {
      return minimum + uintBelow((maximum - minimum) + 1);
    },
    pick(entries) {
      assert.ok(entries.length > 0);
      return entries[uintBelow(entries.length)];
    },
    uintBelow,
  };
};

const answerSequence = (initial, answers) => answers.reduce((state, answer, index) => {
  const answered = logic.answerColorState(state, answer);
  return index === answers.length - 1 ? answered : logic.nextColorState(answered);
}, initial);

test("each variation owns a distinct monotone 25-level perceptual curve", () => {
  assert.equal(logic.LEVEL_COUNT, 25);
  assert.equal(logic.START_LEVEL, 8);
  assert.equal(logic.MID_LIGHTNESS_MIN, 0.52);
  assert.equal(logic.MID_LIGHTNESS_MAX, 0.68);
  assert.deepEqual(logic.VARIATIONS, ["lightness", "chroma", "hue"]);
  assert.deepEqual(logic.HUE_SECTORS, [0, 1, 2, 3, 4, 5]);

  for (const variation of logic.VARIATIONS) {
    const targets = logic.TARGETS[variation];
    assert.equal(targets.length, logic.LEVEL_COUNT);
    assert.equal(targets[0], logic.CURVE_ENDPOINTS[variation].easy);
    assert.ok(Math.abs(targets.at(-1) - logic.CURVE_ENDPOINTS[variation].hard) < 1e-12);
    for (let level = 1; level < targets.length; level += 1) {
      assert.ok(targets[level] < targets[level - 1]);
    }
    for (let level = 0; level < targets.length; level += 1) {
      const band = logic.bandForLevel(variation, level);
      assert.ok(band.lower < band.target);
      assert.ok(band.target < band.upper);
    }
  }
  assert.notEqual(logic.TARGETS.lightness[0], logic.TARGETS.chroma[0]);
  assert.notEqual(logic.TARGETS.chroma[24], logic.TARGETS.hue[24]);
});

test("configuration validation keeps neutral gray independent from hue", () => {
  const defaults = logic.normalizeConfig();
  assert.deepEqual(defaults.variations, logic.VARIATIONS);
  assert.deepEqual(defaults.hueSectors, logic.HUE_SECTORS);
  assert.equal(defaults.includeNeutral, true);
  assert.equal(defaults.progression, "auto");

  const hueOnly = logic.normalizeConfig({
    fixedLevel: 99,
    hueSectors: [4, 4],
    includeNeutral: true,
    progression: "fixed",
    variations: ["hue"],
  });
  assert.deepEqual(hueOnly.hueSectors, [4]);
  assert.deepEqual(hueOnly.variations, ["hue"]);
  assert.equal(hueOnly.includeNeutral, false);
  assert.equal(hueOnly.fixedLevel, 24);
  assert.throws(() => logic.normalizeConfig({ hueSectors: [0], variations: [] }));
  assert.throws(() => logic.normalizeConfig({ hueSectors: [], variations: ["lightness"] }));
});

test("shuffle bags balance enabled changes and eligible color ranges", () => {
  const random = makeRandom(17);
  const scheduler = logic.createRoundScheduler(random, {
    fixedLevel: 8,
    hueSectors: [1, 4],
    includeNeutral: false,
    progression: "auto",
    variations: logic.VARIATIONS,
  });
  const firstSix = Array.from({ length: 6 }, () => scheduler.next());
  for (const variation of logic.VARIATIONS) {
    assert.equal(firstSix.filter((round) => round.variation === variation).length, 2);
  }

  const lightness = logic.createRoundScheduler(makeRandom(23), {
    fixedLevel: 8,
    hueSectors: [0, 3],
    includeNeutral: true,
    progression: "auto",
    variations: ["lightness"],
  });
  const firstSeven = Array.from({ length: 7 }, () => lightness.next());
  assert.equal(firstSeven.filter((round) => round.neutral).length, 1);
  assert.deepEqual(
    firstSeven.filter((round) => !round.neutral).map((round) => round.hueSector).sort(),
    [0, 0, 0, 3, 3, 3],
  );
});

test("all typed fallbacks survive final RGB quantization and their contracts", () => {
  for (const variation of logic.VARIATIONS) {
    for (const hueSector of logic.HUE_SECTORS) {
      for (let level = logic.LEVEL_MIN; level <= logic.LEVEL_MAX; level += 1) {
        const pair = logic.verifiedFallback(variation, level, hueSector, false);
        assert.equal(logic.pairMatchesLevel(
          variation,
          level,
          pair.normalRgb,
          pair.oddRgb,
          { hueSector, neutral: false },
        ), true, `${variation} sector ${hueSector} level ${level}`);
        for (const value of [...pair.normalRgb, ...pair.oddRgb]) {
          assert.ok(Number.isInteger(value) && value >= 0 && value <= 255);
        }
      }
    }
  }
  for (let level = logic.LEVEL_MIN; level <= logic.LEVEL_MAX; level += 1) {
    const pair = logic.verifiedFallback("lightness", level, 0, true);
    assert.equal(logic.pairMatchesLevel(
      "lightness",
      level,
      pair.normalRgb,
      pair.oddRgb,
      { hueSector: 0, neutral: true },
    ), true, `neutral level ${level}`);
  }
});

test("generated rounds cover every variation, sector, and level without clipping", () => {
  for (const variation of logic.VARIATIONS) {
    for (const hueSector of logic.HUE_SECTORS) {
      for (let level = logic.LEVEL_MIN; level <= logic.LEVEL_MAX; level += 1) {
        for (let sample = 0; sample < 6; sample += 1) {
          const round = logic.createColorRound(
            makeRandom((logic.VARIATIONS.indexOf(variation) * 1_000_000)
              + (hueSector * 10_000) + (level * 100) + sample + 1),
            level,
            { hueSector, neutral: false, variation },
          );
          assert.equal(round.variation, variation);
          assert.equal(round.hueSector, hueSector);
          assert.ok(round.oddIndex >= 0 && round.oddIndex < 16);
          assert.match(round.normalColor, /^rgb\(\d+ \d+ \d+\)$/);
          assert.match(round.oddColor, /^rgb\(\d+ \d+ \d+\)$/);
          assert.equal(logic.pairMatchesLevel(
            variation,
            level,
            round.normalRgb,
            round.oddRgb,
            { hueSector, neutral: false },
          ), true);
          const midpoint = logic.pairMidpointLightness(round.normalRgb, round.oddRgb);
          assert.ok(midpoint >= logic.MID_LIGHTNESS_MIN);
          assert.ok(midpoint <= logic.MID_LIGHTNESS_MAX);
          assert.ok(Math.abs(
            round.actualDelta - logic.rgbDistance(round.normalRgb, round.oddRgb),
          ) < 1e-12);
          const analysis = logic.pairAnalysis(round.normalRgb, round.oddRgb);
          assert.ok(analysis[variation] / analysis.total >= (level >= 20 ? 0.58 : 0.72));
        }
      }
    }
  }
});

test("neutral rounds stay gray and use only the lightness direction", () => {
  for (let level = 0; level < logic.LEVEL_COUNT; level += 1) {
    const round = logic.createColorRound(makeRandom(8000 + level), level, {
      hueSector: 5,
      neutral: true,
      variation: "lightness",
    });
    const analysis = logic.pairAnalysis(round.normalRgb, round.oddRgb);
    assert.ok(analysis.leftLch[1] <= 0.012);
    assert.ok(analysis.rightLch[1] <= 0.012);
    assert.ok(analysis.lightness / analysis.total >= (level >= 20 ? 0.58 : 0.72));
  }
});

test("a single question scores exactly once and total score may be negative", () => {
  const initial = logic.createInitialColorState();
  assert.equal(initial.level, 8);
  const wrong = logic.answerColorState(initial, false);
  assert.equal(wrong.totalScore, -1);
  assert.equal(wrong.totalWrong, 1);
  assert.equal(wrong.blockAnswered, 1);
  assert.strictEqual(logic.answerColorState(wrong, true), wrong);
  assert.strictEqual(logic.nextColorState(initial), initial);
});

test("automatic three-question settlement moves one level and keeps honest bounds", () => {
  const initial = logic.createInitialColorState();
  const promoted = answerSequence(initial, [true, false, true]);
  assert.equal(promoted.level, 9);
  assert.equal(promoted.totalScore, 1);
  assert.equal(promoted.blockAnswered, 0);
  assert.equal(promoted.lastSettlement.kind, "up");

  const foundation = Object.freeze({
    ...logic.createInitialColorState(),
    highestLevel: 0,
    level: 0,
  });
  const repeated = answerSequence(foundation, [false, false, true]);
  assert.equal(repeated.level, 0);
  assert.equal(repeated.foundationRetries, 1);
  assert.equal(repeated.lastSettlement.kind, "foundation");

  const top = Object.freeze({
    ...logic.createInitialColorState(),
    highestLevel: 24,
    level: 24,
  });
  const cleared = answerSequence(top, [true, true, false]);
  assert.equal(cleared.level, 24);
  assert.equal(cleared.extremeClears, 1);
  assert.equal(cleared.lastSettlement.kind, "extreme");
});

test("fixed difficulty settles sets without changing level or boundary counters", () => {
  const initial = logic.createInitialColorState({
    fixedLevel: 17,
    hueSectors: [2],
    includeNeutral: false,
    progression: "fixed",
    variations: ["chroma"],
  });
  assert.equal(initial.level, 17);
  const settled = answerSequence(initial, [true, true, false]);
  assert.equal(settled.level, 17);
  assert.equal(settled.totalScore, 1);
  assert.equal(settled.lastSettlement.kind, "fixed");
  assert.equal(settled.extremeClears, 0);
  assert.equal(settled.foundationRetries, 0);
});

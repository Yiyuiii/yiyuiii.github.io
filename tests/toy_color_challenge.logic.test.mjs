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

test("the difficulty curve has 25 monotone perceptual targets and starts at level 8", () => {
  assert.equal(logic.LEVEL_COUNT, 25);
  assert.equal(logic.LEVEL_MIN, 0);
  assert.equal(logic.LEVEL_MAX, 24);
  assert.equal(logic.START_LEVEL, 8);
  assert.equal(logic.TARGETS.length, 25);
  assert.ok(Math.abs(logic.TARGETS[0] - 1) < 1e-12);
  assert.ok(Math.abs(logic.TARGETS[24] - 0.0014) < 1e-12);
  for (let level = 1; level < logic.TARGETS.length; level += 1) {
    assert.ok(logic.TARGETS[level] < logic.TARGETS[level - 1]);
  }
  for (let level = 1; level < logic.LEVEL_MAX; level += 1) {
    const band = logic.bandForLevel(level);
    assert.ok(band.lower < band.target);
    assert.ok(band.target < band.upper);
    if (level > 1) {
      assert.ok(Math.abs(band.upper - logic.bandForLevel(level - 1).lower) < 1e-12);
    }
  }
});

test("every level has a verified integer RGB fallback inside its contract", () => {
  for (let level = logic.LEVEL_MIN; level <= logic.LEVEL_MAX; level += 1) {
    const pair = logic.verifiedFallback(level);
    assert.equal(logic.pairMatchesLevel(level, pair.normalRgb, pair.oddRgb), true, `level ${level}`);
    for (const value of [...pair.normalRgb, ...pair.oddRgb]) {
      assert.ok(Number.isInteger(value) && value >= 0 && value <= 255);
    }
  }
});

test("the easiest endpoint is exact black-white maximum digital distance", () => {
  const round = logic.createColorRound(makeRandom(1), logic.LEVEL_MIN);
  const colors = [round.normalRgb.join(","), round.oddRgb.join(",")].sort();
  assert.deepEqual(colors, ["0,0,0", "255,255,255"]);
  const codeDistance = Math.sqrt(round.normalRgb.reduce(
    (sum, value, index) => sum + ((value - round.oddRgb[index]) ** 2),
    0,
  ));
  assert.ok(Math.abs(codeDistance - logic.RGB_MAX_DISTANCE) < 1e-12);
  assert.ok(Math.abs(round.actualDelta - 1) < 1e-7);
});

test("the hardest endpoint is reproducibly one red or blue code apart", () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const round = logic.createColorRound(makeRandom(seed), logic.LEVEL_MAX);
    const differences = round.normalRgb.map(
      (value, index) => Math.abs(value - round.oddRgb[index]),
    );
    const changed = differences.flatMap((difference, index) => (difference ? [index] : []));
    assert.equal(changed.length, 1);
    assert.ok(changed[0] === 0 || changed[0] === 2);
    assert.equal(differences[changed[0]], 1);
    assert.equal(logic.pairMatchesLevel(
      logic.LEVEL_MAX,
      round.normalRgb,
      round.oddRgb,
    ), true);
  }
});

test("generated intermediate rounds are quantized and remain within their perceptual bands", () => {
  for (let level = 1; level < logic.LEVEL_MAX; level += 1) {
    for (let sample = 0; sample < 12; sample += 1) {
      const round = logic.createColorRound(makeRandom((level * 1000) + sample), level);
      assert.equal(round.level, level);
      assert.ok(round.oddIndex >= 0 && round.oddIndex < 16);
      assert.match(round.normalColor, /^rgb\(\d+ \d+ \d+\)$/);
      assert.match(round.oddColor, /^rgb\(\d+ \d+ \d+\)$/);
      assert.equal(logic.pairMatchesLevel(level, round.normalRgb, round.oddRgb), true);
      assert.ok(Math.abs(
        round.actualDelta - logic.rgbDistance(round.normalRgb, round.oddRgb),
      ) < 1e-12);
    }
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

  const secondWrong = logic.answerColorState(logic.nextColorState(wrong), false);
  assert.equal(secondWrong.totalScore, -2);
});

test("three-question majority moves one level and resets only the block counters", () => {
  const initial = logic.createInitialColorState();
  const promoted = answerSequence(initial, [true, false, true]);
  assert.equal(promoted.level, 9);
  assert.equal(promoted.totalScore, 1);
  assert.equal(promoted.blockAnswered, 0);
  assert.equal(promoted.blockScore, 0);
  assert.deepEqual(promoted.lastSettlement, {
    blockScore: 1,
    clearedNow: false,
    kind: "up",
    nextLevel: 9,
    previousLevel: 8,
  });

  const demoted = answerSequence(
    Object.freeze({ ...logic.createInitialColorState(), highestLevel: 8, level: 8 }),
    [false, true, false],
  );
  assert.equal(demoted.level, 7);
  assert.equal(demoted.totalScore, -1);
  assert.equal(demoted.lastSettlement.kind, "down");
});

test("foundation and single-code boundaries remain honest and recoverable", () => {
  const foundation = Object.freeze({
    ...logic.createInitialColorState(),
    highestLevel: 0,
    level: 0,
  });
  const repeated = answerSequence(foundation, [false, false, true]);
  assert.equal(repeated.level, 0);
  assert.equal(repeated.foundationRetries, 1);
  assert.equal(repeated.lastSettlement.kind, "foundation");
  const recovered = answerSequence(logic.nextColorState(repeated), [true, true, false]);
  assert.equal(recovered.level, 1);

  const penultimate = Object.freeze({
    ...logic.createInitialColorState(),
    highestLevel: 23,
    level: 23,
  });
  const enteredLimit = answerSequence(penultimate, [true, false, true]);
  assert.equal(enteredLimit.level, 24);
  assert.equal(enteredLimit.hasCleared, false);
  const cleared = answerSequence(logic.nextColorState(enteredLimit), [true, true, false]);
  assert.equal(cleared.level, 24);
  assert.equal(cleared.hasCleared, true);
  assert.equal(cleared.extremeClears, 1);
  assert.equal(cleared.lastSettlement.clearedNow, true);

  const continued = answerSequence(logic.nextColorState(cleared), [true, true, true]);
  assert.equal(continued.extremeClears, 2);
  assert.equal(continued.lastSettlement.clearedNow, false);
  const fellBack = answerSequence(logic.nextColorState(continued), [false, true, false]);
  assert.equal(fellBack.level, 23);
  assert.equal(fellBack.extremeClears, 2);
});

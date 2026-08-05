import assert from "node:assert/strict";
import test from "node:test";

await import("../assets/js/toy-codebreaker.js");

const logic = globalThis.yiyuiiiToyCodebreakerLogic;

const makeRandom = (samples = [0]) => {
  let index = 0;
  return {
    uintBelow(maximum) {
      assert.ok(Number.isSafeInteger(maximum) && maximum > 0);
      const sample = samples[Math.min(index, samples.length - 1)];
      index += 1;
      return sample % maximum;
    },
  };
};

const referenceScore = (secret, guess) => {
  let exact = 0;
  const answerCounts = Array(10).fill(0);
  const guessCounts = Array(10).fill(0);
  for (let index = 0; index < secret.length; index += 1) {
    if (secret[index] === guess[index]) exact += 1;
    answerCounts[Number(secret[index])] += 1;
    guessCounts[Number(guess[index])] += 1;
  }
  const shared = answerCounts.reduce(
    (total, count, digit) => total + Math.min(count, guessCounts[digit]),
    0,
  );
  return { exact, misplaced: shared - exact };
};

test("configuration and presets expose only bounded meaningful choices", () => {
  assert.deepEqual(logic.CODE_LENGTHS, [3, 4, 5, 6]);
  assert.deepEqual(logic.ATTEMPT_LIMITS, [6, 8, 10, 12]);
  assert.deepEqual(logic.normalizeConfig(), {
    allowDuplicates: false,
    attempts: 8,
    length: 4,
  });
  assert.deepEqual(logic.PRESETS.beginner, {
    allowDuplicates: false,
    attempts: 8,
    length: 3,
  });
  assert.deepEqual(logic.PRESETS.duplicates, {
    allowDuplicates: true,
    attempts: 10,
    length: 4,
  });
  assert.throws(() => logic.normalizeConfig({ length: 2 }));
  assert.throws(() => logic.normalizeConfig({ attempts: 7 }));
  assert.throws(() => logic.normalizeConfig({ allowDuplicates: "yes" }));
});

test("candidate counts match the exact configured search spaces", () => {
  assert.equal(logic.candidateCount(logic.PRESETS.beginner), 720);
  assert.equal(logic.candidateCount(logic.PRESETS.standard), 5040);
  assert.equal(logic.candidateCount(logic.PRESETS.duplicates), 10000);
  assert.equal(logic.candidateCount({
    allowDuplicates: false,
    attempts: 12,
    length: 6,
  }), 151200);
  assert.equal(logic.candidateCount({
    allowDuplicates: true,
    attempts: 12,
    length: 6,
  }), 1000000);
});

test("secret generation preserves leading zeroes and duplicate rules", () => {
  assert.equal(logic.createSecret(makeRandom([0]), {
    allowDuplicates: false,
    attempts: 8,
    length: 6,
  }), "012345");
  assert.equal(logic.createSecret(makeRandom([0, 1, 1, 2]), {
    allowDuplicates: true,
    attempts: 10,
    length: 4,
  }), "0112");

  for (const allowDuplicates of [false, true]) {
    for (const length of logic.CODE_LENGTHS) {
      for (let sample = 0; sample < 100; sample += 1) {
        let value = (sample + 1) * 0x45d9f3b;
        const random = {
          uintBelow(maximum) {
            value = ((value * 1664525) + 1013904223) >>> 0;
            return value % maximum;
          },
        };
        const secret = logic.createSecret(random, { allowDuplicates, attempts: 8, length });
        assert.match(secret, new RegExp(`^[0-9]{${length}}$`));
        if (!allowDuplicates) assert.equal(new Set(secret).size, length);
      }
    }
  }
});

test("duplicate scoring uses a multiset intersection after exact matches", () => {
  assert.deepEqual(logic.scoreGuess("0123", "0123"), { exact: 4, misplaced: 0 });
  assert.deepEqual(logic.scoreGuess("1123", "1214"), { exact: 1, misplaced: 2 });
  assert.deepEqual(logic.scoreGuess("0011", "1000"), { exact: 1, misplaced: 2 });
  assert.deepEqual(logic.scoreGuess("1111", "1112"), { exact: 3, misplaced: 0 });

  let value = 0x9e3779b9;
  for (let sample = 0; sample < 20000; sample += 1) {
    value = ((value * 1664525) + 1013904223) >>> 0;
    const secret = String(value % 1000000).padStart(6, "0");
    value = ((value * 1664525) + 1013904223) >>> 0;
    const guess = String(value % 1000000).padStart(6, "0");
    const actual = logic.scoreGuess(secret, guess);
    assert.deepEqual(actual, referenceScore(secret, guess));
    assert.ok(actual.exact >= 0 && actual.exact <= 6);
    assert.ok(actual.misplaced >= 0 && actual.misplaced <= 6);
    assert.ok(actual.exact + actual.misplaced <= 6);
  }
});

test("guess validation is strict while preserving leading zeroes", () => {
  const unique = logic.PRESETS.standard;
  assert.deepEqual(logic.validateGuess("0123", unique), { code: null, valid: true });
  assert.deepEqual(logic.validateGuess("0012", unique), {
    code: "duplicates",
    valid: false,
  });
  assert.equal(logic.validateGuess("123", unique).code, "digits");
  assert.equal(logic.validateGuess("12 3", unique).code, "digits");
  assert.equal(logic.validateGuess("１２３４", unique).code, "digits");
  assert.equal(logic.validateGuess("0012", logic.PRESETS.duplicates).valid, true);
});

test("state transitions score once and stop exactly at win or attempt limit", () => {
  const winning = logic.createGameState(makeRandom([0]), logic.PRESETS.standard);
  const afterWrong = logic.submitGuess(winning, "4567");
  assert.equal(afterWrong.phase, "playing");
  assert.equal(afterWrong.history.length, 1);
  assert.throws(() => logic.submitGuess(afterWrong, "0012"), /duplicates/);

  const won = logic.submitGuess(afterWrong, "0123");
  assert.equal(won.phase, "won");
  assert.equal(won.history.length, 2);
  assert.strictEqual(logic.submitGuess(won, "0123"), won);

  let lost = logic.createGameState(makeRandom([0]), {
    allowDuplicates: false,
    attempts: 6,
    length: 3,
  });
  for (let attempt = 0; attempt < 6; attempt += 1) {
    lost = logic.submitGuess(lost, "345");
  }
  assert.equal(lost.phase, "lost");
  assert.equal(lost.history.length, 6);
  assert.strictEqual(logic.submitGuess(lost, "012"), lost);
});

test("revealing the answer ends only an active round and preserves its evidence", () => {
  const initial = logic.createGameState(makeRandom([0]), logic.PRESETS.standard);
  const guessed = logic.submitGuess(initial, "4567");
  const revealed = logic.revealAnswer(guessed);

  assert.equal(revealed.phase, "revealed");
  assert.equal(revealed.secret, "0123");
  assert.strictEqual(revealed.history, guessed.history);
  assert.strictEqual(logic.submitGuess(revealed, "0123"), revealed);
  assert.strictEqual(logic.revealAnswer(revealed), revealed);

  const won = logic.submitGuess(initial, "0123");
  assert.strictEqual(logic.revealAnswer(won), won);
});

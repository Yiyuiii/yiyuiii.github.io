import assert from "node:assert/strict";
import test from "node:test";

await import("../assets/js/toy-challenges.js");

const logic = globalThis.yiyuiiiToyChallengeLogic;

test("the shared random interface requires all three methods", () => {
  assert.equal(logic.hasRandomApi(null), false);
  assert.equal(logic.hasRandomApi({ intInclusive() {}, uintBelow() {} }), false);
  assert.equal(logic.hasRandomApi({
    intInclusive() {},
    pick() {},
    uintBelow() {},
  }), true);
});

test("color difficulty advances after each two consecutive correct answers", () => {
  assert.equal(logic.colorDifficulty(0), 0);
  assert.equal(logic.colorDifficulty(1), 0);
  assert.equal(logic.colorDifficulty(2), 1);
  assert.equal(logic.colorDifficulty(3), 1);
  assert.equal(logic.colorDifficulty(4), 2);
  assert.equal(logic.colorDifficulty(100), 2);
});

test("a color round has sixteen cells and a stable lightness difference", () => {
  const integers = [210, 68, 50];
  const randomApi = {
    intInclusive(minimum, maximum) {
      const value = integers.shift();
      assert.ok(value >= minimum && value <= maximum);
      return value;
    },
    pick(entries) {
      assert.deepEqual(entries, [-1, 1]);
      return 1;
    },
    uintBelow(maximum) {
      assert.equal(maximum, 16);
      return 9;
    },
  };
  const round = logic.createColorRound(randomApi, 2);
  assert.equal(round.difficulty, 1);
  assert.equal(round.oddIndex, 9);
  assert.equal(round.normalColor, "hsl(210 68% 50%)");
  assert.equal(round.oddColor, "hsl(210 68% 57%)");
});

test("the ten-second state machine measures only start-to-stop", () => {
  const idle = Object.freeze({ phase: "idle" });
  const running = logic.tenSecondTransition(idle, "start", 1000);
  assert.deepEqual(running, { phase: "running", startedAt: 1000 });
  assert.strictEqual(logic.tenSecondTransition(idle, "stop", 5000), idle);

  const finished = logic.tenSecondTransition(running, "stop", 10_750);
  assert.deepEqual(finished, {
    phase: "finished",
    elapsed: 9750,
    difference: 250,
  });
});

test("the ten-second state machine cancels a running attempt", () => {
  const running = logic.tenSecondTransition({ phase: "idle" }, "start", 20);
  assert.deepEqual(
    logic.tenSecondTransition(running, "cancel", 30),
    { phase: "cancelled" },
  );
});

test("the reaction state machine distinguishes early and valid presses", () => {
  const waiting = logic.reactionTransition({ phase: "idle" }, "start", 100, 2000);
  assert.deepEqual(waiting, {
    phase: "waiting",
    startedAt: 100,
    delay: 2000,
  });
  assert.deepEqual(
    logic.reactionTransition(waiting, "press", 500),
    { phase: "tooSoon" },
  );

  const ready = logic.reactionTransition(waiting, "signal", 2150);
  assert.deepEqual(ready, { phase: "ready", signalledAt: 2150 });
  assert.deepEqual(
    logic.reactionTransition(ready, "press", 2393.4),
    { phase: "finished", elapsed: 243.4000000000001 },
  );
});

test("the reaction state machine cancels both waiting and ready attempts", () => {
  const waiting = { phase: "waiting", startedAt: 0, delay: 1500 };
  const ready = { phase: "ready", signalledAt: 1500 };
  assert.deepEqual(
    logic.reactionTransition(waiting, "cancel", 200),
    { phase: "cancelled" },
  );
  assert.deepEqual(
    logic.reactionTransition(ready, "cancel", 1600),
    { phase: "cancelled" },
  );
});

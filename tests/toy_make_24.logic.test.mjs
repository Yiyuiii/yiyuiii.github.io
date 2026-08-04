import assert from "node:assert/strict";
import test from "node:test";

await import("../assets/js/toy-make-24.js");

const logic = globalThis.yiyuiiiToyMake24Logic;

const choose = (state, valueId) => logic.selectValue(state, valueId).state;

const operate = (state, leftId, operator, rightId) => {
  let transition = logic.selectValue(state, leftId);
  transition = logic.selectOperator(transition.state, operator);
  return logic.selectValue(transition.state, rightId);
};

test("fractions normalize exactly and arithmetic never falls back to decimals", () => {
  assert.deepEqual(logic.fraction(6, -8), { denominator: 4, numerator: -3 });
  assert.equal(logic.formatFraction(logic.fraction(24, 1)), "24");
  assert.equal(logic.formatFraction(logic.fraction(1, 3)), "1/3");

  const left = logic.fraction(2, 3);
  const right = logic.fraction(5, 7);
  assert.deepEqual(logic.applyOperation(left, "+", right), { denominator: 21, numerator: 29 });
  assert.deepEqual(logic.applyOperation(left, "-", right), { denominator: 21, numerator: -1 });
  assert.deepEqual(logic.applyOperation(left, "*", right), { denominator: 21, numerator: 10 });
  assert.deepEqual(logic.applyOperation(left, "/", right), { denominator: 15, numerator: 14 });
  assert.equal(logic.applyOperation(left, "/", logic.fraction(0)), null);
  assert.throws(() => logic.fraction(1, 0), /invalid fraction/);
});

test("the exhaustive puzzle pools match the independently established partition", () => {
  const pools = logic.buildPuzzlePools();
  assert.equal(pools.all.length, 566);
  assert.equal(pools.integer.length, 556);
  assert.equal(pools.fraction.length, 10);
  assert.equal(new Set(pools.all.map(logic.numbersSignature)).size, 566);
  assert.equal(new Set(pools.integer.map(logic.numbersSignature)).size, 556);
  assert.equal(new Set(pools.fraction.map(logic.numbersSignature)).size, 10);

  const integer = new Set(pools.integer.map(logic.numbersSignature));
  const fractions = new Set(pools.fraction.map(logic.numbersSignature));
  assert.ok(integer.has("6,6,6,6"));
  assert.ok(fractions.has("1,3,4,6"));
  for (const signature of integer) assert.equal(fractions.has(signature), false);
  assert.deepEqual(new Set([...integer, ...fractions]), new Set(pools.all.map(logic.numbersSignature)));

  const sharedMemo = new Map();
  assert.equal(logic.hasSolution([1, 3, 4, 6], {}, sharedMemo), true);
  assert.equal(logic.hasSolution([1, 3, 4, 6], { positiveIntegerOnly: true }, sharedMemo), false);
});

test("new-puzzle selection excludes the current item without biasing the offset", () => {
  const pool = Object.freeze([[1, 1, 1, 8], [1, 1, 2, 6], [1, 1, 3, 8], [1, 1, 4, 6]]);
  const calls = [];
  const random = {
    sample: 0,
    uintBelow(maximum) {
      calls.push(maximum);
      return this.sample;
    },
  };
  assert.deepEqual(logic.choosePuzzle(random, pool).numbers, pool[0]);
  random.sample = 0;
  assert.deepEqual(logic.choosePuzzle(random, pool, "1,1,2,6").numbers, pool[0]);
  random.sample = 1;
  assert.deepEqual(logic.choosePuzzle(random, pool, "1,1,2,6").numbers, pool[2]);
  random.sample = 2;
  assert.deepEqual(logic.choosePuzzle(random, pool, "1,1,2,6").numbers, pool[3]);
  assert.deepEqual(calls, [4, 3, 3, 3]);
});

test("selection has explicit idle, left-selected, and operator-selected substates", () => {
  const initial = logic.createGameState([1, 3, 4, 6]);
  assert.deepEqual(initial.selection, { leftId: "", operator: "" });

  const left = logic.selectValue(initial, "value-1");
  assert.equal(left.event, "left");
  assert.deepEqual(left.state.selection, { leftId: "value-1", operator: "" });

  const switched = logic.selectValue(left.state, "value-2");
  assert.equal(switched.event, "left");
  assert.deepEqual(switched.state.selection, { leftId: "value-2", operator: "" });

  const cancelled = logic.selectValue(switched.state, "value-2");
  assert.equal(cancelled.event, "cancel");
  assert.deepEqual(cancelled.state.selection, { leftId: "", operator: "" });

  const withOperator = logic.selectOperator(left.state, "/");
  assert.equal(withOperator.event, "operator");
  assert.deepEqual(withOperator.state.selection, { leftId: "value-1", operator: "/" });
});

test("fraction-required solution preserves operand order and wins in exactly three operations", () => {
  let state = logic.createGameState([1, 3, 4, 6]);
  let result = operate(state, "value-1", "/", "value-2");
  assert.equal(result.equation, "3 ÷ 4 = 3/4");
  state = result.state;

  result = operate(state, "value-0", "-", "value-4");
  assert.equal(result.equation, "1 − 3/4 = 1/4");
  state = result.state;

  result = operate(state, "value-3", "/", "value-5");
  assert.equal(result.event, "won");
  assert.equal(result.equation, "6 ÷ 1/4 = 24");
  assert.equal(result.state.phase, "won");
  assert.equal(result.state.steps.length, 3);
  assert.equal(logic.formatFraction(result.state.values[0].value), "24");

  const undone = logic.undoMove(result.state);
  assert.equal(undone.phase, "playing");
  assert.equal(undone.steps.length, 2);
  assert.equal(undone.values.length, 2);
});

test("division by zero, partial undo, stuck undo, and reset are reversible", () => {
  let state = logic.createGameState([0, 1, 1, 1]);
  let selected = choose(state, "value-1");
  selected = logic.selectOperator(selected, "/").state;
  const divideByZero = logic.selectValue(selected, "value-0");
  assert.equal(divideByZero.event, "divideByZero");
  assert.strictEqual(divideByZero.state, selected);

  const partialUndo = logic.undoMove(selected);
  assert.equal(partialUndo.phase, "playing");
  assert.deepEqual(partialUndo.selection, { leftId: "", operator: "" });
  assert.equal(partialUndo.history.length, 0);

  state = logic.createGameState([1, 1, 1, 1]);
  state = operate(state, "value-0", "+", "value-1").state;
  state = operate(state, "value-2", "+", "value-3").state;
  const stuck = operate(state, "value-4", "+", "value-5").state;
  assert.equal(stuck.phase, "stuck");
  assert.equal(logic.formatFraction(stuck.values[0].value), "4");

  const undone = logic.undoMove(stuck);
  assert.equal(undone.phase, "playing");
  assert.equal(undone.values.length, 2);
  assert.equal(undone.steps.length, 2);

  const reset = logic.resetGameState(undone);
  assert.equal(reset.phase, "playing");
  assert.deepEqual(reset.original, [1, 1, 1, 1]);
  assert.equal(reset.values.length, 4);
  assert.equal(reset.history.length, 0);
  assert.equal(reset.steps.length, 0);
});

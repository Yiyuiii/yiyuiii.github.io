import assert from "node:assert/strict";
import test from "node:test";

await import("../assets/js/toy-lights-out.js");

const logic = globalThis.yiyuiiiToyLightsOutLogic;

const distribution = (catalog) => {
  const counts = [];
  for (const entry of catalog) counts[entry.distance] = (counts[entry.distance] || 0) + 1;
  return counts;
};

test("cross masks and presses use only valid orthogonal neighbours", () => {
  assert.deepEqual(logic.toggleMasks(3), [11, 23, 38, 89, 186, 308, 200, 464, 416]);
  const initial = 0b101010101;
  for (let index = 0; index < 9; index += 1) {
    const once = logic.applyPress(initial, index, 3);
    assert.equal(logic.applyPress(once, index, 3), initial);
  }
  assert.throws(() => logic.toggleMasks(5), /invalid board size/);
  assert.throws(() => logic.applyPress(0, 9, 3), /invalid cell index/);
});

test("complete catalogs retain a minimum-weight clearing mask for every reachable board", () => {
  const expected = {
    3: { counts: [1, 9, 36, 84, 126, 126, 84, 36, 9, 1], states: 512 },
    4: { counts: [1, 16, 120, 560, 1387, 1440, 540, 32], states: 4096 },
  };
  for (const size of logic.SIZES) {
    const catalog = logic.buildBoardCatalog(size);
    assert.equal(catalog.length, expected[size].states);
    assert.deepEqual(distribution(catalog), expected[size].counts);
    assert.equal(new Set(catalog.map((entry) => entry.board)).size, catalog.length);
    for (const entry of catalog) {
      assert.equal(logic.popcount(entry.solutionMask), entry.distance);
      assert.equal(logic.applySolution(entry.board, entry.solutionMask, size), 0);
    }
  }
});

test("difficulty pools exclude trivial boards and match exact distance bands", () => {
  const expected = {
    3: { maxDistance: 9, medium: 252, short: 120, long: 130 },
    4: { maxDistance: 7, medium: 2827, short: 680, long: 572 },
  };
  for (const size of logic.SIZES) {
    const pools = logic.buildBoardPools(size);
    for (const key of logic.BAND_KEYS) assert.equal(pools[key].length, expected[size][key]);
    assert.equal(pools.maxDistance, expected[size].maxDistance);
    assert.ok(pools.short.every((entry) => entry.distance >= 2 && entry.distance <= 3));
    assert.ok(pools.medium.every((entry) => entry.distance >= 4 && entry.distance <= 5));
    assert.ok(pools.long.every((entry) => entry.distance >= 6 && entry.distance <= pools.maxDistance));
    assert.equal([...pools.short, ...pools.medium, ...pools.long].some((entry) => entry.board === 0), false);
  }
});

test("new-board selection excludes the current board with one bounded draw", () => {
  const pool = [
    { board: 11, distance: 2, solutionMask: 3 },
    { board: 23, distance: 2, solutionMask: 5 },
    { board: 38, distance: 2, solutionMask: 6 },
    { board: 89, distance: 2, solutionMask: 9 },
  ];
  const calls = [];
  const random = {
    sample: 0,
    uintBelow(maximum) {
      calls.push(maximum);
      return this.sample;
    },
  };
  assert.equal(logic.chooseBoard(random, pool).entry.board, 11);
  random.sample = 0;
  assert.equal(logic.chooseBoard(random, pool, 23).entry.board, 11);
  random.sample = 1;
  assert.equal(logic.chooseBoard(random, pool, 23).entry.board, 38);
  random.sample = 2;
  assert.equal(logic.chooseBoard(random, pool, 23).entry.board, 89);
  assert.deepEqual(calls, [4, 3, 3, 3]);
});

test("a recorded solution wins, and multi-step undo remains available after winning", () => {
  const entry = logic.buildBoardPools(3).medium[0];
  let state = logic.createGameState(entry, 3);
  const pressed = [];
  for (let index = 0; index < 9; index += 1) {
    if ((entry.solutionMask & (1 << index)) === 0) continue;
    state = logic.pressCell(state, index);
    pressed.push(index);
  }
  assert.equal(state.phase, "won");
  assert.equal(state.board, 0);
  assert.equal(state.history.length, entry.distance);

  for (let count = pressed.length; count > 0; count -= 1) {
    state = logic.undoPress(state);
    assert.equal(state.phase, "playing");
    assert.equal(state.history.length, count - 1);
  }
  assert.equal(state.board, entry.board);
});

test("reset restores the exact starting board and won boards reject extra presses", () => {
  const entry = logic.buildBoardPools(3).short[0];
  let state = logic.createGameState(entry, 3);
  state = logic.pressCell(state, 0);
  state = logic.pressCell(state, 4);
  const reset = logic.resetGameState(state);
  assert.equal(reset.board, entry.board);
  assert.equal(reset.phase, "playing");
  assert.deepEqual(reset.history, []);

  let won = logic.createGameState(entry, 3);
  for (let index = 0; index < 9; index += 1) {
    if ((entry.solutionMask & (1 << index)) !== 0) won = logic.pressCell(won, index);
  }
  assert.equal(won.phase, "won");
  assert.strictEqual(logic.pressCell(won, 0), won);
});

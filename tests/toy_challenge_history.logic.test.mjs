import assert from "node:assert/strict";
import test from "node:test";

await import("../assets/js/toy-challenge-history.js");

const history = globalThis.yiyuiiiToyChallengeHistory;

test("timing history uses only the two versioned storage keys", () => {
  assert.equal(history.CONFIG["ten-second"].key, "yiyuiii.toy.ten-second.v1");
  assert.equal(history.CONFIG["reaction-time"].key, "yiyuiii.toy.reaction-time.v1");
  assert.equal(history.HISTORY_LIMIT, 100);
  assert.equal(history.HISTORY_VERSION, 1);
});

test("history normalization rounds milliseconds, rejects malformed values, and keeps the latest 100", () => {
  const samples = Array.from({ length: 105 }, (_, index) => index + 1000.49);
  samples.splice(2, 0, -1, Number.NaN, "1200");
  const normalized = history.normalizeHistory("ten-second", {
    version: 1,
    samples,
    completedTotal: 90,
    falseStarts: 9,
  });
  assert.equal(normalized.samples.length, 100);
  assert.equal(normalized.samples[0], 1005);
  assert.equal(normalized.samples.at(-1), 1104);
  assert.equal(normalized.completedTotal, 100);
  assert.equal(normalized.falseStarts, 0);
  assert.deepEqual(
    history.normalizeHistory("ten-second", { version: 2, samples: [10_000] }),
    history.emptyHistory(),
  );
});

test("appending a result rounds once, increments the total, and bounds retained samples", () => {
  let current = history.emptyHistory();
  for (let index = 0; index < 101; index += 1) {
    current = history.appendSample("reaction-time", current, 200.6 + index);
  }
  assert.equal(current.samples.length, 100);
  assert.equal(current.samples[0], 202);
  assert.equal(current.samples.at(-1), 301);
  assert.equal(current.completedTotal, 101);
});

test("reaction false starts are counted without creating zero-millisecond samples", () => {
  const current = history.recordFalseStart({
    version: 1,
    samples: [240],
    completedTotal: 1,
    falseStarts: 2,
  });
  assert.deepEqual(current.samples, [240]);
  assert.equal(current.falseStarts, 3);
});

test("percentile uses linear interpolation and median handles even samples", () => {
  assert.equal(history.percentile([0, 10], 0.25), 2.5);
  assert.equal(history.percentile([0, 10, 20, 30], 0.75), 22.5);
  assert.equal(history.median([1, 9, 3, 7]), 5);
  assert.equal(history.median([]), null);
});

test("rolling trend uses the latest five valid values and leaves excluded attempts unplotted", () => {
  const samples = [10_000, 10_100, 9_800, 500, 10_200, 9_900, 10_300];
  const rolling = history.rollingMedian(
    "ten-second",
    samples,
    (sample) => sample - 10_000,
  );
  assert.deepEqual(rolling.slice(0, 5), [null, null, null, null, null]);
  assert.equal(rolling[5], 0);
  assert.equal(rolling[6], 100);
});

test("ten-second summary reports absolute accuracy and signed tendency separately", () => {
  const summary = history.summarizeTenSecond({
    version: 1,
    samples: [9_000, 10_100, 11_000, 500],
    completedTotal: 4,
    falseStarts: 0,
  });
  assert.equal(summary.validCount, 3);
  assert.equal(summary.retainedCount, 4);
  assert.equal(summary.best, 100);
  assert.equal(summary.typical, 1000);
  assert.equal(summary.tendency, 100);
  assert.equal(summary.recentMedian, null);
});

test("reaction summary reports median, best, recent trend, and an aligned false-start rate", () => {
  const summary = history.summarizeReaction({
    version: 1,
    samples: [200, 220, 240, 260, 280, 50, 4000],
    completedTotal: 8,
    falseStarts: 2,
  });
  assert.equal(summary.validCount, 5);
  assert.equal(summary.best, 200);
  assert.equal(summary.typical, 240);
  assert.equal(summary.recentMedian, 240);
  assert.equal(summary.falseStartRate, 0.2);
});

test("chart scales are bounded, honest, and preserve excluded points at an edge", () => {
  const ten = history.buildChartSeries("ten-second", {
    version: 1,
    samples: [9_800, 10_100, 120_000],
    completedTotal: 3,
    falseStarts: 0,
  });
  assert.equal(ten.minimum, -ten.maximum);
  assert.ok(ten.maximum >= 500 && ten.maximum <= 10_000);
  assert.equal(ten.points.at(-1).outside, true);
  assert.equal(ten.points.at(-1).clipped, ten.maximum);

  const reaction = history.buildChartSeries("reaction-time", {
    version: 1,
    samples: [210, 260, 4000],
    completedTotal: 3,
    falseStarts: 0,
  });
  assert.equal(reaction.minimum, 0);
  assert.ok(reaction.maximum >= 500 && reaction.maximum <= 3000);
  assert.equal(reaction.points.at(-1).outside, true);
});

test("persistent stores write and remove only their own exact key", () => {
  const calls = [];
  const values = new Map();
  const storage = {
    getItem(key) {
      calls.push(["get", key]);
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      calls.push(["set", key]);
      values.set(key, value);
    },
    removeItem(key) {
      calls.push(["remove", key]);
      values.delete(key);
    },
  };
  const store = history.createStore("ten-second", storage);
  store.append(10_000.6);
  assert.equal(store.getHistory().samples[0], 10_001);
  assert.equal(store.clear(), true);
  assert.deepEqual(calls.map((entry) => entry[1]), [
    "yiyuiii.toy.ten-second.v1",
    "yiyuiii.toy.ten-second.v1",
    "yiyuiii.toy.ten-second.v1",
  ]);
});

test("storage failures degrade to bounded in-memory history", () => {
  const storage = {
    getItem() {
      throw new Error("blocked");
    },
  };
  const store = history.createStore("reaction-time", storage);
  assert.equal(store.isPersistent(), false);
  store.append(250.8);
  store.falseStart();
  assert.deepEqual(store.getHistory().samples, [251]);
  assert.equal(store.getHistory().falseStarts, 1);
});

test("malformed saved JSON is ignored without disabling future persistence", () => {
  let saved = "{broken";
  const storage = {
    getItem() {
      return saved;
    },
    setItem(_key, value) {
      saved = value;
    },
    removeItem() {},
  };
  const store = history.createStore("ten-second", storage);
  assert.equal(store.isPersistent(), true);
  assert.deepEqual(store.getHistory().samples, []);
  store.append(10_000);
  assert.deepEqual(JSON.parse(saved).samples, [10_000]);
});

test("a failed persistent removal is reported differently from an initial memory-only clear", () => {
  const storage = {
    getItem() {
      return JSON.stringify({ version: 1, samples: [250], completedTotal: 1, falseStarts: 0 });
    },
    removeItem() {
      throw new Error("removal blocked");
    },
  };
  const store = history.createStore("reaction-time", storage);
  const wasPersistent = store.isPersistent();
  const removed = store.clear();
  assert.equal(wasPersistent, true);
  assert.equal(removed, false);
  assert.equal(history.clearStatusName(wasPersistent, removed), "clearFailed");
  assert.equal(history.clearStatusName(false, false), "cleared");
});

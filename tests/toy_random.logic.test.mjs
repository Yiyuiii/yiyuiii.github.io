import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(
  new URL("../assets/js/toy-random.js", import.meta.url),
  "utf8",
);

const loadRandom = (values) => {
  const queue = [...values];
  let draws = 0;
  const context = {
    crypto: {
      getRandomValues(array) {
        draws += 1;
        for (let index = 0; index < array.length; index += 1) {
          if (!queue.length) throw new Error("mock random queue exhausted");
          array[index] = queue.shift();
        }
        return array;
      },
    },
  };
  vm.runInNewContext(source, context);
  return { api: context.yiyuiiiToyRandom, draws: () => draws };
};

test("32-bit rejection sampling rejects the high remainder", () => {
  const random = loadRandom([0xffff_ffff, 7]);
  assert.equal(random.api.uintBelow(10), 7);
  assert.equal(random.draws(), 2);
});

test("the full 32-bit range accepts its maximum value", () => {
  const random = loadRandom([0xffff_ffff]);
  assert.equal(random.api.uintBelow(0x1_0000_0000), 0xffff_ffff);
  assert.equal(random.draws(), 1);
});

test("53-bit rejection sampling excludes the unreachable remainder", () => {
  const random = loadRandom([0xffff_ffff, 0xffff_ffff, 0, 9]);
  assert.equal(random.api.uintBelow(Number.MAX_SAFE_INTEGER), 9);
  assert.equal(random.draws(), 2);
});

test("inclusive ranges reject unsafe spans", () => {
  const random = loadRandom([]);
  assert.throws(
    () => random.api.intInclusive(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
    /inclusive range is too wide/,
  );
});

(() => {
  "use strict";

  const UINT32_RANGE = 0x1_0000_0000;
  const UINT53_RANGE = 0x20_0000_0000_0000;
  const UINT53_HIGH_MASK = 0x1f_ffff;

  const fill = (array) => {
    if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== "function") {
      throw new Error("secure randomness is unavailable");
    }
    return globalThis.crypto.getRandomValues(array);
  };

  const drawUint32 = () => fill(new Uint32Array(1))[0];

  const drawUint53 = () => {
    const sample = fill(new Uint32Array(2));
    return (sample[0] & UINT53_HIGH_MASK) * UINT32_RANGE + sample[1];
  };

  const uintBelow = (maximum) => {
    if (!Number.isSafeInteger(maximum) || maximum < 1) {
      throw new RangeError("maximum must be a positive safe integer");
    }

    if (maximum <= UINT32_RANGE) {
      const acceptedRange = UINT32_RANGE - (UINT32_RANGE % maximum);
      let sample;
      do sample = drawUint32(); while (sample >= acceptedRange);
      return sample % maximum;
    }

    const acceptedRange = UINT53_RANGE - (UINT53_RANGE % maximum);
    let sample;
    do sample = drawUint53(); while (sample >= acceptedRange);
    return sample % maximum;
  };

  const intInclusive = (minimum, maximum) => {
    if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum) || maximum < minimum) {
      throw new RangeError("bounds must be ordered safe integers");
    }
    const span = maximum - minimum + 1;
    if (!Number.isSafeInteger(span) || span < 1) {
      throw new RangeError("inclusive range is too wide");
    }
    return minimum + uintBelow(span);
  };

  const pick = (entries) => {
    if (!Array.isArray(entries) || entries.length < 1) {
      throw new RangeError("entries must be a non-empty array");
    }
    return entries[uintBelow(entries.length)];
  };

  globalThis.yiyuiiiToyRandom = Object.freeze({ intInclusive, pick, uintBelow });
})();

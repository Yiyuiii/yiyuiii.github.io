(() => {
  "use strict";

  const FULL_GROUPS = Object.freeze({
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    digits: "0123456789",
    symbols: "!@#$%^&*()-_=+[]{};:,.?",
  });
  const CLEAR_GROUPS = Object.freeze({
    lowercase: "abcdefghijkmnpqrstuvwxyz",
    uppercase: "ABCDEFGHJKLMNPQRSTUVWXYZ",
    digits: "23456789",
    symbols: FULL_GROUPS.symbols,
  });
  const MAX_PASSWORD_ATTEMPTS = 4096;

  const readCopy = (root, selector) => {
    const node = root.querySelector(selector);
    if (!node) throw new Error("missing localized generator copy");
    return JSON.parse(node.textContent || "null");
  };

  const copyText = async (value, field) => {
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        throw new Error("clipboard is unavailable");
      }
      await navigator.clipboard.writeText(value);
      return true;
    } catch (_error) {
      field.focus();
      field.select();
      return false;
    }
  };

  const initPassword = (root) => {
    if (root.dataset.ready === "true") return;
    const random = globalThis.yiyuiiiToyRandom;
    const interactive = root.querySelector("[data-generator-interactive]");
    const lengthField = root.querySelector("[data-password-length]");
    const groupFields = [...root.querySelectorAll("[data-password-group]")];
    const ambiguousField = root.querySelector("[data-password-ambiguous]");
    const generateButton = root.querySelector("[data-password-generate]");
    const visibilityButton = root.querySelector("[data-password-visibility]");
    const copyButton = root.querySelector("[data-password-copy]");
    const outputWrap = root.querySelector("[data-password-output-wrap]");
    const output = root.querySelector("[data-password-output]");
    const status = root.querySelector("[data-password-status]");
    let copy;
    try {
      copy = readCopy(root, "[data-password-copy-data]");
    } catch (_error) {
      return;
    }
    if (!interactive || !lengthField || !ambiguousField || !generateButton || !visibilityButton
      || !copyButton || !outputWrap || !output || !status || !groupFields.length) return;
    interactive.hidden = false;

    if (!random || typeof random.pick !== "function") {
      generateButton.disabled = true;
      status.textContent = copy.random_error;
      return;
    }

    const generate = () => {
      const length = Number(lengthField.value);
      const source = ambiguousField.checked ? CLEAR_GROUPS : FULL_GROUPS;
      const groups = groupFields
        .filter((field) => field.checked)
        .map((field) => source[field.dataset.passwordGroup])
        .filter(Boolean);

      if (!groups.length) {
        status.textContent = copy.group_error;
        return;
      }
      if (!Number.isSafeInteger(length) || length < 8 || length > 128 || length < groups.length) {
        status.textContent = copy.length_error;
        return;
      }

      const alphabet = groups.join("");
      let password = "";
      try {
        for (let attempt = 0; attempt < MAX_PASSWORD_ATTEMPTS; attempt += 1) {
          const candidate = Array.from({ length }, () => random.pick([...alphabet])).join("");
          if (groups.every((group) => [...candidate].some((character) => group.includes(character)))) {
            password = candidate;
            break;
          }
        }
      } catch (_error) {
        password = "";
      }
      if (!password) {
        status.textContent = copy.random_error;
        return;
      }

      output.type = "password";
      output.value = password;
      outputWrap.hidden = false;
      visibilityButton.textContent = copy.show;
      generateButton.textContent = copy.regenerate;
      status.textContent = length < 16 ? `${copy.generated} ${copy.short_warning}` : copy.generated;
    };

    root.addEventListener("submit", (event) => {
      event.preventDefault();
      generate();
    });
    visibilityButton.addEventListener("click", () => {
      const showing = output.type === "text";
      output.type = showing ? "password" : "text";
      visibilityButton.textContent = showing ? copy.show : copy.hide;
    });
    copyButton.addEventListener("click", async () => {
      if (!output.value) return;
      status.textContent = await copyText(output.value, output) ? copy.copied : copy.copy_failed;
    });
    root.dataset.ready = "true";
  };

  const sampleUniqueOffsets = (span, count, random) => {
    const selected = new Set();
    for (let cursor = span - count; cursor < span; cursor += 1) {
      const candidate = random.uintBelow(cursor + 1);
      selected.add(selected.has(candidate) ? cursor : candidate);
    }
    const offsets = [...selected];
    for (let index = offsets.length - 1; index > 0; index -= 1) {
      const swapIndex = random.uintBelow(index + 1);
      [offsets[index], offsets[swapIndex]] = [offsets[swapIndex], offsets[index]];
    }
    return offsets;
  };

  const initNumber = (root) => {
    if (root.dataset.ready === "true") return;
    const random = globalThis.yiyuiiiToyRandom;
    const interactive = root.querySelector("[data-generator-interactive]");
    const minimumField = root.querySelector("[data-number-minimum]");
    const maximumField = root.querySelector("[data-number-maximum]");
    const countField = root.querySelector("[data-number-count]");
    const uniqueField = root.querySelector("[data-number-unique]");
    const sortField = root.querySelector("[data-number-sort]");
    const generateButton = root.querySelector("[data-number-generate]");
    const copyButton = root.querySelector("[data-number-copy]");
    const outputWrap = root.querySelector("[data-number-output-wrap]");
    const output = root.querySelector("[data-number-output]");
    const status = root.querySelector("[data-number-status]");
    let copy;
    try {
      copy = readCopy(root, "[data-number-copy-data]");
    } catch (_error) {
      return;
    }
    if (!interactive || !minimumField || !maximumField || !countField || !uniqueField || !sortField
      || !generateButton || !copyButton || !outputWrap || !output || !status) return;
    interactive.hidden = false;

    if (!random || typeof random.intInclusive !== "function" || typeof random.uintBelow !== "function") {
      generateButton.disabled = true;
      status.textContent = copy.random_error;
      return;
    }

    for (const preset of root.querySelectorAll("[data-number-preset]")) {
      preset.addEventListener("click", () => {
        minimumField.value = preset.dataset.minimum;
        maximumField.value = preset.dataset.maximum;
        countField.value = "1";
        uniqueField.checked = false;
        sortField.checked = false;
        minimumField.focus();
      });
    }

    const generate = () => {
      const minimum = Number(minimumField.value);
      const maximum = Number(maximumField.value);
      const count = Number(countField.value);
      const span = maximum - minimum + 1;
      if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum)
        || maximum < minimum || !Number.isSafeInteger(span) || span < 1) {
        status.textContent = copy.range_error;
        return;
      }
      if (!Number.isSafeInteger(count) || count < 1 || count > 100) {
        status.textContent = copy.count_error;
        return;
      }
      if (uniqueField.checked && count > span) {
        status.textContent = copy.unique_error;
        return;
      }

      let values;
      try {
        values = uniqueField.checked
          ? sampleUniqueOffsets(span, count, random).map((offset) => minimum + offset)
          : Array.from({ length: count }, () => random.intInclusive(minimum, maximum));
      } catch (_error) {
        status.textContent = copy.random_error;
        return;
      }
      if (sortField.checked) values.sort((left, right) => left - right);

      output.value = values.join(", ");
      outputWrap.hidden = false;
      generateButton.textContent = copy.regenerate;
      status.textContent = String(copy.generated).replace("{count}", String(count));
    };

    root.addEventListener("submit", (event) => {
      event.preventDefault();
      generate();
    });

    copyButton.addEventListener("click", async () => {
      if (!output.value) return;
      status.textContent = await copyText(output.value, output) ? copy.copied : copy.copy_failed;
    });
    root.dataset.ready = "true";
  };

  for (const root of document.querySelectorAll("[data-toy-random-password]")) initPassword(root);
  for (const root of document.querySelectorAll("[data-toy-random-number]")) initNumber(root);
})();

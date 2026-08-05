#!/usr/bin/env node

// Explicit maintenance-only probe. Each invocation performs at most one CMA
// metadata GET and, only if a round forms, its four final image GETs. It never
// follows pages, retries, saves response bodies, or prints artwork identifiers.

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const args = new Set(process.argv.slice(2));
if (!args.has("--run-live")) {
  throw new Error("Refusing external requests without --run-live");
}
const sampleIndex = Number.parseInt(process.argv[process.argv.indexOf("--sample") + 1] || "0", 10);
if (!Number.isSafeInteger(sampleIndex) || sampleIndex < 1 || sampleIndex > 10) {
  throw new Error("--sample must be an integer from 1 to 10");
}

await import(pathToFileURL(resolve("assets/js/art-glimpse.js")).href);
const logic = globalThis.yiyuiiiArtGlimpseLogic;
const config = logic.validateConfig({
  endpoint: "https://openaccess-api.clevelandart.org/api/artworks/",
  api_host: "openaccess-api.clevelandart.org",
  image_host: "openaccess-cdn.clevelandart.org",
  artwork_hosts: ["clevelandart.org", "www.clevelandart.org"],
  license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
  open_access_url: "https://www.clevelandart.org/open-access",
  query: "landscape",
  artwork_type: "Painting",
  batch_size: 12,
  candidate_count: 4,
  safe_skip_max: 300,
  timeout_ms: 12000,
  image_timeout_ms: 10000,
  max_response_chars: 262144,
  max_image_bytes: 1200000,
  max_round_image_bytes: 4000000,
});

const UINT32_RANGE = 0x1_0000_0000;
const IMAGE_CONTENT_TYPE = "image/jpeg";
const randomApi = Object.freeze({
  uintBelow(maximum) {
    const accepted = UINT32_RANGE - (UINT32_RANGE % maximum);
    const sample = new Uint32Array(1);
    do crypto.getRandomValues(sample); while (sample[0] >= accepted);
    return sample[0] % maximum;
  },
});

const readWithLimit = async (response, limit) => {
  const reader = response.body.getReader();
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) return bytes;
    bytes += value.byteLength;
    if (bytes > limit) {
      await reader.cancel("size cap exceeded");
      throw new Error("size cap exceeded");
    }
  }
};

const output = {
  sample: sampleIndex,
  skip: randomApi.uintBelow(config.safeSkipMax + 1),
  metadata_ok: false,
  metadata_ms: null,
  metadata_bytes: 0,
  returned: 0,
  eligible: 0,
  round_formed: false,
  declared_round_image_bytes: 0,
  images_ok: false,
  image_ms: null,
  actual_round_image_bytes: 0,
  outcome: "error",
};

const metadataController = new AbortController();
const metadataTimer = setTimeout(() => metadataController.abort(), config.timeoutMs);
let gameRound;
try {
  const metadataStart = performance.now();
  const response = await fetch(logic.buildApiUrl(config, output.skip), {
    cache: "no-store",
    credentials: "omit",
    headers: { Accept: "application/json" },
    method: "GET",
    redirect: "error",
    referrerPolicy: "no-referrer",
    signal: metadataController.signal,
  });
  if (!response.ok) throw new Error(`metadata HTTP ${response.status}`);
  const declared = Number.parseInt(response.headers.get("content-length") || "", 10);
  if (Number.isFinite(declared) && declared > config.maxResponseChars) {
    throw new Error("metadata size cap exceeded");
  }
  const text = await response.text();
  if (text.length > config.maxResponseChars) throw new Error("metadata size cap exceeded");
  output.metadata_ms = Math.round(performance.now() - metadataStart);
  output.metadata_bytes = Buffer.byteLength(text);
  const payload = JSON.parse(text);
  output.returned = Array.isArray(payload.data) ? payload.data.length : 0;
  const eligible = logic.normalizeArtworks(payload, config);
  output.eligible = eligible.length;
  gameRound = logic.createRound(eligible, config, randomApi);
  output.round_formed = Boolean(gameRound);
  output.metadata_ok = true;
} catch (error) {
  output.error = error?.name === "AbortError" ? "metadata_timeout" : "metadata_failure";
} finally {
  clearTimeout(metadataTimer);
}

if (gameRound) {
  output.declared_round_image_bytes = gameRound.totalImageBytes;
  const imageController = new AbortController();
  const imageTimer = setTimeout(() => imageController.abort(), config.imageTimeoutMs);
  const imageStart = performance.now();
  try {
    const byteCounts = await Promise.all(gameRound.options.map(async (artwork) => {
      const response = await fetch(artwork.imageUrl, {
        cache: "no-store",
        credentials: "omit",
        method: "GET",
        redirect: "error",
        referrerPolicy: "no-referrer",
        signal: imageController.signal,
      });
      if (!response.ok) throw new Error(`image HTTP ${response.status}`);
      if (!(response.headers.get("content-type") || "").toLowerCase().startsWith(IMAGE_CONTENT_TYPE)) {
        throw new Error("image content type mismatch");
      }
      const declared = Number.parseInt(response.headers.get("content-length") || "", 10);
      if (Number.isFinite(declared) && declared > config.maxImageBytes) {
        throw new Error("image size cap exceeded");
      }
      return readWithLimit(response, config.maxImageBytes);
    }));
    output.image_ms = Math.round(performance.now() - imageStart);
    output.actual_round_image_bytes = byteCounts.reduce((sum, value) => sum + value, 0);
    if (output.actual_round_image_bytes > config.maxRoundImageBytes) {
      throw new Error("round image size cap exceeded");
    }
    output.images_ok = true;
    output.outcome = "success";
  } catch (error) {
    output.image_ms = Math.round(performance.now() - imageStart);
    output.error = error?.name === "AbortError" ? "image_timeout" : "image_failure";
  } finally {
    clearTimeout(imageTimer);
  }
} else if (output.metadata_ok) {
  output.outcome = "no_round";
}

process.stdout.write(`${JSON.stringify(output)}\n`);

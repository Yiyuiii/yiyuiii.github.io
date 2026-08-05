import assert from "node:assert/strict";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

await import(pathToFileURL(resolve("assets/js/art-glimpse.js")).href);
const logic = globalThis.yiyuiiiArtGlimpseLogic;

const rawConfig = (overrides = {}) => ({
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
  ...overrides,
});

const artwork = (id, overrides = {}) => ({
  id,
  accession_number: `2000.${id}`,
  title: `Landscape ${id}`,
  creation_date: "1900",
  creators: [{ description: `Artist ${id}` }],
  images: {
    web: {
      url: `https://openaccess-cdn.clevelandart.org/2000.${id}/2000.${id}_web.jpg`,
      filesize: "500000",
      width: "900",
      height: "700",
    },
  },
  url: `https://clevelandart.org/art/2000.${id}`,
  share_license_status: "CC0",
  type: "Painting",
  department: "European Painting and Sculpture",
  description: "A quiet landscape with trees and distant hills.",
  ...overrides,
});

const deterministic = (values) => {
  let index = 0;
  return { uintBelow(maximum) { const value = values[index++] ?? 0; return value % maximum; } };
};

test("exact official configuration is accepted and bounded", () => {
  const config = logic.validateConfig(rawConfig());
  assert.equal(config.endpoint, logic.EXPECTED.endpoint);
  assert.equal(config.batchSize, 12);
  assert.equal(config.candidateCount, 4);
  assert.equal(config.safeSkipMax, 300);
  assert.equal(config.imageTimeoutMs, 10000);
});

test("endpoint, media host, source hosts, query, and license fail closed", () => {
  for (const changed of [
    { endpoint: "https://attacker.invalid/api" },
    { image_host: "images.example" },
    { artwork_hosts: ["clevelandart.org", "attacker.invalid"] },
    { query: "portrait" },
    { license_url: "https://example.invalid/license" },
  ]) assert.throws(() => logic.validateConfig(rawConfig(changed)), /untrusted/);
});

test("one API URL uses only the documented small filtered shallow page", () => {
  const url = new URL(logic.buildApiUrl(logic.validateConfig(rawConfig()), 123));
  assert.equal(url.origin + url.pathname, logic.EXPECTED.endpoint);
  assert.equal(url.searchParams.get("q"), "landscape");
  assert.equal(url.searchParams.get("cc0"), "");
  assert.equal(url.searchParams.get("has_image"), "1");
  assert.equal(url.searchParams.get("type"), "Painting");
  assert.equal(url.searchParams.get("limit"), "12");
  assert.equal(url.searchParams.get("skip"), "123");
  assert.deepEqual(url.searchParams.get("fields").split(","), [...logic.RESPONSE_FIELDS]);
  for (const forbidden of ["page", "cursor", "ids", "random", "api_key", "key"]) {
    assert.equal(url.searchParams.has(forbidden), false);
  }
});

test("normalization accepts only exact CC0 painting and official links", () => {
  const config = logic.validateConfig(rawConfig());
  const accepted = logic.normalizeArtworks({ data: [artwork(1)] }, config);
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].title, "Landscape 1");
  assert.equal(accepted[0].filesize, 500000);
  assert.equal(Object.isFrozen(accepted[0]), true);
});

test("normalization rejects incomplete clues, restricted, sensitive, hostile, oversized, and duplicate records", () => {
  const config = logic.validateConfig(rawConfig());
  const records = [
    artwork(1, { share_license_status: "Copyrighted" }),
    artwork(2, { title: "Nude in a Landscape" }),
    artwork(3, { url: "https://attacker.invalid/art/3" }),
    artwork(4, { images: { web: { url: "https://attacker.invalid/4_web.jpg", filesize: "1", width: "900", height: "700" } } }),
    artwork(5, { images: { web: { url: "https://openaccess-cdn.clevelandart.org/5/5_web.jpg", filesize: "1500000", width: "900", height: "700" } } }),
    artwork(7, { creators: [] }),
    artwork(8, { creation_date: "" }),
    artwork(6),
    artwork(6),
  ];
  const result = logic.normalizeArtworks({ data: records }, config);
  assert.deepEqual(result.map((item) => item.id), [6]);
});

test("a round contains four unique options and stays within the media cap", () => {
  const config = logic.validateConfig(rawConfig({ max_round_image_bytes: 2100000 }));
  const entries = logic.normalizeArtworks({ data: [1, 2, 3, 4, 5, 6].map(artwork) }, config);
  const round = logic.createRound(entries, config, deterministic(new Array(30).fill(0)));
  assert.ok(round);
  assert.equal(round.options.length, 4);
  assert.equal(new Set(round.options.map((item) => item.id)).size, 4);
  assert.ok(round.options.includes(round.answer));
  assert.equal(round.totalImageBytes, 2000000);
  assert.ok(round.totalImageBytes <= config.maxRoundImageBytes);
  assert.equal(round.answer.creator.startsWith("Artist "), true);
  assert.equal(round.answer.date, "1900");
  assert.equal("cropX" in round, false);
  assert.equal("cropY" in round, false);
  assert.equal("zoom" in round, false);
});

test("insufficient eligible items or byte budget produces no round", () => {
  const config = logic.validateConfig(rawConfig());
  const entries = logic.normalizeArtworks({ data: [1, 2, 3].map(artwork) }, config);
  assert.equal(logic.createRound(entries, config, deterministic([])), null);
  const tight = { ...config, maxRoundImageBytes: 800000 };
  const more = logic.normalizeArtworks({ data: [1, 2, 3, 4, 5].map(artwork) }, config);
  assert.equal(logic.createRound(more, tight, deterministic([])), null);
});

test("URL validator rejects HTTP, credentials, ports, and lookalike hosts", () => {
  const hosts = new Set(["openaccess-cdn.clevelandart.org"]);
  for (const value of [
    "http://openaccess-cdn.clevelandart.org/a_web.jpg",
    "https://user@openaccess-cdn.clevelandart.org/a_web.jpg",
    "https://openaccess-cdn.clevelandart.org:444/a_web.jpg",
    "https://openaccess-cdn.clevelandart.org.attacker.invalid/a_web.jpg",
    "https://openaccess-cdn.clevelandart.org/a.png",
  ]) assert.equal(logic.safeHttpsUrl(value, hosts, /_web\.jpg$/i), null);
});

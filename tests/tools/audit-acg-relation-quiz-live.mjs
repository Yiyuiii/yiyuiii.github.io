#!/usr/bin/env node

// Explicit maintenance-only AniList probe. Each invocation performs exactly
// one production-shaped GraphQL POST. It never retries, follows another page,
// saves a response, or prints anime and character content.

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const args = process.argv.slice(2);
if (!args.includes("--run-live")) {
  throw new Error("Refusing external requests without --run-live");
}

const pageArgument = args.indexOf("--page");
const page = Number.parseInt(pageArgument >= 0 ? args[pageArgument + 1] : "1", 10);
if (!Number.isSafeInteger(page) || page < 1 || page > 60) {
  throw new Error("--page must be an integer from 1 to 60");
}

await import(pathToFileURL(resolve("assets/js/acg-relation-quiz-logic.js")).href);
const logic = globalThis.yiyuiiiAcgRelationQuizLogic;
const source = Object.freeze({
  id: "anilist_role",
  adapter: "anilist_role",
  endpoint: "https://graphql.anilist.co",
  method: "POST",
  page_min: 1,
  page_max: 60,
  media_per_page: 6,
  characters_per_media: 10,
});
const request = logic.buildAniListRequest(source, page);
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 10_000);
const started = performance.now();

const output = {
  page,
  requests: 1,
  returned_media: 0,
  eligible_media: 0,
  round_formed: false,
  round_kind: null,
  elapsed_ms: null,
  outcome: "error",
};

try {
  const response = await fetch(request.endpoint, {
    method: request.method,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: request.body,
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    referrerPolicy: "no-referrer",
    signal: controller.signal,
  });
  if (!response.ok) throw new Error(`AniList HTTP ${response.status}`);
  const declared = Number.parseInt(response.headers.get("content-length") || "", 10);
  if (Number.isFinite(declared) && declared > 262_144) {
    throw new Error("AniList response size cap exceeded");
  }
  const responseText = await response.text();
  if (Buffer.byteLength(responseText) > 262_144) {
    throw new Error("AniList response size cap exceeded");
  }
  const payload = JSON.parse(responseText);
  const rawMedia = payload?.data?.Page?.media;
  output.returned_media = Array.isArray(rawMedia) ? rawMedia.length : 0;
  const eligible = logic.normalizeAniList(payload, "en");
  output.eligible_media = eligible.length;
  const round = logic.createAniListRound(eligible, {
    allowedKinds: logic.ROUND_KINDS,
    randomApi: Object.freeze({ uintBelow: () => 0 }),
  });
  output.round_formed = true;
  output.round_kind = round.kind;
  output.outcome = "success";
} catch (error) {
  output.error = error?.name === "AbortError" ? "timeout" : "request_or_contract_failure";
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
  output.elapsed_ms = Math.round(performance.now() - started);
}

process.stdout.write(`${JSON.stringify(output)}\n`);

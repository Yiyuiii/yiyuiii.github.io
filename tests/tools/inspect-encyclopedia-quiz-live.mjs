import crypto from "node:crypto";

import "../../assets/js/encyclopedia-quiz-logic.js";

const logic = globalThis.yiyuiiiEncyclopediaQuizLogic;
const sourceArgument = process.argv.find((value) => value.startsWith("--source="));
const sourceId = sourceArgument?.slice("--source=".length);

if (!process.argv.includes("--run-live") || !sourceId) {
  console.error(
    "Opt in to exactly one live API GET with --run-live --source=<source id>.",
  );
  process.exitCode = 2;
} else if (!Object.hasOwn(logic.SOURCE_DEFINITIONS, sourceId)) {
  console.error("Unknown source id.");
  process.exitCode = 2;
} else {
  const startedAt = performance.now();
  const source = Object.freeze({ id: sourceId, ...logic.SOURCE_DEFINITIONS[sourceId] });
  const nonce = crypto.randomBytes(16).toString("hex");
  const url = logic.buildApiUrl(source, nonce);
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "omit",
    headers: {
      Accept: "application/json",
      "User-Agent": "yiyuiii-encyclopedia-quiz-feasibility/1.0 (single-request audit)",
    },
    redirect: "error",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);
  if (body.length > 262_144) throw new Error("API response exceeded the audit size cap");

  const payload = JSON.parse(body);
  const rawPages = Array.isArray(payload?.query?.pages) ? payload.query.pages : [];
  const entries = logic.normalizePages(payload, source);
  const semanticTypeCounts = {};
  let anonymizedClues = 0;
  for (const entry of entries) {
    semanticTypeCounts[entry.semanticType] = (semanticTypeCounts[entry.semanticType] || 0) + 1;
    if (logic.anonymizeIntroduction(entry.plainIntroduction, {
      language: entry.language,
      redaction: "⬛",
      terms: entry.maskTerms,
      title: entry.title,
    })) anonymizedClues += 1;
  }

  const randomApi = Object.freeze({
    uintBelow(maximum) {
      if (!Number.isSafeInteger(maximum) || maximum < 1) {
        throw new Error("invalid random upper bound");
      }
      return crypto.randomInt(maximum);
    },
  });
  let formedRound = false;
  let roundSemanticType = null;
  let outcome = "no_clue";
  try {
    const round = logic.createRound(entries, { randomApi, redaction: "⬛" });
    formedRound = true;
    roundSemanticType = round.semanticType;
    outcome = "formed";
  } catch (error) {
    if (error?.code !== "no_clue") throw error;
  }

  console.log(JSON.stringify({
    source: sourceId,
    outcome,
    elapsed_ms: Math.round(performance.now() - startedAt),
    response_chars: body.length,
    returned_pages: rawPages.length,
    normalized_entries: entries.length,
    anonymized_clues: anonymizedClues,
    semantic_type_counts: semanticTypeCounts,
    formed_round: formedRound,
    round_semantic_type: roundSemanticType,
  }));
}

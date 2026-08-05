#!/usr/bin/env node

// Explicit one-round Chromium audit. It does not retry, persist external data,
// or print artwork titles/URLs.

import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";

if (!process.argv.includes("--run-live")) {
  throw new Error("Refusing external requests without --run-live");
}

const scriptPath = fileURLToPath(new URL("../../assets/js/art-glimpse.js", import.meta.url));
const copy = {
  start: "开始一题", again: "再来一题", retry: "重试",
  loading_metadata: "正在取得馆藏……", loading_images: "正在加载图片……",
  choice_label: "选择候选作品 {number}", choice_image_alt: "候选作品 {number}",
  correct: "配对成功！", incorrect: "没猜中。", correct_badge: "答案",
  selected_badge: "你的选择", no_question: "本次不能成题。",
  network_error: "元数据失败。", image_error: "图片失败。", random_error: "随机源失败。",
  unknown_artist: "作者不详", unknown_date: "年代不详",
  source_label: "在克利夫兰艺术博物馆查看《{title}》",
};
const config = {
  endpoint: "https://openaccess-api.clevelandart.org/api/artworks/",
  api_host: "openaccess-api.clevelandart.org",
  image_host: "openaccess-cdn.clevelandart.org",
  artwork_hosts: ["clevelandart.org", "www.clevelandart.org"],
  license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
  open_access_url: "https://www.clevelandart.org/open-access",
  query: "landscape", artwork_type: "Painting", batch_size: 12,
  candidate_count: 4, safe_skip_max: 300, timeout_ms: 12000,
  image_timeout_ms: 10000, max_response_chars: 262144,
  max_image_bytes: 1200000, max_round_image_bytes: 4000000, copy,
};
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
  img{max-width:100%;width:100%}.choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));max-width:46rem}
</style></head><body><section data-art-glimpse>
  <div data-art-glimpse-enhanced hidden><div data-art-glimpse-interactive hidden>
    <button data-art-glimpse-start>开始一题</button>
    <div data-art-glimpse-round hidden><section data-art-glimpse-clue tabindex="-1"><p data-art-glimpse-clue-title></p><p data-art-glimpse-clue-maker></p><p data-art-glimpse-clue-date></p></section><div class="choices" data-art-glimpse-choices></div></div>
    <p data-art-glimpse-status></p>
    <section data-art-glimpse-reveal hidden><p data-art-glimpse-title></p><p data-art-glimpse-maker></p><p data-art-glimpse-date></p><a data-art-glimpse-source></a></section>
  </div></div><script type="application/json" data-art-glimpse-config>${JSON.stringify(config)}</script>
</section></body></html>`;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const requests = [];
const responses = [];
page.on("request", (request) => {
  const host = new URL(request.url()).hostname;
  if ([config.api_host, config.image_host].includes(host)) {
    requests.push({ host, method: request.method(), referer: request.headers().referer || "" });
  }
});
page.on("response", (response) => {
  const host = new URL(response.url()).hostname;
  if ([config.api_host, config.image_host].includes(host)) {
    responses.push({
      host,
      status: response.status(),
      contentType: response.headers()["content-type"] || "",
      contentLength: Number.parseInt(response.headers()["content-length"] || "0", 10),
    });
  }
});

const startedAt = performance.now();
let result;
try {
  await page.setContent(html);
  await page.addScriptTag({ path: scriptPath });
  await page.locator("[data-art-glimpse-start]").click();
  await page.waitForFunction(() => {
    const state = document.querySelector("[data-art-glimpse]")?.dataset.artGlimpseState;
    return state === "active" || state === "error";
  }, null, { timeout: 25000 });
  const state = await page.locator("[data-art-glimpse]").getAttribute("data-art-glimpse-state");
  const imageResponses = responses.filter((item) => item.host === config.image_host);
  result = {
    state,
    elapsed_ms: Math.round(performance.now() - startedAt),
    metadata_requests: requests.filter((item) => item.host === config.api_host).length,
    image_requests: requests.filter((item) => item.host === config.image_host).length,
    metadata_statuses: responses.filter((item) => item.host === config.api_host).map((item) => item.status),
    image_statuses: imageResponses.map((item) => item.status),
    image_content_types_valid: imageResponses.every((item) => item.contentType.toLowerCase().startsWith("image/jpeg")),
    declared_image_bytes: imageResponses.reduce((sum, item) => sum + item.contentLength, 0),
    image_referrers_empty: requests.filter((item) => item.host === config.image_host).every((item) => !item.referer),
    rendered_choices: await page.locator("[data-art-glimpse-choices] button").count(),
    clue_fields_filled: await page.locator("[data-art-glimpse-clue-title], [data-art-glimpse-clue-maker], [data-art-glimpse-clue-date]").evaluateAll((nodes) => nodes.length === 3 && nodes.every((node) => node.textContent.trim().length > 0)),
    canvas_count: await page.locator("canvas").count(),
    horizontal_overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  };
  if (process.argv.includes("--screenshot")) {
    await page.screenshot({
      fullPage: true,
      path: "output/playwright/art-glimpse-live-sensitive-audit.png",
    });
  }
} catch (_error) {
  result = {
    state: "audit_error",
    elapsed_ms: Math.round(performance.now() - startedAt),
    metadata_requests: requests.filter((item) => item.host === config.api_host).length,
    image_requests: requests.filter((item) => item.host === config.image_host).length,
  };
} finally {
  await browser.close();
}

process.stdout.write(`${JSON.stringify(result)}\n`);

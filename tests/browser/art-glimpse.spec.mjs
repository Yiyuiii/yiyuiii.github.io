import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const scriptPath = fileURLToPath(new URL("../../assets/js/art-glimpse.js", import.meta.url));
const API_HOST = "openaccess-api.clevelandart.org";
const IMAGE_HOST = "openaccess-cdn.clevelandart.org";
const EXTERNAL_HOSTS = new Set([API_HOST, IMAGE_HOST, "attacker.invalid"]);
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABAf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=",
  "base64",
);

const copy = {
  zh: {
    instructions: "先看一块放大的画面局部，再从四幅完整馆藏图中找出它来自哪一幅。",
    privacy: "点击开始后向克利夫兰艺术博物馆请求一次元数据和四张图片。",
    start: "开始一题",
    again: "再来一题",
    retry: "重试",
    loading_metadata: "正在取得馆藏……",
    loading_images: "正在加载四幅馆藏图……",
    prompt: "这块局部来自哪一幅？",
    options_label: "四幅候选馆藏图",
    choice_label: "选择候选作品 {number}",
    choice_image_alt: "候选作品 {number}",
    correct: "找到了！",
    incorrect: "没猜中；正确作品已标出。",
    correct_badge: "答案",
    selected_badge: "你的选择",
    no_question: "本次小批结果不足以组成四幅合格作品；可由你主动重试。",
    network_error: "暂时没能取得馆藏资料，请稍后重试。",
    image_error: "本题的馆藏图片没有全部载入；可由你主动重试。",
    random_error: "当前浏览器无法提供可靠随机数，暂时不能出题。",
    reveal_label: "本题作品",
    unknown_artist: "作者不详",
    unknown_date: "年代不详",
    source_label: "在克利夫兰艺术博物馆查看《{title}》",
    attribution: "元数据与图片由克利夫兰艺术博物馆开放获取计划提供。",
    license_label: "查看 CC0 1.0 公共领域贡献声明",
    open_access_label: "查看博物馆开放获取说明",
    no_js: "此小玩意需要 JavaScript；未启用时不会连接博物馆接口或图片服务。",
  },
  en: {
    instructions: "Study one enlarged detail, then find its full image.",
    privacy: "Starting sends one metadata request and four image requests.",
    start: "Start a round",
    again: "Another round",
    retry: "Try again",
    loading_metadata: "Retrieving the collection…",
    loading_images: "Loading four images…",
    prompt: "Which full image contains this detail?",
    options_label: "Four candidate museum images",
    choice_label: "Choose candidate artwork {number}",
    choice_image_alt: "Candidate artwork {number}",
    correct: "You found it!",
    incorrect: "Not quite; the correct artwork is marked.",
    correct_badge: "Answer",
    selected_badge: "Your choice",
    no_question: "This batch did not contain four eligible artworks.",
    network_error: "The collection data could not be retrieved.",
    image_error: "Not all four museum images loaded.",
    random_error: "Secure randomness is unavailable.",
    reveal_label: "Artwork in this round",
    unknown_artist: "Unknown artist",
    unknown_date: "Date unknown",
    source_label: "Open “{title}” at the Cleveland Museum of Art",
    attribution: "Metadata and images come from CMA Open Access.",
    license_label: "Read CC0 1.0",
    open_access_label: "Read the Open Access statement",
    no_js: "This toy needs JavaScript and otherwise makes no requests.",
  },
};

const runtimeConfig = (language = "zh", overrides = {}) => ({
  endpoint: "https://openaccess-api.clevelandart.org/api/artworks/",
  api_host: API_HOST,
  image_host: IMAGE_HOST,
  artwork_hosts: ["clevelandart.org", "www.clevelandart.org"],
  license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
  open_access_url: "https://www.clevelandart.org/open-access",
  query: "landscape",
  artwork_type: "Painting",
  batch_size: 12,
  candidate_count: 4,
  safe_skip_max: 300,
  timeout_ms: 3000,
  image_timeout_ms: 3000,
  max_response_chars: 262144,
  max_image_bytes: 1200000,
  max_round_image_bytes: 4000000,
  page_lang: language,
  copy: copy[language],
  ...overrides,
});

const fixture = (language = "zh", overrides = {}) => {
  const config = runtimeConfig(language, overrides);
  return `<!doctype html><html lang="${language}"><head><style>
    .choices { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); }
    .choices img, canvas { width:100%; max-width:100%; }
    @media(max-width:359px){.choices{grid-template-columns:1fr}}
  </style></head><body>
    <section data-art-glimpse>
      <p>${config.copy.instructions}</p>
      <div data-art-glimpse-enhanced hidden>
        <p>${config.copy.privacy}</p>
        <div data-art-glimpse-interactive hidden>
          <button data-art-glimpse-start>${config.copy.start}</button>
          <div data-art-glimpse-round hidden>
            <figure data-art-glimpse-clue tabindex="-1"><canvas data-art-glimpse-clue-canvas width="960" height="420" aria-hidden="true"></canvas><figcaption>${config.copy.prompt}</figcaption></figure>
            <div class="choices" data-art-glimpse-choices role="group" aria-label="${config.copy.options_label}"></div>
          </div>
          <p data-art-glimpse-status aria-live="polite"></p>
          <section data-art-glimpse-reveal hidden><h4>${config.copy.reveal_label}</h4>
            <p data-art-glimpse-title></p><p data-art-glimpse-maker></p><p data-art-glimpse-date></p>
            <a data-art-glimpse-source></a>
            <a data-license href="${config.license_url}">${config.copy.license_label}</a>
          </section>
        </div>
      </div>
      <noscript><p data-no-js>${config.copy.no_js}</p></noscript>
      <script type="application/json" data-art-glimpse-config>${JSON.stringify(config)}</script>
    </section>
  </body></html>`;
};

const artwork = (id, overrides = {}) => ({
  id,
  accession_number: `2000.${id}`,
  title: `Official Landscape ${id}`,
  creation_date: `18${id}0`,
  creators: [{ description: `Artist ${id}` }],
  images: { web: {
    url: `https://${IMAGE_HOST}/2000.${id}/2000.${id}_web.jpg`,
    filesize: "500000",
    width: "900",
    height: "700",
  } },
  url: `https://clevelandart.org/art/2000.${id}`,
  share_license_status: "CC0",
  type: "Painting",
  department: "European Painting and Sculpture",
  description: "A quiet landscape with trees and distant hills.",
  ...overrides,
});
const payload = (records = Array.from({ length: 12 }, (_, index) => artwork(index + 1))) => ({
  info: { total: 461 }, data: records,
});

const install = async (page, language = "zh", overrides = {}) => {
  await page.setContent(fixture(language, overrides));
  await page.addScriptTag({ path: scriptPath });
};

const observeExternal = (page) => {
  const requests = [];
  page.on("request", (request) => {
    if (EXTERNAL_HOSTS.has(new URL(request.url()).hostname)) requests.push(request);
  });
  return requests;
};

const routeSuccess = async (page, records) => {
  await page.route(`https://${API_HOST}/api/artworks/**`, (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify(payload(records)),
  }));
  await page.route(`https://${IMAGE_HOST}/**`, (route) => route.fulfill({
    contentType: "image/jpeg",
    body: JPEG,
  }));
};

test("one explicit start makes one filtered metadata GET and four unique image GETs", async ({ page }) => {
  const requests = observeExternal(page);
  await routeSuccess(page);
  await install(page);
  expect(requests).toEqual([]);

  await page.getByRole("button", { name: "开始一题" }).click();
  await expect(page.locator("[data-art-glimpse-choices] button")).toHaveCount(4);
  await expect(page.locator("[data-art-glimpse-clue]")).toBeFocused();
  await expect(page.locator("[data-art-glimpse-clue-canvas]")).toHaveAttribute("width", "960");
  await expect(page.locator("[data-art-glimpse-clue-canvas]")).toHaveAttribute("height", "420");

  const metadata = requests.filter((request) => new URL(request.url()).hostname === API_HOST);
  const images = requests.filter((request) => new URL(request.url()).hostname === IMAGE_HOST);
  expect(metadata).toHaveLength(1);
  expect(images).toHaveLength(4);
  expect(new Set(images.map((request) => request.url())).size).toBe(4);
  expect(requests.some((request) => request.method() === "OPTIONS")).toBe(false);
  const url = new URL(metadata[0].url());
  expect(url.searchParams.get("q")).toBe("landscape");
  expect(url.searchParams.has("cc0")).toBe(true);
  expect(url.searchParams.get("has_image")).toBe("1");
  expect(url.searchParams.get("type")).toBe("Painting");
  expect(url.searchParams.get("limit")).toBe("12");
  expect(Number(url.searchParams.get("skip"))).toBeGreaterThanOrEqual(0);
  expect(Number(url.searchParams.get("skip"))).toBeLessThanOrEqual(300);
  expect(metadata[0].headers().accept).toBe("application/json");
  for (const request of images) expect(request.headers().referer).toBeUndefined();
  expect(await page.evaluate(() => {
    const canvas = document.querySelector("[data-art-glimpse-clue-canvas]");
    try {
      canvas.toDataURL();
      return false;
    } catch (error) {
      return error?.name === "SecurityError";
    }
  })).toBe(true);
});

test("answering reveals the official un-translated title safely and marks the answer", async ({ page }) => {
  const hostile = "https://attacker.invalid/glimpse-probe";
  const records = Array.from({ length: 12 }, (_, index) => artwork(index + 1, {
    title: `<img src="${hostile}"> Official Landscape ${index + 1}`,
  }));
  const requests = observeExternal(page);
  await routeSuccess(page, records);
  await page.route("https://attacker.invalid/**", (route) => route.abort());
  await install(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  await page.locator("[data-art-glimpse-choices] button").first().click();
  await expect(page.locator("[data-art-glimpse-reveal]")).toBeVisible();
  await expect(page.locator("[data-art-glimpse-title]")).toContainText("Official Landscape");
  await expect(page.locator("[data-art-glimpse-title] img")).toHaveCount(0);
  await expect(page.locator('[data-art-glimpse-choices] button[data-result="correct"]')).toHaveCount(1);
  await expect(page.locator("[data-art-glimpse-source]")).toHaveAttribute(
    "href", /^https:\/\/(?:www\.)?clevelandart\.org\/art\//,
  );
  expect(requests.some((request) => new URL(request.url()).hostname === "attacker.invalid")).toBe(false);
});

test("restricted and sensitive records cannot fill a round or trigger images", async ({ page }) => {
  const requests = observeExternal(page);
  const records = [
    artwork(1), artwork(2), artwork(3),
    artwork(4, { title: "Nude in a Landscape" }),
    artwork(5, { share_license_status: "Copyrighted" }),
  ];
  await routeSuccess(page, records);
  await install(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  await expect(page.locator("[data-art-glimpse-status]")).toHaveText(copy.zh.no_question);
  expect(requests.filter((request) => new URL(request.url()).hostname === API_HOST)).toHaveLength(1);
  expect(requests.filter((request) => new URL(request.url()).hostname === IMAGE_HOST)).toHaveLength(0);
});

test("metadata failure is explicit and never retries or requests images", async ({ page }) => {
  const requests = observeExternal(page);
  await page.route(`https://${API_HOST}/api/artworks/**`, (route) => route.fulfill({
    status: 503, body: "unavailable",
  }));
  await install(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  await expect(page.locator("[data-art-glimpse-status]")).toHaveText(copy.zh.network_error);
  await page.waitForTimeout(50);
  expect(requests).toHaveLength(1);
});

test("one failed image ends the round without another metadata batch or substitute image", async ({ page }) => {
  const requests = observeExternal(page);
  await page.route(`https://${API_HOST}/api/artworks/**`, (route) => route.fulfill({
    contentType: "application/json", body: JSON.stringify(payload()),
  }));
  let imageNumber = 0;
  await page.route(`https://${IMAGE_HOST}/**`, (route) => {
    imageNumber += 1;
    return imageNumber === 1
      ? route.fulfill({ status: 503, body: "unavailable" })
      : route.fulfill({ contentType: "image/jpeg", body: JPEG });
  });
  await install(page);

  await page.getByRole("button", { name: "开始一题" }).click();
  await expect(page.locator("[data-art-glimpse-status]")).toHaveText(copy.zh.image_error);
  await page.waitForTimeout(50);
  expect(requests.filter((request) => new URL(request.url()).hostname === API_HOST)).toHaveLength(1);
  expect(requests.filter((request) => new URL(request.url()).hostname === IMAGE_HOST).length).toBeLessThanOrEqual(4);
  await expect(page.locator("[data-art-glimpse-round]")).toBeHidden();
});

test("an untrusted endpoint fails closed before enhancement", async ({ page }) => {
  const requests = observeExternal(page);
  await install(page, "zh", { endpoint: "https://attacker.invalid/api" });
  await expect(page.locator("[data-art-glimpse-interactive]")).toBeHidden();
  await expect(page.locator("[data-art-glimpse]")).not.toHaveAttribute("data-art-glimpse-ready", "true");
  expect(requests).toEqual([]);
});

test("no-JavaScript fallback makes no request", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const requests = observeExternal(page);
  await page.setContent(fixture("zh"));
  await expect(page.locator("[data-no-js]")).toContainText("不会连接博物馆");
  await expect(page.locator("[data-art-glimpse-enhanced]")).toBeHidden();
  expect(requests).toEqual([]);
  await context.close();
});

test("320px layout has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await routeSuccess(page);
  await install(page, "en");
  await page.getByRole("button", { name: "Start a round" }).click();
  await expect(page.locator("[data-art-glimpse-choices] button")).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

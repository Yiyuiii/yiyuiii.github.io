import { expect, test } from "@playwright/test";

const runtimePaths = new Set([
  "/assets/js/acg-relation-quiz-logic.js",
  "/assets/js/acg-relation-quiz.js",
  "/assets/js/art-glimpse.js",
  "/assets/js/moegirl-quiz.js",
  "/assets/js/toy-challenge-history.js",
  "/assets/js/toy-challenges.js",
  "/assets/js/toy-codebreaker.js",
  "/assets/js/toy-color-challenge.js",
  "/assets/js/toy-generators.js",
  "/assets/js/toy-lights-out.js",
  "/assets/js/toy-make-24.js",
  "/assets/js/toy-random.js",
]);

const pathname = (url) => new URL(url).pathname;

const openToy = async (page, id) => {
  const disclosure = page.locator(`#${id}`);
  await disclosure.locator(":scope > summary").click();
  await expect(disclosure).toHaveAttribute("data-toy-load-state", "ready");
  return disclosure;
};

test("cold toy indexes request each fixed local runtime only when first opened", async ({ page }) => {
  const localScripts = [];
  const externalRequests = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === new URL(page.url()).origin && request.resourceType() === "script") {
      localScripts.push(url.pathname);
    } else if ([
      "zh.moegirl.org.cn",
      "openaccess-api.clevelandart.org",
      "openaccess-cdn.clevelandart.org",
      "graphql.anilist.co",
    ].includes(url.hostname)) {
      externalRequests.push(request.url());
    }
  });

  await page.goto("/toys/");
  expect(localScripts.filter((path) => runtimePaths.has(path))).toEqual([]);

  const expectedNewPaths = [
    ["moegirl-quiz", ["/assets/js/moegirl-quiz.js"]],
    ["art-glimpse", ["/assets/js/art-glimpse.js"]],
    ["anilist-role-quiz", [
      "/assets/js/acg-relation-quiz-logic.js",
      "/assets/js/acg-relation-quiz.js",
    ]],
    ["color-challenge", ["/assets/js/toy-random.js", "/assets/js/toy-color-challenge.js"]],
    ["ten-second", ["/assets/js/toy-challenge-history.js", "/assets/js/toy-challenges.js"]],
    ["reaction-time", []],
    ["codebreaker", ["/assets/js/toy-codebreaker.js"]],
    ["make-24", ["/assets/js/toy-make-24.js"]],
    ["lights-out", ["/assets/js/toy-lights-out.js"]],
    ["random-password", ["/assets/js/toy-generators.js"]],
    ["random-number", []],
  ];
  let runtimeCount = 0;
  for (const [id, expected] of expectedNewPaths) {
    const disclosure = await openToy(page, id);
    const loaded = localScripts.filter((path) => runtimePaths.has(path));
    expect(loaded.slice(runtimeCount)).toEqual(expected);
    runtimeCount = loaded.length;
    await disclosure.locator(":scope > summary").click();
  }

  expect(externalRequests).toEqual([]);
  expect(localScripts.filter((path) => path === "/assets/js/toy-random.js")).toHaveLength(1);
  expect(localScripts.filter((path) => path === "/assets/js/toy-generators.js")).toHaveLength(1);
  expect(localScripts.filter((path) => path === "/assets/js/toy-challenges.js")).toHaveLength(1);
});

test("simultaneous disclosures share one dependency promise", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => {
    if (runtimePaths.has(pathname(request.url()))) requests.push(pathname(request.url()));
  });
  await page.goto("/en/toys/");
  await page.evaluate(() => {
    document.getElementById("color-challenge").open = true;
    document.getElementById("codebreaker").open = true;
  });
  await expect(page.locator("#color-challenge")).toHaveAttribute("data-toy-load-state", "ready");
  await expect(page.locator("#codebreaker")).toHaveAttribute("data-toy-load-state", "ready");

  expect(requests.filter((path) => path === "/assets/js/toy-random.js")).toHaveLength(1);
  expect(new Set(requests)).toEqual(new Set([
    "/assets/js/toy-random.js",
    "/assets/js/toy-color-challenge.js",
    "/assets/js/toy-codebreaker.js",
  ]));
});

test("a failed local runtime exposes a localized retry and then recovers", async ({ page }) => {
  let attempts = 0;
  await page.route("**/assets/js/toy-codebreaker.js*", async (route) => {
    attempts += 1;
    if (attempts === 1) await route.abort("failed");
    else await route.continue();
  });
  await page.goto("/en/toys/");
  const disclosure = page.locator("#codebreaker");
  await disclosure.locator(":scope > summary").click();
  await expect(disclosure).toHaveAttribute("data-toy-load-state", "error");
  await expect(disclosure.locator("[data-toy-loader-message]")).toHaveText(
    "This toy's local scripts could not be loaded.",
  );
  const retry = disclosure.locator("[data-toy-loader-retry]");
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(disclosure).toHaveAttribute("data-toy-load-state", "ready");
  await expect(disclosure.locator("[data-toy-loader-status]")).toBeHidden();
  await expect(disclosure.locator("[data-toy-codebreaker]")).toHaveAttribute("data-state", "playing");
  expect(attempts).toBe(2);
});

test("direct hashes open and initialize only their declared runtime chain", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => {
    if (runtimePaths.has(pathname(request.url()))) requests.push(pathname(request.url()));
  });
  await page.goto("/toys/#make-24");
  await expect(page.locator("#make-24")).toHaveAttribute("open", "");
  await expect(page.locator("#make-24")).toHaveAttribute("data-toy-load-state", "ready");
  expect(requests).toEqual([
    "/assets/js/toy-random.js",
    "/assets/js/toy-make-24.js",
  ]);
});

test("tampered disclosure dependencies cannot select an undeclared URL", async ({ page }) => {
  const externalScripts = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (request.resourceType() === "script" && url.origin !== new URL(page.url()).origin) {
      externalScripts.push(request.url());
    }
  });
  await page.goto("/toys/");
  await page.evaluate(() => {
    const disclosure = document.getElementById("random-number");
    disclosure.dataset.toyAssets = "https://example.com/hostile.js";
    disclosure.open = true;
  });
  await expect(page.locator("#random-number")).toHaveAttribute("data-toy-load-state", "error");
  expect(externalScripts).toEqual([]);
});

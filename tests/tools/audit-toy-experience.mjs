import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const TOYS = [
  ["moegirl-quiz", "萌娘百科猜猜"],
  ["art-glimpse", "名画猜猜"],
  ["anilist-role-quiz", "动画主角猜猜"],
  ["color-challenge", "色差挑战"],
  ["ten-second", "盲估十秒"],
  ["reaction-time", "反应时间"],
  ["codebreaker", "数字 Wordle"],
  ["make-24", "凑成 24"],
  ["lights-out", "翻灯"],
  ["random-password", "随机密码"],
  ["random-number", "随机数字"],
];
const ROUTES = [["zh", "/toys/"], ["en", "/en/toys/"]];
const VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
];
const THEMES = ["light", "dark"];
const MOTIONS = ["no-preference", "reduce"];
const EXTERNAL_HOSTS = new Set([
  "zh.moegirl.org.cn",
  "openaccess-api.clevelandart.org",
  "openaccess-cdn.clevelandart.org",
  "graphql.anilist.co",
]);
const args = process.argv.slice(2);
const valueAfter = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};
const baseURL = valueAfter("--base-url", process.env.SITE_URL || "http://localhost:62091");
const outputArgument = valueAfter("--out-dir", "");
if (!outputArgument) throw new Error("--out-dir must be a repository-external directory");
const outDir = path.resolve(outputArgument);
const issues = [];
const matrix = [];
const performanceMetrics = [];
const screenshots = new Map();
const pageScreenshots = new Map();

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");
const issue = (scope, kind, detail) => issues.push({ scope, kind, detail });

const newContext = async (browser, { viewport, theme, motion }) => {
  const context = await browser.newContext({
    baseURL,
    viewport,
    reducedMotion: motion,
    colorScheme: theme,
  });
  await context.addInitScript((selectedTheme) => {
    localStorage.setItem("yiyuiii.theme.v1", selectedTheme);
  }, theme);
  return context;
};

const inspectOpenToy = (id) => {
  const disclosure = document.getElementById(id);
  const body = disclosure.querySelector(":scope > .toy-entry__body");
  const rect = body.getBoundingClientRect();
  const controls = [...disclosure.querySelectorAll("button, input, select, textarea")]
    .filter((node) => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return box.width > 0 && box.height > 0 && style.visibility !== "hidden";
    })
    .map((node) => {
      const box = node.getBoundingClientRect();
      const label = node.labels?.[0]?.textContent?.trim()
        || node.getAttribute("aria-label")
        || node.textContent?.trim()
        || node.getAttribute("title")
        || "";
      return {
        tag: node.tagName.toLowerCase(),
        type: node.getAttribute("type") || "",
        width: Math.round(box.width * 10) / 10,
        height: Math.round(box.height * 10) / 10,
        named: Boolean(label),
      };
    });
  const liveRegions = disclosure.querySelectorAll('[role="status"], [aria-live]');
  const animated = [...disclosure.querySelectorAll("*")].filter((node) => {
    const style = getComputedStyle(node);
    return style.animationName !== "none" && style.animationDuration !== "0s";
  }).length;
  return {
    bodyWithinViewport: rect.left >= -0.5 && rect.right <= innerWidth + 0.5,
    documentOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    unnamedControls: controls.filter(({ named }) => !named),
    undersizedControls: controls.filter(({ type, width, height }) => (
      type !== "checkbox" && type !== "radio" && (width < 24 || height < 24)
    )),
    liveRegionCount: liveRegions.length,
    animated,
    controlCount: controls.length,
    minControlHeight: controls.length ? Math.min(...controls.map(({ height }) => height)) : null,
    activeIsSummary: document.activeElement === disclosure.querySelector(":scope > summary"),
    theme: document.documentElement.dataset.theme,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
};

const runMatrix = async (browser) => {
  for (const [language, route] of ROUTES) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        for (const motion of MOTIONS) {
          const config = `${language}/${viewport.width}/${theme}/${motion}`;
          const context = await newContext(browser, { viewport, theme, motion });
          const page = await context.newPage();
          const runtimeErrors = [];
          const externalRequests = [];
          page.on("pageerror", (error) => runtimeErrors.push(error.message));
          page.on("console", (message) => {
            if (message.type() === "error") runtimeErrors.push(message.text());
          });
          page.on("request", (request) => {
            const url = new URL(request.url());
            if (EXTERNAL_HOSTS.has(url.hostname)) externalRequests.push(request.url());
          });
          try {
            await page.goto(route, { waitUntil: "load" });
            if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) {
              issue(config, "collapsed-overflow", "折叠页面发生横向溢出");
            }
            if (language === "zh" && viewport.width === 1280 && theme === "light" && motion === "no-preference") {
              pageScreenshots.set("desktop", await page.screenshot({ fullPage: true }));
            }
            if (language === "en" && viewport.width === 390 && theme === "dark" && motion === "no-preference") {
              pageScreenshots.set("mobile-dark", await page.screenshot({ fullPage: true }));
            }
            for (const [id] of TOYS) {
              const disclosure = page.locator(`#${id}`);
              const summary = disclosure.locator(":scope > summary");
              await summary.focus();
              await page.keyboard.press("Enter");
              await disclosure.waitFor({ state: "visible" });
              await page.waitForFunction((toyId) => (
                document.getElementById(toyId)?.dataset.toyLoadState === "ready"
              ), id);
              const result = await page.evaluate(inspectOpenToy, id);
              matrix.push({ language, viewport: viewport.width, theme, motion, id, ...result });
              if (!result.activeIsSummary) issue(`${config}/${id}`, "keyboard-focus", "键盘展开后焦点未留在 summary");
              if (!result.bodyWithinViewport || result.documentOverflow) issue(`${config}/${id}`, "overflow", "展开后发生横向溢出");
              if (result.unnamedControls.length) issue(`${config}/${id}`, "accessible-name", JSON.stringify(result.unnamedControls));
              if (result.undersizedControls.length) issue(`${config}/${id}`, "target-size", JSON.stringify(result.undersizedControls));
              if (!result.liveRegionCount) issue(`${config}/${id}`, "missing-status", "没有可播报的状态区域");
              if (result.theme !== theme) issue(`${config}/${id}`, "theme", `实际主题 ${result.theme}`);
              if (result.reducedMotion !== (motion === "reduce")) issue(`${config}/${id}`, "motion", "媒体查询状态不匹配");
              if (motion === "reduce" && result.animated) issue(`${config}/${id}`, "motion", `仍有 ${result.animated} 个动画元素`);
              if (language === "zh" && viewport.width === 390 && theme === "light" && motion === "no-preference") {
                screenshots.set(id, await disclosure.screenshot({ animations: "disabled" }));
              }
              await page.keyboard.press("Enter");
            }
            if (externalRequests.length) issue(config, "external-request", externalRequests.join("\n"));
            if (runtimeErrors.length) issue(config, "runtime-error", runtimeErrors.join("\n"));
          } catch (error) {
            issue(config, "audit-exception", error.stack || error.message);
          } finally {
            await context.close();
          }
        }
      }
    }
  }
};

const runMultipleOpen = async (browser) => {
  for (const [language, route] of ROUTES) {
    for (const viewport of VIEWPORTS) {
      const context = await newContext(browser, { viewport, theme: "light", motion: "reduce" });
      const page = await context.newPage();
      const scope = `multiple/${language}/${viewport.width}`;
      try {
        await page.goto(route);
        await page.evaluate(() => {
          document.querySelectorAll("[data-toy-disclosure]").forEach((node) => { node.open = true; });
        });
        await page.waitForFunction(() => [...document.querySelectorAll("[data-toy-disclosure]")]
          .every((node) => node.dataset.toyLoadState === "ready"));
        const result = await page.evaluate(() => ({
          open: document.querySelectorAll("details[data-toy-disclosure][open]").length,
          ready: document.querySelectorAll('[data-toy-disclosure][data-toy-load-state="ready"]').length,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
        }));
        if (result.open !== TOYS.length || result.ready !== TOYS.length) issue(scope, "multiple-open", JSON.stringify(result));
        if (result.overflow) issue(scope, "overflow", "十一项同时展开时发生横向溢出");
      } catch (error) {
        issue(scope, "audit-exception", error.stack || error.message);
      } finally {
        await context.close();
      }
    }
  }
};

const runPerformance = async (browser) => {
  for (const [language, route] of ROUTES) {
    for (const [id, title] of TOYS) {
      const context = await newContext(browser, {
        viewport: { width: 390, height: 844 },
        theme: "light",
        motion: "reduce",
      });
      const page = await context.newPage();
      const localScripts = [];
      const external = [];
      let opening = false;
      page.on("response", async (response) => {
        if (!opening || response.request().resourceType() !== "script") return;
        const url = new URL(response.url());
        if (url.origin === new URL(baseURL).origin) {
          const header = Number(response.headers()["content-length"] || 0);
          localScripts.push({ path: url.pathname, bytes: header });
        }
      });
      page.on("request", (request) => {
        if (!opening) return;
        const url = new URL(request.url());
        if (url.origin !== new URL(baseURL).origin) external.push(request.url());
      });
      try {
        await page.goto(route);
        opening = true;
        const started = globalThis.performance.now();
        const disclosure = page.locator(`#${id}`);
        await disclosure.locator(":scope > summary").click();
        await page.waitForFunction((toyId) => (
          document.getElementById(toyId)?.dataset.toyLoadState === "ready"
        ), id);
        const initMs = Math.round((globalThis.performance.now() - started) * 10) / 10;
        await page.waitForTimeout(25);
        performanceMetrics.push({
          language,
          id,
          title,
          initMs,
          localRequests: localScripts,
          localBytes: localScripts.reduce((sum, item) => sum + item.bytes, 0),
          externalRequests: external,
        });
        if (external.length) issue(`performance/${language}/${id}`, "external-request", external.join("\n"));
      } catch (error) {
        issue(`performance/${language}/${id}`, "audit-exception", error.stack || error.message);
      } finally {
        await context.close();
      }
    }
  }
};

const renderReport = (audit) => {
  const status = issues.length ? `${issues.length} 项自动检查未通过` : "全部自动检查通过";
  const perfRows = performanceMetrics.map((item) => `
    <tr><td>${item.language}</td><td>${escapeHtml(item.title)}</td><td>${item.initMs}</td>
    <td>${item.localBytes.toLocaleString()}</td><td><code>${escapeHtml(item.localRequests.map(({ path: itemPath }) => itemPath.replace("/assets/js/", "")).join(" → "))}</code></td>
    <td>${item.externalRequests.length}</td></tr>`).join("");
  const issueRows = issues.length ? issues.map((item) => `
    <tr><td><code>${escapeHtml(item.scope)}</code></td><td>${escapeHtml(item.kind)}</td><td>${escapeHtml(item.detail)}</td></tr>`).join("") : '<tr><td colspan="3">无</td></tr>';
  const shots = TOYS.map(([id, title]) => {
    const data = screenshots.get(id)?.toString("base64") || "";
    return `<figure><img src="data:image/png;base64,${data}" alt="${escapeHtml(title)}在 390px 明亮主题下展开的截图"><figcaption>${escapeHtml(title)}</figcaption></figure>`;
  }).join("");
  const desktop = pageScreenshots.get("desktop")?.toString("base64") || "";
  const mobileDark = pageScreenshots.get("mobile-dark")?.toString("base64") || "";
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M2 小玩意体验审阅</title>
  <style>:root{color-scheme:light dark;--bg:#f6f3fb;--card:#fff;--ink:#282333;--muted:#696174;--line:#d8d0df;--accent:#7552a3}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:32px 20px 72px}h1{font-size:clamp(1.8rem,5vw,3rem);line-height:1.15}h2{margin-top:2.5rem}.summary,.decision,details{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}.pass{color:#176b45;font-weight:800}.fail{color:#a23636;font-weight:800}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}figure img{display:block;width:100%;height:auto}figcaption{padding:10px 14px;color:var(--muted)}table{width:100%;border-collapse:collapse;background:var(--card);font-size:.88rem}th,td{padding:8px;border:1px solid var(--line);text-align:left;vertical-align:top}code{overflow-wrap:anywhere}label{display:block;margin:.45rem 0}.decision{margin:1rem 0}.decision h3{margin-top:0}textarea{width:100%;min-height:8rem;padding:10px}.page-shot{max-height:580px;object-fit:contain;object-position:top;background:#ddd}@media(max-width:600px){main{padding-inline:12px}.table-wrap{overflow-x:auto}}</style></head><body><main>
  <p>M0–M2 阶段审阅 · 2026-08-07</p><h1>小玩意页：按需加载与体验矩阵</h1>
  <section class="summary"><h2>机器已经替你过滤的内容</h2><p class="${issues.length ? "fail" : "pass"}">${status}</p><ul><li>24 种页面环境：中英双语 × 320/390/1280 × 明暗主题 × 普通/减少动效。</li><li>264 次逐项键盘展开；检查焦点、横向溢出、控件名称、24px 最小目标、状态区与主题。</li><li>6 种十一项同时展开环境；22 次逐项目冷启动测量。</li><li>仅展开三个联网问答时，第三方请求应为 0。</li></ul><p>完整机器结果嵌入本报告生成时对应的 JSON；本页只把仍需人判断的密度、分组和展开策略留下。</p></section>
  <h2>页面全貌</h2><div class="grid"><figure><img class="page-shot" src="data:image/png;base64,${desktop}" alt="中文 1280px 明亮主题折叠页面"><figcaption>中文 · 1280px · 明亮</figcaption></figure><figure><img class="page-shot" src="data:image/png;base64,${mobileDark}" alt="英文 390px 暗色主题折叠页面"><figcaption>英文 · 390px · 暗色</figcaption></figure></div>
  <h2>逐项目冷启动</h2><p>耗时是本机 loopback 预览中，从点击 summary 到组件依赖链完成的墙钟时间；用于发现相对异常，不代表公网延迟。字节数为本次新请求的本站脚本原始传输大小。</p><div class="table-wrap"><table><thead><tr><th>语言</th><th>项目</th><th>初始化 ms</th><th>本站 bytes</th><th>首次新增脚本</th><th>站外请求</th></tr></thead><tbody>${perfRows}</tbody></table></div>
  <h2>自动检查明细</h2><div class="table-wrap"><table><thead><tr><th>范围</th><th>类型</th><th>详情</th></tr></thead><tbody>${issueRows}</tbody></table></div>
  <h2>390px 展开截图</h2><div class="grid">${shots}</div>
  <h2>只需要你判断的三件事</h2>
  <section class="decision"><h3>1. 信息密度</h3><label><input type="radio" name="density" value="保持"> 保持当前密度</label><label><input type="radio" name="density" value="更紧凑"> summary 与说明更紧凑</label><label><input type="radio" name="density" value="更舒展"> 增加留白与分隔</label></section>
  <section class="decision"><h3>2. 分组与顺序</h3><label><input type="radio" name="order" value="保持"> 保持当前四组和顺序</label><label><input type="radio" name="order" value="本地优先"> 把纯本地项目提前</label><label><input type="radio" name="order" value="短玩法优先"> 把最短即玩项目提前</label></section>
  <section class="decision"><h3>3. 同时展开</h3><label><input type="radio" name="open" value="保持多开"> 保持可同时展开多项</label><label><input type="radio" name="open" value="同组单开"> 同一分组只保留一项展开</label><label><input type="radio" name="open" value="全页单开"> 全页只保留一项展开</label></section>
  <section class="summary"><h2>代码抽取判断</h2><p>本轮只比较相同生命周期：盲估十秒与反应时间已经共享随机数、历史和挑战控制器；两个生成器已经共享随机数与生成器控制器。其余项目的初始化、状态机和外部边界不同，没有证据支持再抽一层通用小游戏框架，因此 M2 不做宽泛重构。</p><p><strong>M3 未开始：</strong>本报告不新增小游戏，也不预设原型方向。</p></section>
  <h2>可复制回复</h2><button id="compose" type="button">整理我的选择</button><textarea id="reply" aria-label="选择摘要" placeholder="点上面的选项后，点击“整理我的选择”"></textarea>
  <script>document.getElementById('compose').addEventListener('click',()=>{const pick=n=>document.querySelector('input[name="'+n+'"]:checked')?.value||'未选择';document.getElementById('reply').value='M2 审阅：\n1. 信息密度：'+pick('density')+'\n2. 分组与顺序：'+pick('order')+'\n3. 同时展开：'+pick('open');});</script>
  </main></body></html>`;
};

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "chromium", headless: true });
try {
  await runMatrix(browser);
  await runMultipleOpen(browser);
  await runPerformance(browser);
} finally {
  await browser.close();
}
const audit = {
  generatedAt: new Date().toISOString(),
  baseURL,
  matrixCases: matrix.length,
  configurations: ROUTES.length * VIEWPORTS.length * THEMES.length * MOTIONS.length,
  multipleOpenCases: ROUTES.length * VIEWPORTS.length,
  performanceCases: performanceMetrics.length,
  issues,
  matrix,
  performance: performanceMetrics,
};
const screenshotDir = path.join(outDir, "screenshots");
await mkdir(screenshotDir, { recursive: true });
for (const [id, image] of screenshots) {
  await writeFile(path.join(screenshotDir, `${id}.png`), image);
}
for (const [name, image] of pageScreenshots) {
  await writeFile(path.join(screenshotDir, `page-${name}.png`), image);
}
await writeFile(path.join(outDir, "toy-experience-audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
await writeFile(path.join(outDir, "toy-m2-review.html"), renderReport(audit));
console.log(JSON.stringify({
  output: outDir,
  matrixCases: matrix.length,
  multipleOpenCases: audit.multipleOpenCases,
  performanceCases: performanceMetrics.length,
  issues: issues.length,
}, null, 2));
if (issues.length) process.exitCode = 1;

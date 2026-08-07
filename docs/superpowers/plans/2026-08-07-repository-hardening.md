# 代码库工程收敛与体验修复计划

## 目标

在不改变现有内容语义、双语契约、旧 URL、隐私边界和小游戏随机公平性的前提下，完成一轮可验证的代码库收敛：让现有测试真正进入发布门禁，让依赖和本地构建可复现，让失败不再被构建日志吞掉，并优先修复旧文章图片的无障碍与传输成本。

本计划只在仓库外 worktree `D:\Codes\yiyuiii.github.io-worktrees\repository-hardening-20260807` 实施；正式 `master` clone 不直接修改。

## 已确认基线

- 基线提交：`89978f7e10fb2ca9bd664ccef32b0ead9146c999`。
- `python -m pytest -q`：356 项通过。
- 9 份 `tests/*.logic.test.mjs` 手工执行：77 项通过，但当前未被 `package.json` 或 GitHub Actions 调用。
- 生产构建、站点契约和 70 条旧 URL 通过；构建前必须先生成被忽略的 `_data/project_runtime.yml`。
- Playwright 单 worker：163 项通过，约 4.8 分钟。
- Playwright 4 worker 诊断：约 2.5 分钟，162 项通过、1 项出现瞬时 `ECONNREFUSED`；并行发布门禁必须先修复预览服务器承载和存活验证。
- 当前 Windows 环境没有 ImageMagick 的 `magick`，`jekyll-imagemagick` 会误调用系统 `convert.exe`，报告三次错误但 Jekyll 仍返回成功；对应派生 favicon 不存在且当前产物没有引用它们。
- 构建后扫描发现 42 个只写“图 N／Figure N”的正文图片替代文本，132 个图片标签缺少宽高属性。
- `assets/posts/202301162233/scene1.png` 至 `scene5.png` 合计约 7 MiB；内存诊断编码为 WebP quality 82 后约为原文件的 6%–8%。旧资源 URL 仍受兼容契约保护，不能删除。

## 实施阶段

### 阶段一：发布门禁与依赖可复现

1. 在 `package.json` 增加统一的 JavaScript 逻辑测试命令，并接入 GitHub Actions。
2. 生成并提交 `Gemfile.lock`，停止忽略它；复核 Linux/Windows 平台条目。
3. 审计当前直接 gem 与启用插件，只删除有证据表明未使用且删除后完整构建与回归通过的插件。
4. 保持 GitHub Actions 最小权限；能安全固定的依赖和动作改为可复现版本。

验收：新 checkout 能用锁文件安装；JavaScript 逻辑测试失败会阻断构建；现有 Python、构建和浏览器测试不退化。

### 阶段二：统一验证入口与失败关闭

1. 增加跨平台 Python 验证入口，明确区分首次依赖安装、需要 GitHub 凭据的项目同步、纯本地快速检查和完整发布检查。
2. 预检 Ruby、Bundler、Node/npm、Python、ImageMagick 等必要条件；错误信息必须说明缺什么和怎样修复。
3. 用子进程局部环境设置 `JEKYLL_ENV=production`，不污染调用者环境。
4. 只在成功构建后运行站点检查和浏览器回归；任何必要资产工具错误必须使验证失败。
5. 更新 README、AGENTS 和测试，保证 CI 与本地入口共享同一组核心步骤。

验收：缺项目运行时数据、缺依赖或构建工具错误时不能产生“构建成功”的假象；快速和完整模式均有自动测试。

### 阶段三：图片无障碍与媒体性能

1. 为历史正文图片补充能独立理解内容的中英文 alt，并保持图片顺序、链接和翻译结构对应。
2. 为本地题图和正文图片输出固有宽高，避免布局偏移；尺寸必须来自真实文件或受校验的数据，不能猜测。
3. 为高流量大图生成受版本控制的响应式 WebP，并让文章优先请求新资源；旧 PNG/JPG URL 继续可访问。
4. 扩展资产来源、双语和构建检查，保护新派生资源、尺寸与 alt 契约。

验收：不再出现泛化图号 alt；本地图片具有宽高；旧 URL 政策保持通过；页面不默认请求旧大图。

### 阶段四：资源和测试结构收敛

1. 把只服务小玩意页的 CSS 从全站主样式中拆出，保持主题与 320 px 行为。
2. 让图标、medium-zoom、Jupyter/代码辅助脚本按实际页面需要加载；优先消除普通页面不必要的第三方请求。
3. 在不降低发布覆盖的前提下，增加快速 smoke 套件；修复预览服务器并发稳定性后再提高 Playwright worker。
4. 逐步把精确源码字符串断言迁移为 YAML/HTML 解析、组件接口、计算样式和行为断言；先重构重复度最高的区域，不一次性重写全部测试。
5. 将超长样式、脚本和测试按稳定职责拆分；拆分必须先有行为保护，不能为追求文件行数而改变公共接口。

验收：主页基础资源下降；无关页面不加载小游戏 CSS；单 worker 全量回归继续通过，并行回归连续稳定后才进入 CI。

### 阶段五：安全、外部数据韧性与记忆整理

1. 在第三方资源收敛后缩小 CSP 主机范围；保留 Giscus 和三种按局公开接口的精确来源。
2. 为 AniList 补显式 opt-in 的单局实时维护探针；萌娘百科多请求质量审计继续不进入普通 CI。
3. 为外链和实时接口提供独立、非发布阻断的维护入口，避免上游波动阻塞普通提交。
4. 将 `AGENTS.md` 收敛为长期要求、当前事实摘要、验证入口和关键文档索引；详细组件状态留在现有专门文档，历史记录拆分但不丢失。

验收：默认访问的第三方范围可解释且与 CSP 一致；实时探针必须显式选择且有严格请求上限；项目记忆不再重复维护同一事实。

## 验证矩阵

每个阶段至少运行受影响的局部测试；合并前运行：

```powershell
python -m pytest -q
node --test tests/*.logic.test.mjs
python scripts/translation_guard.py --check --production
python scripts/generate_post_thumbnails.py --check
python scripts/sync_projects.py
bundle exec jekyll build --trace
python scripts/check_site.py --site _site
python scripts/check_legacy_urls.py --site _site
python scripts/run_browser_tests.py --site _site
```

最终命令以本轮新增的统一验证入口为准；上面保留为可追溯的基线分解。

## 风险与停止条件

- 不删除任何受 `_data/legacy_urls.yml` 保护的历史资源或路由。
- 不因优化资源而改变文章图片、公式、代码、标题或锚点的中英文对应。
- 不把外部数据批量下载、固定题库或 API 密钥引入站点。
- 不直接修改正式 `master` clone，不推送、不部署；发布仍需用户后续明确授权。
- 若插件精简或资源拆分导致主题内部契约不明，先保留依赖并记录证据，不以猜测继续删除。
- 外部审阅当前受限：Ark 在 2026-08-07 返回月度额度耗尽，本地 Kimi 在 4 分钟内无输出；后续可在实质差异形成后再尝试一次可用来源，但不得阻塞自动验证。

## 实施结果（2026-08-07）

### 发布门禁与依赖

- `npm run test:unit` 现在自动发现并运行全部 77 项 JavaScript 逻辑测试；CI 与本地统一调用 `scripts/validate.py`。
- `Gemfile.lock` 已加入版本控制并锁定 Windows/Linux 平台。直接依赖从原来的宽泛主题全家桶收敛为 19 项，Bundler 当前解析为 72 个 gem；ImageMagick、Notebook、分页、Twitter、图标、图片缩放和关闭的主题扩展已移除。
- 依赖审计中确认 `al_charts` 与 `jekyll-3rd-party-libraries` 是 Mermaid 转换／条件加载和版本模板展开的真实隐式依赖，已恢复并加入源码契约，避免再次误删。

### 统一验证与并行回归

- `scripts/validate.py` 按固定顺序执行 Python、Node、项目同步、翻译、题图、正文派生图、production 构建、站点与旧 URL 检查，可选追加浏览器回归；Jekyll 环境仅作用于子进程。
- 预览服务器监听队列从默认 5 提升为 128，并通过 32 线程、128 请求的并发测试。Playwright 使用受 Playwright 管理的完整 Chromium，本地 2 worker、CI 4 worker；最终 4 worker 全套 163 项通过，未再出现 `ECONNREFUSED`。
- 未另建容易与发布门禁漂移的 smoke 清单：4 worker 全量回归已从基线约 4.8 分钟降到约 1.7 分钟，聚焦排查仍可通过 `--` 传单个规格。

### 图片与页面资源

- 42 个“图 N／Figure N”替代文本已改为内容描述；构建插件从真实 PNG/GIF/JPEG/WebP 读取固有宽高，构建产物检查会拒绝缺少正宽高的图片。
- `_data/article_image_derivatives.yml` 与 `scripts/generate_article_images.py` 固定 WebP 生成策略，并以源图／派生图 SHA-256、真实格式和尺寸验证提交资产。最初的逐字节重新编码方案在 Linux CI 暴露出 JPEG 原生解码库的跨平台字节差异，已升级为清单版本 2；`--check` 不再调用平台编码器。六张相关原图共 8,637,787 字节，九张派生图共 1,649,260 字节；五张 Seasons 场景图正文主资源约 0.45 MB，旧 PNG/JPG URL 保留。
- 主题总脚本和未使用图标/缩放资源已移除，仅按页面条件加载 MathJax 与 Mermaid。小游戏样式从全站 `main.scss` 机械提取到 `toys.scss`；生产构建中 `main.css` 约 53.9 KB，只有双语小玩意页追加约 29.8 KB。
- 没有为追求文件行数而拆分稳定的业务脚本和浏览器规格；本轮只拆分有明确页面加载收益的 CSS，并把新增契约优先写成 YAML/HTML/行为检查。

### 安全、维护与记忆

- CSP 已从所有指令泛化允许 `https:`，收窄为 jsDelivr、Giscus、AniList、CMA API/CDN 与萌娘百科的按类型精确来源，并增加 `object-src 'none'`、`base-uri 'self'` 与 `form-action 'self'`。
- 第三方库配置只保留实际使用的 D3、Mermaid 与本地 MathJax。新增 `tests/tools/audit-acg-relation-quiz-live.mjs --run-live`：默认拒绝联网，每次恰好一次生产形状 AniList POST，无翻页、重试、内容输出或持久化；首次实测返回 6 个媒体、6 个合格媒体并成功形成一题。构建后外链检查继续作为独立非阻断入口。
- `AGENTS.md` 只保留长期要求、当前事实、验证入口和关键文档；19 条历史流水原样迁移到 `docs/agent-memory/history.md` 并明确标为需复核的 AI 历史总结。

外部审阅没有形成可采用意见：Ark 额度耗尽，本地 Kimi 超时无输出。最终结论须以完整自动门禁、生产构建和真实 Chromium 证据为准。

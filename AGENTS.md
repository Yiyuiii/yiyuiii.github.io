# 项目 AI 记忆

## 用户原始要求

- D:\Codes\yiyuiii.github.io\original-40a013 是提交 40a0132204e4c58c636d940245810334b5db597b 的未压缩原站归档，必须保留用于后续对比。
- D:\Codes\yiyuiii.github.io\master 应保持为与 GitHub master 一致的唯一正式 clone；功能工作使用仓库外临时 worktree，不直接修改 master。
- GitHub 主分支当前树应正式、精简、可构建、可维护；历史过程档案不应和生产源码混放。
- original-40a013 与 archives 不得进入站点提交。
- Anthropic 来源永久不可用，不得尝试。
- 对用户交流和审阅材料使用中文。
- 每篇随笔最终必须有完整中英文版本，并保持图片、公式、代码、标题结构、锚点与修订日期对应。
- 主导航顺序为“欢迎｜随笔｜GitHub｜论文｜小玩意｜关于yiyuiii”，英文保持同样的六项结构；导航目的页必须正确标记当前项，移动端不得横向溢出。

## 当前事实状态

- 站点使用 Jekyll 4.4.1、Ruby 3.3.5、Python 3.12 与 Node/Playwright；Gemfile 在 Windows 平台显式启用 `tzinfo-data`，保证配置时区的本地生产构建不依赖系统 zoneinfo 目录。
- 仅声明 `math: true` 的普通页面加载 MathJax；固定 3.2.2 的 CHTML 运行时、23 个 WOFF 字体和 Apache-2.0 许可保存在 `assets/vendor/mathjax/3.2.2/`，`assets/js/mathjax-loader.js` 只从同源版本路径加载。所有含公式的中英文随笔由 `tests/browser/math-rendering-round3.spec.mjs` 在阻断站外 HTTP(S) 的条件下检查公式数量、可见性、MathJax 错误、残留分隔符和实际字体请求；来源、哈希和升级边界见 `docs/mathjax-localization.md`。公式变量名应使用规范 TeX（如 `\rho_{\mathrm{water}}`），不要依赖 `\rho_水` 一类未知 Unicode 字形回退。
- GitHub Actions 工作流为 .github/workflows/deploy.yml；PR 只验证和上传 site-preview，master push 或在 master 上 `workflow_dispatch` 手动触发时，build 成功后 deploy。构建与静态检查之后必须通过 `scripts/run_browser_tests.py` 启动随机 loopback 预览并完成全套 Playwright；CI 使用 Playwright 自带 Chromium，浏览器失败时保留 `browser-failure-artifacts`，不得绕过该门禁发布。
- _posts 保存当前文章；每篇文章用共享 `thumbnail` 与本地化 `article_cover.alt/caption` 声明显式阅读页题图，布局通过 `_includes/article-cover.liquid` 在正文前渲染。题图与普通正文图片样式相互独立，维护契约见 docs/article-cover-component.md。阅读页正文使用 `50rem` 可读宽度，独立图片、表格、代码与题图最多使用 `72rem`；顶层叙述段统一首行缩进 `2em`，图片段、显示公式、列表、引用、代码和表格不继承该缩进；需要与正文栏对齐的紧凑代码/换算块使用 `article-prose`，其中资源换算式另用 `article-conversion` 保持紧凑宽度与等号对齐。小于 `1536px` 使用正文内原生折叠目录，从 `1536px` 起使用 `13rem` 左侧粘性目录。`_plugins/post-image-loading.rb` 只给转换后的 post 正文图片补原生延迟加载与异步解码，独立题图保持 eager/high priority。docs/asset-provenance.yml 按唯一正式封面关联中英文文章，并保存来源、许可、处理、SHA-256 与 160/320 px 索引派生规则。派生资产由 scripts/generate_post_thumbnails.py 预生成并提交，正文原图保留。
- _data/legacy_urls.yml、scripts/check_legacy_urls.py 与浏览器测试共同保护旧 URL。
- `/` 与 `/en/` 是欢迎页，人工文案集中在 `_data/home.yml`；`/writing/` 与 `/en/writing/` 是随笔索引。`_data/home_feed.yml` 只维护三类内容的稳定引用，运行时按分类型标志日期排序：随笔取初稿日，项目取经 CI 对照的 GitHub `created_at` 香港自然日（只表示仓库创建，不声称创建时已公开），论文取带权威来源的最早公开记录；后续修订、本站整理、push、Star/Fork 不刷新日期，也不使用热度或类型配额排序。“随机发现”（英文 “Random discovery”）在每次载入、刷新或从 BFCache 恢复欢迎页时，从中英文共同存在且位于最近 8 项之外的候选中独立均匀抽取一项；中英文不承诺相同结果。抽样使用 `crypto.getRandomValues()` 和拒绝采样，不使用 `Math.random`、日期、访问历史、Cookie、存储或网络；无 JavaScript 或随机源不可用时保留预渲染的固定“浏览起点”。
- `/toys/` 与 `/en/toys/` 是双语“小玩意”索引，人工标题、说明、关键词与分组集中在 `_data/toys.yml`，由 `_includes/toy-index.liquid` 渲染为单栏原生 `details` 清单；页面一级标题仅供语义与无障碍使用，不在视觉上重复显示。当前六项为萌娘百科角色猜猜、色差挑战、盲估十秒、反应时间、随机密码与随机数字；随机名字已移除。三个挑战和两个生成器只在当前页面本地运行且不联网；色差、生成器与萌娘问答不保存结果，盲估十秒与反应时间只允许使用 `yiyuiii.toy.ten-second.v1`、`yiyuiii.toy.reaction-time.v1` 两个本机键，各保留最近 100 次整数毫秒成绩并允许独立清空，不得保存时间戳、路径、设备或标识。色差为 25 级三题结算积分制：每题答对 `+1`、答错 `-1`，最低端固定黑白数字极值，最高端固定红或蓝通道单码差并以无尽组数延续。共同随机接口只接受 `crypto.getRandomValues()` 并用拒绝采样消除取模偏差，不得降级到 `Math.random`。未来的名画或角色猜猜若不能接入庞大、许可与稳定性可核验的外部数据集，就不要用手工固定小样本伪装为完整功能。萌娘百科问答在用户明确点击后，每轮只请求一次官方 Action API 的 50 页随机主命名空间批次；官方 Extracts 模块一次普通请求最多附带 20 条纯文本导言，脚本不追随 continuation 或静默补请求。候选在浏览器本地筛选角色型、非敏感、非消歧义、非歌曲／音乐／装备子页条目；用 128 位 nonce 避免随机响应被 CDN 固化，并在页面内排除最近 24 个候选，不写入持久化存储。线索以 `⬛` 屏蔽开头主语、候选标题片段与别名字段；没有实际发生遮蔽的导言不得作为答案。作答后显示来源和许可说明；禁止固定小白名单、静默补请求、萌娘共享远程题图或本地复制图片。2026-08-03 的两组限速实测及其样本边界见 `docs/moegirl-quiz-quality-audit-2026-08-03.json`。
- 默认布局的正式页面在正文后提供轻量反馈区：公开反馈进入 `.github/ISSUE_TEMPLATE/page-feedback.yml` 双语 GitHub Issue Form，私密反馈使用预填页面标题与绝对 URL 的电子邮件；重定向兼容页排除，双语 404 各自本地化。反馈组件只包含普通链接，不加载脚本、iframe 或第三方请求。GitHub Discussions 当前未开启，Giscus 的 repo/category ID 为空，因此不得先渲染失效评论框；未来启用外部设置后再单独接入点击加载的评论增强。
- `/about/` 与 `/en/about/` 的个人文案、栏目和链接集中在 `_data/about.yml`；`education` 数据保留但由共享 `display.hidden_blocks` 暂时隐藏。中英文树的 ID、层级和顺序必须对应；所有 About ID 只允许小写字母、数字和单个下划线，允许 `3d_printing` 一类数字开头，不允许连字符、波浪号、首尾或连续下划线。完整编辑与双语哈希流程见 `docs/content-editing.md`。
- 除双语 404 外，默认布局页面具有独立的明亮/夜晚主题与环境光：页眉外观按钮用 `yiyuiii.theme.v1` 保存严格的 `light` / `dark`；JavaScript 可用时左上头像用 `yiyuiii.sunlight.v1` 保存严格的环境光 `on` / `off`，明亮样式显示极慢旋转的暖日光，夜晚样式即时换为冷月晕与稀疏月光束，reduced-motion 停止旋转但保留静态光。两个偏好互不覆盖；无 JavaScript 时头像仍返回当前语言首页，外观/环境光按钮隐藏。
- docs 已由 _config.yml 排除，不会生成公开页面。
- 11 篇迁移前旧文已获得稳定 `uid`、`translation_key` 和显式 permalink；2 篇英文源位于 `/en/posts/`，原 URL 通过 legacy 重定向兼容。
- 11 篇旧文已全部完成双语配对；`_data/translation_exemptions.yml` 现为保留架构的空闭集。新文章必须双语发布，不得新增豁免。
- `scripts/translation_guard.py` 同时保护翻译 source hash、成对 URL、结构签名、修订日期与题图元数据；题图 alt/图注可本地化，但共享 thumbnail、图注 Markdown 结构和链接目标／顺序受保护。普通代码围栏逐字保护，Mermaid 仅允许独立 `ID(可见标签)` 节点的标签本地化，图类型、节点 ID、形状和边仍必须一致。
- 截至 2026-08-01，当前可用的外部审阅渠道只有 Ark Coding Plan 和本地 Kimi，DeepSeek API 暂不可用；这些是动态状态，未来每次使用前必须复核实际可用性。

## 常用验证

环境前提与首次依赖安装以 README.md 的“验证”为准。常用命令入口如下；这是入口清单，不是可以脱离各自前提直接串行执行的脚本：

```powershell
python -m pytest -q
python scripts/sync_projects.py
python scripts/translation_guard.py --check --production
python scripts/generate_post_thumbnails.py --check
bundle exec jekyll build --trace
python scripts/check_site.py --site _site
python scripts/check_legacy_urls.py --site _site
npm ci
python scripts/run_browser_tests.py --site _site
```

项目同步检查需要设置可用的 `GITHUB_TOKEN`；若使用 GitHub CLI，应先 `gh auth login`，再用 `gh auth token` 设置该环境变量，CI 会自动提供凭据。`npm ci` 属于首次准备。完整验证按 README.md 的“Production 构建”和“浏览器回归”执行：Jekyll 构建必须临时设置并在 `finally` 中恢复 `JEKYLL_ENV`，两个站点检查只能针对成功生成的 `_site`；浏览器回归统一通过 `scripts/run_browser_tests.py` 对刚构建的 `_site` 启动随机 loopback 预览，入口只给测试子进程设置 `SITE_URL`，并负责在所有退出路径关闭服务器。不要直接运行缺少这些前提的裸命令。

## 关键文档

- 内容维护：docs/content-editing.md
- 双语随笔基础：docs/superpowers/specs/2026-08-01-bilingual-post-foundation.md
- 生产封面来源：docs/asset-provenance.yml
- 随笔题图组件：docs/article-cover-component.md
- 目录整理设计：docs/superpowers/specs/2026-08-01-formalize-repository-tree-design.md
- 目录整理实施计划：docs/superpowers/plans/2026-08-01-formalize-repository-tree.md
- 主页下一阶段实施计划：docs/superpowers/plans/2026-08-01-homepage-refresh.md
- 欢迎页与规范化内容流：docs/superpowers/specs/2026-08-01-welcome-feed.md
- 明暗主题、日光/月光背景与开关：docs/superpowers/specs/2026-08-01-sunlight-background.md
- 首页标志日期证据：docs/home-feed-date-sources.md
- 萌娘百科角色问答组件：docs/moegirl-quiz-component.md
- 萌娘百科题库质量实测：docs/moegirl-quiz-quality-audit-2026-08-03.json
- 本地轻量挑战：docs/toy-challenges.md
- 随机生成器：docs/toy-generators.md
- MathJax 同源资产：docs/mathjax-localization.md
- 性能与语义标题基线：docs/experience-quality-baseline-2026-08-03.md
- 内容体验集中优化：docs/superpowers/plans/2026-08-03-content-experience-round5.md

## AI 历史总结

- 2026-07-31：本地根目录已整理为 master、original-40a013、archives 三个职责清楚的入口；冷备份及原站均已校验。该条是历史总结，继续工作前应以实际文件与 manifests 复核。
- 2026-08-01：用户批准方案 B，将完整修订稿、AI 审阅稿、封面候选与源图移出 master 当前树，并以结构化生产来源清单保留必要证据。该条是设计决策摘要，精确边界以已批准设计为准。
- 2026-08-01：用户批准按专业子任务实施欢迎页、双语随笔、正文排版、缩略图与阳光背景等下一阶段工作；欢迎页文案必须便于人工编辑，功能指引优先尝试箭头并在跨视口效果不佳时回退为文本。精确接口、依赖与验收以主页下一阶段实施计划为准。
- 2026-08-03：本轮按专业子任务完成 MathJax 同源化、萌娘百科题库限速实测及性能／无障碍审计；同时把完整 Playwright 回归接入 GitHub Actions 发布门禁。该条是历史总结，资产哈希、题库样本与体验数字分别以对应关键文档和当前测试为准。
- 2026-08-03：用户批准将色差挑战扩展为具有黑白数字极值、单通道单码极限、25 级感知阶梯、负分和最高端无尽模式的三题结算积分制；同时为两项计时增加最小化本机历史与 SVG 趋势，并以 GitHub Issue Form／邮件先落地全站反馈。该条是实施决策摘要，精确状态与验证边界以 `docs/toy-challenges.md` 和本轮实施计划为准。

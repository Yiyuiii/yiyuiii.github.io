# 项目 AI 记忆

## 用户原始要求

- D:\Codes\yiyuiii.github.io\original-40a013 是提交 40a0132204e4c58c636d940245810334b5db597b 的未压缩原站归档，必须保留用于后续对比。
- D:\Codes\yiyuiii.github.io\master 应保持为与 GitHub master 一致的唯一正式 clone；功能工作使用仓库外临时 worktree，不直接修改 master。
- GitHub 主分支当前树应正式、精简、可构建、可维护；历史过程档案不应和生产源码混放。
- original-40a013 与 archives 不得进入站点提交。
- Anthropic 来源永久不可用，不得尝试。
- 对用户交流和审阅材料使用中文。
- 后续工作优先完善和扩充“小玩意”页，并主动搜集适合本站的有趣轻量小游戏；具体候选仍须按双语、隐私、许可、可访问性和可验证性逐项复核。
- 每篇随笔最终必须有完整中英文版本，并保持图片、公式、代码、标题结构、锚点与修订日期对应。
- 《SETI》教学随笔应按实际开局与游玩顺序组织，文字简洁、条目清楚，避免无助于理解规则的比喻、长句和“不是……而是……”句式；“扩展理解”应优先解释不同来源的行动、组件和结算时点怎样组成规则链，外部知识只保留能直接帮助记忆或决策的浅层联系并控制字数，同时明确区分真实知识与游戏抽象；完整基础游戏应包括五种基础外星生物和单人模式，之后另行覆盖《Space Agencies》、三种新增外星生物和官方促销内容，并只使用可核验来源的原装配图。中文标签使用中文，游戏或扩展专名可保留原文；源文件名与 canonical URL 应和标题语义一致；修订历史标明本文由 GPT5.6 Sol 撰写。
- 主导航顺序为“欢迎｜随笔｜GitHub｜论文｜小玩意｜关于yiyuiii”，英文保持同样的六项结构；导航目的页必须正确标记当前项，移动端不得横向溢出。

## 当前事实状态

- 站点使用 Jekyll 4.4.1、Ruby 3.3.5、Python 3.12 与 Node/Playwright；Gemfile 在 Windows 平台显式启用 `tzinfo-data`，保证配置时区的本地生产构建不依赖系统 zoneinfo 目录。
- 仅声明 `math: true` 的普通页面加载 MathJax；固定 3.2.2 的 CHTML 运行时、23 个 WOFF 字体和 Apache-2.0 许可保存在 `assets/vendor/mathjax/3.2.2/`，`assets/js/mathjax-loader.js` 只从同源版本路径加载。所有含公式的中英文随笔由 `tests/browser/math-rendering-round3.spec.mjs` 在阻断站外 HTTP(S) 的条件下检查公式数量、可见性、MathJax 错误、残留分隔符和实际字体请求；来源、哈希和升级边界见 `docs/mathjax-localization.md`。公式变量名应使用规范 TeX（如 `\rho_{\mathrm{water}}`），不要依赖 `\rho_水` 一类未知 Unicode 字形回退。
- GitHub Actions 工作流为 .github/workflows/deploy.yml；PR 只验证和上传 site-preview，master push 或在 master 上 `workflow_dispatch` 手动触发时，build 成功后 deploy。构建与静态检查之后必须通过 `scripts/run_browser_tests.py` 启动随机 loopback 预览并完成全套 Playwright；CI 使用 Playwright 自带 Chromium，浏览器失败时保留 `browser-failure-artifacts`，不得绕过该门禁发布。
- _posts 保存当前文章；每篇文章用共享 `thumbnail` 与本地化 `article_cover.alt/caption` 声明显式阅读页题图，布局通过 `_includes/article-cover.liquid` 在正文前渲染。题图与普通正文图片样式相互独立，维护契约见 docs/article-cover-component.md。阅读页正文使用 `50rem` 可读宽度，独立图片、表格、代码与题图最多使用 `72rem`；顶层叙述段统一首行缩进 `2em`，图片段、图题、显示公式、列表、引用、代码和表格不继承该缩进；中文题图和正文图题使用直立字形、小于正文的字号与次级颜色，英文图题可保留英文斜体，依据与边界见 docs/chinese-typography.md；需要与正文栏对齐的紧凑代码/换算块使用 `article-prose`，其中资源换算式另用 `article-conversion` 保持紧凑宽度与等号对齐。小于 `1536px` 使用正文内原生折叠目录，从 `1536px` 起使用 `13rem` 左侧粘性目录；目录的布局边界同时包含正文和评论区，因此能随评论区继续滚动，但会在页眉之后开始并在页脚之前结束，不得遮挡环境光入口或版权信息。`_plugins/post-image-loading.rb` 只给转换后的 post 正文图片补原生延迟加载与异步解码，独立题图保持 eager/high priority。docs/asset-provenance.yml 按唯一正式封面关联中英文文章，并保存来源、许可、处理、SHA-256 与 160/320 px 索引派生规则。派生资产由 scripts/generate_post_thumbnails.py 预生成并提交，正文原图保留；素材较多的文章可在 docs/article-assets/<uid>.yml 另存正文图片的逐项来源与哈希，当前实例为 202608021600。
- _data/legacy_urls.yml、scripts/check_legacy_urls.py 与浏览器测试共同保护旧 URL。
- `/` 与 `/en/` 是欢迎页，人工文案集中在 `_data/home.yml`；`/writing/` 与 `/en/writing/` 是随笔索引。`_data/home_feed.yml` 只维护三类内容的稳定引用，运行时按分类型标志日期排序：随笔取初稿日，项目取经 CI 对照的 GitHub `created_at` 香港自然日（只表示仓库创建，不声称创建时已公开），论文取带权威来源的最早公开记录；后续修订、本站整理、push、Star/Fork 不刷新日期，也不使用热度或类型配额排序。“随机发现”（英文 “Random discovery”）在每次载入、刷新或从 BFCache 恢复欢迎页时，从中英文共同存在且位于最近 8 项之外的候选中独立均匀抽取一项；中英文不承诺相同结果。抽样使用 `crypto.getRandomValues()` 和拒绝采样，不使用 `Math.random`、日期、访问历史、Cookie、存储或网络；无 JavaScript 或随机源不可用时保留预渲染的固定“浏览起点”。
- 随笔索引、欢迎页、搜索和 SEO 优先读取每篇文章人工撰写的 `description`；它应简洁说明读者问题、文章提供的具体方法／顺序／证据，以及相较零散教程、单点点评或固定节奏视频的优势。`excerpt` 继续保留原有开场或背景，不承担索引价值文案。GitHub 项目卡片的原文简介直接取各公开仓库的 GitHub `description`，`_data/project_cache.yml` 只保存该字段的内容哈希与另一语言译文；更新项目简介必须先改 GitHub 源头，再同步博客，不能在站内维护第二套原文。
- `/toys/` 与 `/en/toys/` 是双语“小玩意”索引，人工标题、说明、关键词与分组集中在 `_data/toys.yml`，由 `_includes/toy-index.liquid` 渲染为单栏原生 `details` 清单；页面一级标题仅供语义与无障碍使用，不在视觉上重复显示。当前九项为萌娘百科条目猜猜、色差挑战、盲估十秒、反应时间、数字 Wordle、凑成 24、翻灯、随机密码与随机数字；随机名字已移除。除萌娘百科问答按披露边界请求官方 API 外，其余八项只在当前页面本地运行且不联网；色差、三款逻辑游戏与生成器不保存结果，盲估十秒与反应时间只允许使用 `yiyuiii.toy.ten-second.v1`、`yiyuiii.toy.reaction-time.v1` 两个本机键，各保留最近 100 次整数毫秒成绩并允许独立清空，不得保存时间戳、路径、设备或标识；正常状态的保存与隐私边界在操作区前集中说明一次，历史区只在浏览器拒绝存储时显示临时内存警告。数字 Wordle 默认使用四位互不重复的密码、八次机会，也可设置 `3..6` 位、允许重复及 `6/8/10/12` 次机会；用户界面以互不重叠的“完全命中”和“仅数字命中”表达反馈，允许重复时按多重集合计数，保留前导零且不预生成候选表；桌面历史表按内容收缩，不强制铺满游戏区；重新生成当前答案的按钮统一称“重置题目／Reset puzzle”。“显示答案／Show answer”只在进行中的一局可用，点击后以独立 `revealed` 状态结束该局，禁止继续提交，重置后恢复。凑成 24 枚举 `1..10` 的 715 个非降序四元组，完整可解题池为 566 组，其中 556 组存在全程正整数解、10 组必须使用分数；运算和显示始终使用约分后的精确分数，题池只提供“整数过程／需要分数／完整题池”。凑成 24 的“显示答案”在点击后即时求出三条可由现有按钮流程复现的精确等式，整数题池要求全程正整数、完整题池优先正整数解；查看后只锁住本次尝试，重置和换题仍可用，胜负后的原有撤销保持可用。翻灯枚举全部按键掩码并为每个可达局面保留最短代表解：3×3 有 512 个局面、4×4 有 4096 个，排除 0／1 步题后按精确最少 `2–3`、`4–5`、`6+` 步分层；棋盘支持网格语义、方向键、Enter／空格、逐步撤销与获胜后撤销。两款新游戏的数学与交互契约分别见 `docs/toy-make-24.md`、`docs/toy-lights-out.md`，独立 Python oracle 与浏览器回归不得删除。色差为 25 级三题结算积分制：每题答对 `+1`、答错 `-1`；默认用洗牌袋均衡轮换明暗、鲜淡、色相三种单轴题型及六段连续 OKLCH 色相，可选仅用于明暗题的中性灰，也可改为固定难度。答题后 16 个色块的实际 RGB、边框与不透明度保持不变，只以独立的绿色 `✓` 和红色 `×` 小角标标记答案与误选；不得再用整块降透明度或改色反馈。色差与三款逻辑游戏的设置都只在明确应用后生效并清空本局，不持久化。共同随机接口只接受 `crypto.getRandomValues()` 并用拒绝采样消除取模偏差，不得降级到 `Math.random`。未来的名画或角色猜猜若不能接入庞大、许可与稳定性可核验的外部数据集，就不要用手工固定小样本伪装为完整功能。萌娘百科问答在用户明确点击后，每轮只请求一次官方 Action API 的 50 页随机主命名空间批次；官方 Extracts 模块一次普通请求最多附带 20 条纯文本导言，脚本不追随 continuation 或静默补请求。候选在浏览器本地以角色相关信号初筛，并排除敏感、消歧义、歌曲／音乐和装备子页；候选标题仍可能是作品或书名等主题条目，因此用户界面统一称“条目”而非“角色”。请求用 128 位 nonce 避免随机响应被 CDN 固化，并在页面内排除最近 24 个候选，不写入持久化存储。线索以 `⬛` 屏蔽开头主语、候选标题片段与别名字段；没有实际发生遮蔽的导言不得作为答案。固定的导言来源、遮蔽方式和隐私边界统一放在开始前披露区，出题后的线索框只显示短问题和动态线索；英文页明确说明当前题源和题目仍为中文。作答后显示来源和许可说明；禁止固定小白名单、静默补请求、萌娘共享远程题图或本地复制图片。2026-08-03 的两组限速实测及其样本边界见 `docs/moegirl-quiz-quality-audit-2026-08-03.json`；2026-08-04 的英文实时 API、历史备份题量与重新评估条件见 `docs/moegirl-quiz-english-source-audit-2026-08-04.md`。
- 默认布局的正式页面在正文后只提供评论区：评论使用仓库已启用的 GitHub Discussions、`Announcements` 公告分类与 Giscus，按严格 `pathname` 分离每个页面及中英文 URL。“评论公开保存在 GitHub Discussions”中的 Discussions 名称直接链接到评论分类。默认页面只渲染本地说明、手动显示按钮和默认关闭的“在本站自动加载评论”单行选项，不再另设重复的加粗标题或说明；普通显示只加载当前页且不持久化，只有读者明确勾选自动加载后才保存 `localStorage` 键 `yiyuiii.comments.v1=auto`、立即加载并在今后正式页面自动请求 `giscus.app` / GitHub，取消时删除该键但不卸载当前评论。该键不得保存路径、时间、身份或其它访问数据；无效值和存储失败按关闭处理且不得自动联网，不得增加 Cookie、`sessionStorage` 或其它评论存储。说明与按钮披露当前空评论区首次加载约 `0.13 MB`，并注明实际用量随评论内容变化；加载失败可重试，无 JavaScript 时自动加载选项隐藏、内嵌 Discussions 链接仍可用。评论语言和明暗主题跟随当前页面，使用 Giscus 官方 `light` / `dark` 主题并保留原生署名位置，不依赖、隐藏或重排 iframe 内部结构；`giscus.json` 只允许正式域名与 loopback 本地预览嵌入。重定向兼容页与双语 404 排除评论和反馈。此前的全站 Issue／邮件反馈组件及站内文案已于 2026-08-04 移除；`.github/ISSUE_TEMPLATE/page-feedback.yml` 作为仓库原生 Issue Form 保留，但站内不再渲染或链接它。用户已完成 Giscus GitHub App 的仓库级授权，Giscus 官方分类接口已返回仓库及 `Announcements` Node ID，CI artifact 上的中英文真实 iframe、登录入口与明暗主题同步均已验证。
- `/about/` 与 `/en/about/` 的个人文案、栏目和链接集中在 `_data/about.yml`；捐助与联系说明位于 `links.intro`，渲染在“我的链接”标题之后、链接列表之前；`education` 数据保留但由共享 `display.hidden_blocks` 暂时隐藏。问候、正文、栏目分隔线、详情列表、捐助说明和链接共同占满页面现有的 `52rem` 版心，详情列表与分隔线保持原有宽度，正文不再单独使用 `ch` 宽度；窄屏随可用宽度收缩。中英文树的 ID、层级和顺序必须对应；所有 About ID 只允许小写字母、数字和单个下划线，允许 `3d_printing` 一类数字开头，不允许连字符、波浪号、首尾或连续下划线。完整编辑与双语哈希流程见 `docs/content-editing.md`。
- 除双语 404 外，默认布局页面具有独立的明亮/夜晚主题与环境光：页眉外观按钮用 `yiyuiii.theme.v1` 保存严格的 `light` / `dark`；JavaScript 可用时左上头像用 `yiyuiii.sunlight.v1` 保存严格的环境光 `on` / `off`，明亮样式显示极慢旋转的暖日光，夜晚样式即时换为冷月晕与稀疏月光束，reduced-motion 停止旋转但保留静态光。两个偏好互不覆盖；无 JavaScript 时头像仍返回当前语言首页，外观/环境光按钮隐藏。
- 色差挑战的三种题型分别使用独立的 25 级 `ΔE_OK` 曲线；所有题最终 8-bit RGB 回算后的两色 OKLab 亮度中点固定在 `0.52..0.68`，并复核目标变化方向、色相范围与实际色差。明暗保持 `a/b`、鲜淡保持 `L/h`、色相保持 `L/C`；普通级目标方向占比至少 `72%`，量化边缘级至少 `58%`。精确生成、回退、设置和固定难度语义见 `docs/toy-challenges.md`。
- docs 已由 _config.yml 排除，不会生成公开页面。
- 11 篇迁移前旧文已获得稳定 `uid`、`translation_key` 和显式 permalink；2 篇英文源位于 `/en/posts/`，原 URL 通过 legacy 重定向兼容。
- 11 篇旧文已全部完成双语配对；新增的《SETI》随笔也已提供中英文版本，因此当前共有 12 组、24 篇随笔。`_data/translation_exemptions.yml` 现为保留架构的空闭集。新文章必须双语发布，不得新增豁免。
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
- 中文文章排版基线：docs/chinese-typography.md
- 目录整理设计：docs/superpowers/specs/2026-08-01-formalize-repository-tree-design.md
- 目录整理实施计划：docs/superpowers/plans/2026-08-01-formalize-repository-tree.md
- 主页下一阶段实施计划：docs/superpowers/plans/2026-08-01-homepage-refresh.md
- 欢迎页与规范化内容流：docs/superpowers/specs/2026-08-01-welcome-feed.md
- 明暗主题、日光/月光背景与开关：docs/superpowers/specs/2026-08-01-sunlight-background.md
- 首页标志日期证据：docs/home-feed-date-sources.md
- 《SETI》正文图片来源：docs/article-assets/202608021600.yml
- 《SETI》规则覆盖审计：docs/seti-rules-audit-2026-08-04.md
- 萌娘百科条目问答组件：docs/moegirl-quiz-component.md
- 萌娘百科题库质量实测：docs/moegirl-quiz-quality-audit-2026-08-03.json
- 萌娘百科英文题源审计：docs/moegirl-quiz-english-source-audit-2026-08-04.md
- 本地轻量挑战：docs/toy-challenges.md
- 随机生成器：docs/toy-generators.md
- 小玩意扩充路线：docs/toy-expansion-roadmap-2026-08-04.md
- 外部开放数据小游戏调研：docs/toy-external-dataset-research-2026-08-05.md
- 数字 Wordle：docs/toy-codebreaker.md
- 凑成 24：docs/toy-make-24.md
- 翻灯：docs/toy-lights-out.md
- MathJax 同源资产：docs/mathjax-localization.md
- 性能与语义标题基线：docs/experience-quality-baseline-2026-08-03.md
- 内容体验集中优化：docs/superpowers/plans/2026-08-03-content-experience-round5.md
- 全站 GitHub Discussions 评论：docs/superpowers/plans/2026-08-03-page-comments.md

## AI 历史总结

- 2026-07-31：本地根目录已整理为 master、original-40a013、archives 三个职责清楚的入口；冷备份及原站均已校验。该条是历史总结，继续工作前应以实际文件与 manifests 复核。
- 2026-08-01：用户批准方案 B，将完整修订稿、AI 审阅稿、封面候选与源图移出 master 当前树，并以结构化生产来源清单保留必要证据。该条是设计决策摘要，精确边界以已批准设计为准。
- 2026-08-01：用户批准按专业子任务实施欢迎页、双语随笔、正文排版、缩略图与阳光背景等下一阶段工作；欢迎页文案必须便于人工编辑，功能指引优先尝试箭头并在跨视口效果不佳时回退为文本。精确接口、依赖与验收以主页下一阶段实施计划为准。
- 2026-08-03：本轮按专业子任务完成 MathJax 同源化、萌娘百科题库限速实测及性能／无障碍审计；同时把完整 Playwright 回归接入 GitHub Actions 发布门禁。该条是历史总结，资产哈希、题库样本与体验数字分别以对应关键文档和当前测试为准。
- 2026-08-03：用户批准将色差挑战扩展为具有黑白数字极值、单通道单码极限、25 级感知阶梯、负分和最高端无尽模式的三题结算积分制；同时为两项计时增加最小化本机历史与 SVG 趋势，并以 GitHub Issue Form／邮件先落地全站反馈。该条是实施决策摘要，精确状态与验证边界以 `docs/toy-challenges.md` 和本轮实施计划为准。
- 2026-08-04：用户进一步要求色差挑战避开过亮或过暗的题目，并允许自行选择变化类型与颜色范围；随后批准由 Codex 按优势方案实现。当前实现以明暗、鲜淡、色相多选和六段连续色相取代旧黑白／单码固定端点，保留 25 级三题结算与顶部量化边缘练习；精确状态以 `docs/toy-challenges.md` 为准。
- 2026-08-04：用户要求后续优先完善并扩充小游戏，同时主动搜集有趣候选。首个扩充项目为本地双语的“数字 Wordle”，采用可配置位数、重复规则与次数，不联网或持久化；用户试玩后进一步要求历史表按内容收缩，并以互斥的“完全命中／仅数字命中”消除反馈歧义。后续候选和取舍继续维护在 `docs/toy-expansion-roadmap-2026-08-04.md`。
- 2026-08-04：首批逻辑小游戏扩充已完成数字 Wordle、凑成 24 与翻灯三条不同循环，并以精确题池、独立算法 oracle、纯键盘路径和 320 px 浏览器回归验证；按原路线应先停止继续新增，观察列表密度、共享组件和真实游玩反馈，再从第二阶段候选中只选一项原型。该条是历史总结，精确事实仍以三份游戏文档和当前测试为准。
- 2026-08-05：用户要求数字 Wordle 与凑成 24 提供“显示答案”，并指出色差挑战答后整体发白会妨碍复核、整块圈对错不够美观。本轮将两款答案揭晓统一为结束当前尝试的显式状态；色差反馈改为不改变原色的角标，并以计算后样式逐格相等的浏览器回归保护。该条是用户需求与实施摘要，精确状态以三份游戏文档和当前测试为准。
- 2026-08-03 至 2026-08-04：用户要求在每个正式页面底部增加基于 GitHub 的评论；本轮启用仓库 Discussions，并以 Giscus、严格路径映射、默认显式点击加载、双语与主题同步、来源限制和 GitHub 直达回退实现。用户随后完成 Giscus App 仓库级授权，官方接口和 CI artifact 真实 iframe 均已验证；之后决定移除重复的全站 Issue／邮件反馈提示、将 Discussions 链接并入评论公开说明，并为避免上游兼容风险保留 Giscus 官方主题及原生署名位置。为减少连续阅读时的重复点击，另增明确、默认关闭且可撤销的自动加载偏好；普通显示仍不构成长期开启。精确边界以全站评论计划和当前测试为准。

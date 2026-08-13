# 项目 AI 记忆

## 用户原始要求

- D:\Codes\yiyuiii.github.io\original-40a013 是提交 40a0132204e4c58c636d940245810334b5db597b 的未压缩原站归档，必须保留用于后续对比。
- D:\Codes\yiyuiii.github.io\master 应保持为与 GitHub master 一致的唯一正式 clone；功能工作使用仓库外临时 worktree，不直接修改 master。
- GitHub 主分支当前树应正式、精简、可构建、可维护；历史过程档案不应和生产源码混放。
- original-40a013 与 archives 不得进入站点提交。
- Anthropic 来源永久不可用，不得尝试。
- 对用户交流和审阅材料使用中文。
- 用户于 2026-08-07 更新此前的“小玩意”扩充要求：现有十一项完成 M2 审计并验收后停止继续新增；“接通电路”因玩法传统、没有额外逻辑新意而取消，M4 随之取消。不得自动改做“漫水”“节奏复现”或其它传统候选；未来只有在候选能证明新的逻辑体验与明确站点价值、且用户重新授权时，才重启扩充评估。
- 小玩意的外部数据项目不得要求站点、维护者或读者提供 API 密钥，也不得在静态前端嵌入密钥或为此新增代签后端；不得批量下载、提交或向读者下发外部题库和媒体索引。只有在读者明确开始一局后，才可调用生成本局内容直接必需的官方无密钥公开接口或媒体地址；响应只留在当前页面内存，不持久化、不静默续页或预取下一局。
- 每篇随笔最终必须有完整中英文版本，并保持图片、公式、代码、标题结构、锚点与修订日期对应。
- 用户于 2026-08-08 明确更新随笔维护偏好：市场价格、产品生态、软件接口、平台政策等强时效内容一旦失效，应重新调研并整体改写，不能靠局部补丁继续作为当前指导；网络架构、产品类型、理论模型、因果机制与验证方法等持久内容应成为正文主干。重大改写可完全替换旧稿并转为由 GPT 调研撰写的教程，但必须保留原始发布日期与 URL，在修订历史中标明重新调研日期、模型和替换范围。
- 用户于 2026-08-09 要求《与珍珠鸟建立信任》先系统梳理物种底层特点，再以连续的因果与证据链推导训练方法；不得继续用散点技巧堆叠或把未经检验的直觉写成物种规律。
- 用户于 2026-08-09 确认 Replit 免费版不适合本站且已经卸载；活动流程必须移除 Replit 依赖，优先由 GitHub 固定测试分支完成构建与验证，GitHub 不能安全提供独立测试站时改用本机预览。当前流程不使用 Browser／Computer Use 控制审阅页面。
- 用户于 2026-08-10 要求整理当前全部 16 组中英文随笔：术语优先采用目标领域内已有共识、读者常用且定义稳定的称呼，同一概念保持同一主称呼，首次出现时说明必要的英文原名、缩写或别名；删除装饰性同义替换、重复标签、无信息量修饰语和可省略的抽象名词；复杂内容按因果、时间、步骤或层级拆开，降低术语切换、指代追踪和句法解析负担。全站范围、分批清单与验收方法见 `docs/all-posts-reader-language-2026-08-10.md`。
- 《SETI》教学随笔应按实际开局与游玩顺序组织，文字简洁、条目清楚，避免无助于理解规则的比喻、长句和“不是……而是……”句式；“扩展理解”应优先解释不同来源的行动、组件和结算时点怎样组成规则链，外部知识只保留能直接帮助记忆或决策的浅层联系并控制字数，同时明确区分真实知识与游戏抽象；完整基础游戏应包括五种基础外星生物和单人模式，之后另行覆盖《Space Agencies》、三种新增外星生物和官方促销内容，并只使用可核验来源的原装配图。教程还需集中讲清通用图标、版图标记状态和每种外星生物的专属图标，不应让初学者自行在主规则书、玩家辅助页与物种辅助页之间拼接。中文标签使用中文，游戏或扩展专名可保留原文；源文件名与 canonical URL 应和标题语义一致；修订历史标明本文由 GPT5.6 Sol 撰写。
- 主导航顺序为“欢迎｜随笔｜GitHub｜论文｜小玩意｜关于yiyuiii”，英文保持同样的六项结构；导航目的页必须正确标记当前项，移动端不得横向溢出。

## 当前事实状态

- 站点使用 Jekyll 4.4.1、Ruby 3.3.5、Python 3.12 与 Node 24/Playwright；2026-08-07 仓库加固已合并并部署到正式 master（合并点 `eee7b95`）。`Gemfile.lock` 同时锁定 Windows 与 Linux 平台，Gemfile 在 Windows 平台显式启用 `tzinfo-data`，保证配置时区的本地生产构建不依赖系统 zoneinfo 目录。只保留代码实际使用的 Jekyll/al-folio 插件；`al_charts` 负责 Mermaid 转换与条件加载。第三方资源固定为 `download: false`，由 `_plugins/third_party_library_urls.rb` 只展开配置中的版本模板，并在误开下载时阻断构建；原 `jekyll-3rd-party-libraries` 因其未使用的下载路径把有漏洞且无法升级的 `css_parser <2.0` 带入构建链，已用该本地最小实现替换。ImageMagick、Notebook、分页、Twitter 与已关闭的主题扩展不再进入构建链。
- 仅声明 `math: true` 的普通页面加载 MathJax；固定 3.2.2 的 CHTML 运行时、23 个 WOFF 字体和 Apache-2.0 许可保存在 `assets/vendor/mathjax/3.2.2/`，`assets/js/mathjax-loader.js` 只从同源版本路径加载。所有含公式的中英文随笔由 `tests/browser/math-rendering-round3.spec.mjs` 在阻断站外 HTTP(S) 的条件下检查公式数量、可见性、MathJax 错误、残留分隔符和实际字体请求；来源、哈希和升级边界见 `docs/mathjax-localization.md`。公式变量名应使用规范 TeX（如 `\rho_{\mathrm{water}}`），不要依赖 `\rho_水` 一类未知 Unicode 字形回退。
- GitHub Actions 工作流为 `.github/workflows/deploy.yml`：PR 与固定 `preview/review` 分支的 push 运行同一完整门禁并上传 `site-preview`；测试分支产物额外写入 `preview-source-sha.txt`，只有 `master` push 或在 `master` 上手动触发时才执行正式 deploy。本地与 CI 的完整门禁统一由 `scripts/validate.py` 编排，CI 使用 `--browser`，以 Playwright 管理的 Chromium 和 4 worker 完成回归；浏览器失败时保留 `browser-failure-artifacts`。同一仓库只有一个 GitHub Pages 站点，官方 pull request preview 仍未公开可用，因此测试分支不得接管正式 Pages。人工审阅优先运行 `scripts/github_preview.py`：它用 GitHub CLI 等待当前 `origin/preview/review` 的 run，核对远端 SHA、run SHA 和 artifact 内标记后，把 `site-preview` 下载到临时目录，并调用 `scripts/serve_site.py` 只绑定 `127.0.0.1`；它不自动打开或控制浏览器。GitHub 暂不可用或检查未提交修改时，先运行 `scripts/validate.py --browser`，再用 `scripts/serve_site.py --site _site --port 9241`。Replit 同步 job、配置模板和活动说明已移除；旧远端 `preview/replit` 与 `preview/replit-site` 已在新流程首次远端验证成功后于 2026-08-09 删除。精确流程见 `docs/preview-workflow.md`，不得绕过门禁或用旧 artifact 冒充当前候选。
- _posts 保存当前文章；每篇文章用共享 `thumbnail` 与本地化 `article_cover.alt/caption` 声明显式阅读页题图，布局通过 `_includes/article-cover.liquid` 在正文前渲染。题图与普通正文图片样式相互独立，维护契约见 docs/article-cover-component.md。阅读页正文和普通代码块使用 `50rem` 可读宽度，独立图片、表格与题图最多使用 `72rem`；只有确实需要额外宽度的代码块才显式使用 `article-wide`，紧凑资源换算式用 `article-conversion` 保持内容宽度与等号对齐。顶层叙述段统一首行缩进 `2em`，图片段、图题、显示公式、列表、引用、代码和表格不继承该缩进；中文题图和正文图题使用直立字形、小于正文的字号与次级颜色，英文图题可保留英文斜体，依据与边界见 docs/chinese-typography.md。小于 `1536px` 使用正文内原生折叠目录，从 `1536px` 起使用 `13rem` 左侧粘性目录；目录的布局边界同时包含正文和评论区，因此能随评论继续滚动，但会在页眉之后开始并在页脚之前结束，不得遮挡环境光入口或版权信息。`_plugins/post-image-loading.rb` 从真实本地文件补齐题图和正文图片的固有宽高，正文图片另加 `loading="lazy"`、`decoding="async"`，并只按 `_data/article_image_derivatives.yml` 输出受检 `srcset`；题图保持 eager/high priority。正文响应式派生图由 `scripts/generate_article_images.py` 预生成并提交；清单版本 3 保存源图与派生图的 SHA-256、真实尺寸和固定编码策略，`--check` 只验证已提交清单与文件，不跨平台重新编码，旧 PNG/JPG URL 保留。docs/asset-provenance.yml 按唯一正式封面关联中英文文章，并保存来源、许可、处理、SHA-256 与 160/320 px 索引派生规则；索引派生资产由 scripts/generate_post_thumbnails.py 预生成并提交。素材较多的文章可在 docs/article-assets/<uid>.yml 另存正文图片的逐项来源与哈希，当前实例为 202608021600。
- _data/legacy_urls.yml、scripts/check_legacy_urls.py 与浏览器测试共同保护旧 URL。
- `/` 与 `/en/` 是欢迎页，人工文案集中在 `_data/home.yml`；`/writing/` 与 `/en/writing/` 是随笔索引。`_data/home_feed.yml` 只维护三类内容的稳定引用，运行时按分类型标志日期排序：随笔取初稿日，项目取经 CI 对照的 GitHub `created_at` 香港自然日（只表示仓库创建，不声称创建时已公开），论文取带权威来源的最早公开记录；后续修订、本站整理、push、Star/Fork 不刷新日期，也不使用热度或类型配额排序。“随机发现”（英文 “Random discovery”）在每次载入、刷新或从 BFCache 恢复欢迎页时，从中英文共同存在且位于最近 8 项之外的候选中独立均匀抽取一项；中英文不承诺相同结果。抽样使用 `crypto.getRandomValues()` 和拒绝采样，不使用 `Math.random`、日期、访问历史、Cookie、存储或网络；无 JavaScript 或随机源不可用时保留预渲染的固定“浏览起点”。
- 随笔索引、欢迎页、搜索和 SEO 优先读取每篇文章人工撰写的 `description`；它应简洁说明读者问题、文章提供的具体方法／顺序／证据，以及相较零散教程、单点点评或固定节奏视频的优势。`excerpt` 继续保留原有开场或背景，不承担索引价值文案。GitHub 项目卡片的原文简介直接取各公开仓库的 GitHub `description`，`_data/project_cache.yml` 只保存该字段的内容哈希与另一语言译文；更新项目简介必须先改 GitHub 源头，再同步博客，不能在站内维护第二套原文。
- `/toys/` 与 `/en/toys/` 是双语“小玩意”索引，人工标题、说明、关键词与分组集中在 `_data/toys.yml`，由 `_includes/toy-index.liquid` 渲染为单栏原生 `details` 清单；页面一级标题仅供语义与无障碍使用，不在视觉上重复显示。页面始终输出十一项的完整 HTML 和 `noscript` 内容，但游戏运行时只由 `assets/js/toy-loader.js` 在首次展开、哈希直达或程序化打开时按固定同源白名单顺序加载；共享依赖只执行一次，失败资源可在本地化状态区重试。生产门禁限制加载器最多 `4 KiB`、折叠态全部同源 JavaScript 最多 `15 KiB`，并禁止游戏运行时出现在初始脚本标签中；维护边界见 `docs/toy-loading.md`。当前十一项为萌娘百科猜猜、名画猜猜（克利夫兰艺术博物馆）、动画主角猜猜（AniList）、色差挑战、盲估十秒、反应时间、数字 Wordle、凑成 24、翻灯、随机密码与随机数字；前三项统一归入“知识问答／Knowledge quizzes”，随机名字已移除。萌娘百科、名画与 AniList 三项只在用户明确开始后按披露边界请求官方公开服务，其余八项只在当前页面本地运行且不联网。外部数据游戏不得用固定小样本伪装题库；按局请求、许可、可达性、内容过滤与失败边界分别以组件文档和实时闸门为准。色差、三款逻辑游戏与生成器不保存结果，盲估十秒与反应时间只允许使用 `yiyuiii.toy.ten-second.v1`、`yiyuiii.toy.reaction-time.v1` 两个本机键，各保留最近 100 次整数毫秒成绩并允许独立清空，不得保存时间戳、路径、设备或标识；正常状态的保存与隐私边界在操作区前集中说明一次，历史区只在浏览器拒绝存储时显示临时内存警告。数字 Wordle 默认使用四位互不重复的密码、八次机会，也可设置 `3..6` 位、允许重复及 `6/8/10/12` 次机会；用户界面以互不重叠的“完全命中”和“仅数字命中”表达反馈，允许重复时按多重集合计数，保留前导零且不预生成候选表；桌面历史表按内容收缩，不强制铺满游戏区；重新生成当前答案的按钮统一称“重置题目／Reset puzzle”。“显示答案／Show answer”只在进行中的一局可用，点击后以独立 `revealed` 状态结束该局，禁止继续提交，重置后恢复。凑成 24 枚举 `1..10` 的 715 个非降序四元组，完整可解题池为 566 组，其中 556 组存在全程正整数解、10 组必须使用分数；运算和显示始终使用约分后的精确分数，题池只提供“整数过程／需要分数／完整题池”。凑成 24 的“显示答案”在点击后即时求出三条可由现有按钮流程复现的精确等式，整数题池要求全程正整数、完整题池优先正整数解；查看后只锁住本次尝试，重置和换题仍可用，胜负后的原有撤销保持可用。翻灯枚举全部按键掩码并为每个可达局面保留最短代表解：3×3 有 512 个局面、4×4 有 4096 个，排除 0／1 步题后按精确最少 `2–3`、`4–5`、`6+` 步分层；棋盘支持网格语义、方向键、Enter／空格、逐步撤销与获胜后撤销。两款新游戏的数学与交互契约分别见 `docs/toy-make-24.md`、`docs/toy-lights-out.md`，独立 Python oracle 与浏览器回归不得删除。色差为 25 级三题结算积分制：每题答对 `+1`、答错 `-1`；默认用洗牌袋均衡轮换明暗、鲜淡、色相三种单轴题型及六段连续 OKLCH 色相，可选仅用于明暗题的中性灰，也可改为固定难度。答题后 16 个色块的实际 RGB、边框与不透明度保持不变，只以独立的绿色 `✓` 和红色 `×` 小角标标记答案与误选；不得再用整块降透明度或改色反馈。色差与三款逻辑游戏的设置都只在明确应用后生效并清空本局，不持久化。共同随机接口只接受 `crypto.getRandomValues()` 并用拒绝采样消除取模偏差，不得降级到 `Math.random`。
- 2026-08-07 的 M2 审计覆盖 24 种页面环境、264 次逐项展开、6 次十一项同时展开和 22 次逐项目冷启动，自动问题为 0；用户随后确认当前分组、排序、信息密度与允许多项同时展开均无需调整，M2 正式验收完成。M3/M4 已取消，不属于待实现事项。
- 2026-08-07 维护收口已启用 Dependabot 漏洞告警与 Bundler/npm/Python 月度分组更新；没有启用自动修复、CodeQL 或自动合并。首次 20 条告警归并为 Pillow 与 css_parser 两个根因：Pillow 已升至 12.3.0 并完成 `index-v2`、正文策略版本 3 / `content-v2` 的确定性资产迁移；无法升级 css_parser 的旧下载插件已由 `_plugins/third_party_library_urls.rb` 最小本地实现替换。工作树清理、保留边界与完整验证见 `docs/maintenance-closeout-2026-08-07.md`。
- 2026-08-11 Python 本地检查、资源维护与 CI 依赖改由 `scripts/requirements.in` 保存直接约束，`scripts/requirements.txt` 使用 Python 3.12 与 `pip-tools==7.5.3` 固定全部版本和 PyPI 分发包哈希；该标准锁文件名同时供 GitHub Dependency Graph 静态解析。Windows 通过条件依赖 `tzdata` 为 `zoneinfo` 提供 IANA 时区数据。CI 使用 `--require-hashes` 安装并运行 `pip check`。Pillow 保持 12.3.0，pytest 安全下限为 9.0.3；两者受锁文件、图片策略和契约测试约束。GitHub 依赖图此前残留 Pillow 12.0.0，告警刷新结果必须按当前 Dependabot、Dependency Graph 和 SBOM 复核；设计与证据见 `docs/dependency-security-baseline-2026-08-11.md`。
- 2026-08-06 当前萌娘百科事实：首项可见名称为“萌娘百科猜猜 / Moegirlpedia quiz”，稳定 ID 仍为 `moegirl-quiz`，唯一来源为中文萌娘百科；中英文页面都请求中文题料且英文说明须明确这一点。每次明确点击最多一个官方 Action API GET，无来源选择、预取、续页、图片、凭据或题目持久化；不接入 Wikipedia，也不做代理、镜像、自动回退或重试。当前只保留自然的“匿名化导言 → 条目”题型，不为单一选项显示题型面板；“条目 → 四段导言”因长文本、干扰项署名和低可成题率不采用。精确事实见 `docs/moegirl-quiz-component.md`。
- 2026-08-06 外部开放数据补充：`art-glimpse` 的可见名称为“名画猜猜（克利夫兰艺术博物馆）／Artwork quiz (Cleveland Museum of Art)”，使用一次 CMA CC0 馆藏元数据 GET；玩家可多选“看名片找画”和“看画找名片”，前者加载四张本局官方 JPEG，后者只加载一张线索图，均不使用局部裁切或 `canvas`。题名、作者、年代可独立开关且至少保留一项，默认题名与作者；两个方向都只显示当前启用字段，候选四项的可见字段组合必须互不重复，揭晓再恢复完整资料。图片按 API 报告的单图 1.2 MB／整局 4 MB 声明预算筛选，实际传输由馆方决定；开放馆藏可能包含宗教、神话或非色情人体形象，界面须在开始前披露。`anilist-role-quiz` 可见名称为“动画主角猜猜（AniList）／Anime protagonist quiz (AniList)”，一次 AniList GraphQL POST（浏览器通常另有 CORS 预检）读取六部动画的文字角色关系；玩家可多选动画找主角、主角找动画、同作主角配对三种无歧义四选一，即时反馈直接陈述角色与作品关系，精确 `MAIN` 语义留在说明与署名。“主角之一”对应 AniList `MAIN`，可能有多位，不代表本站按戏份另行判断。两款游戏应用设置时清空当前局但不联网，设置只留在页面内存。AniList 题不取封面或简介，中文作品名保留原文／罗马字，角色有原文时显示“原文名（拉丁字母名）”，成人过滤不宣传为完整分级。Wikidata、MusicBrainz、AIC、Bangumi 与 Commons 均已按稳定性、浏览器标识、媒体可达性或隐私闸门停止，不得把未过闸门原型接入生产索引；证据见对应 2026-08-05 文档。
- 全站基础样式以 `assets/css/main.scss` 为入口，本站自定义规则按环境光、页眉、首页、评论、索引、文章、次级页面和响应式边界拆分在 `_sass/site`；源码级样式契约通过 `tests/scss_source.py` 按本地 `@use` 语义聚合后检查。只服务 `/toys/` 与 `/en/toys/` 的样式位于 `assets/css/toys.scss`，由 `nav_key: toys` 条件加载。页面运行时只保留当前实际使用的 D3、Mermaid 与本地 MathJax 配置；新增第三方资源时必须同时更新 CSP、构建契约与浏览器回归。
- CSP 不再使用泛化的 `https:` 来源：脚本仅允许同源、必要内联、jsDelivr 与 Giscus；图片额外允许 CMA 官方图片 CDN；frame 仅允许 Giscus；connect 仅允许 Giscus、AniList、CMA API 与萌娘百科 API。外部服务维护探针都是显式 opt-in，不进入普通 CI；AniList 单请求入口为 `tests/tools/audit-acg-relation-quiz-live.mjs --run-live`，构建后外链维护入口为 `scripts/check_site.py --site _site --external-links`。
- 默认布局的正式页面在正文后只提供评论区：评论使用仓库已启用的 GitHub Discussions、`Announcements` 公告分类与 Giscus，按严格 `pathname` 分离每个页面及中英文 URL。“评论公开保存在 GitHub Discussions”中的 Discussions 名称直接链接到评论分类。默认页面只渲染本地说明、手动显示按钮和默认关闭的“在本站自动加载评论”单行选项，不再另设重复的加粗标题或说明；普通显示只加载当前页且不持久化，只有读者明确勾选自动加载后才保存 `localStorage` 键 `yiyuiii.comments.v1=auto`、立即加载并在今后正式页面自动请求 `giscus.app` / GitHub，取消时删除该键但不卸载当前评论。该键不得保存路径、时间、身份或其它访问数据；无效值和存储失败按关闭处理且不得自动联网，不得增加 Cookie、`sessionStorage` 或其它评论存储。说明与按钮披露当前空评论区首次加载约 `0.13 MB`，并注明实际用量随评论内容变化；加载失败可重试，无 JavaScript 时自动加载选项隐藏、内嵌 Discussions 链接仍可用。评论语言和明暗主题跟随当前页面，使用 Giscus 官方 `light` / `dark` 主题并保留原生署名位置，不依赖、隐藏或重排 iframe 内部结构；`giscus.json` 只允许正式域名与 loopback 本地预览嵌入。重定向兼容页与双语 404 排除评论和反馈。此前的全站 Issue／邮件反馈组件及站内文案已于 2026-08-04 移除；`.github/ISSUE_TEMPLATE/page-feedback.yml` 作为仓库原生 Issue Form 保留，但站内不再渲染或链接它。用户已完成 Giscus GitHub App 的仓库级授权，Giscus 官方分类接口已返回仓库及 `Announcements` Node ID，CI artifact 上的中英文真实 iframe、登录入口与明暗主题同步均已验证。
- `/about/` 与 `/en/about/` 的个人文案、栏目和链接集中在 `_data/about.yml`；捐助与联系说明位于 `links.intro`，渲染在“我的链接”标题之后、链接列表之前；`education` 数据保留但由共享 `display.hidden_blocks` 暂时隐藏。问候、正文、栏目分隔线、详情列表、捐助说明和链接共同占满页面现有的 `52rem` 版心，详情列表与分隔线保持原有宽度，正文不再单独使用 `ch` 宽度；窄屏随可用宽度收缩。中英文树的 ID、层级和顺序必须对应；所有 About ID 只允许小写字母、数字和单个下划线，允许 `3d_printing` 一类数字开头，不允许连字符、波浪号、首尾或连续下划线。完整编辑与双语哈希流程见 `docs/content-editing.md`。
- 除双语 404 外，默认布局页面具有独立的明亮/夜晚主题与环境光：页眉外观按钮用 `yiyuiii.theme.v1` 保存严格的 `light` / `dark`；JavaScript 可用时左上头像用 `yiyuiii.sunlight.v1` 保存严格的环境光 `on` / `off`，明亮样式显示极慢旋转的暖日光，夜晚样式即时换为冷月晕与稀疏月光束，reduced-motion 停止旋转但保留静态光。两个偏好互不覆盖；无 JavaScript 时头像仍返回当前语言首页，外观/环境光按钮隐藏。
- 色差挑战的三种题型分别使用独立的 25 级 `ΔE_OK` 曲线；所有题最终 8-bit RGB 回算后的两色 OKLab 亮度中点固定在 `0.52..0.68`，并复核目标变化方向、色相范围与实际色差。明暗保持 `a/b`、鲜淡保持 `L/h`、色相保持 `L/C`；普通级目标方向占比至少 `72%`，量化边缘级至少 `58%`。精确生成、回退、设置和固定难度语义见 `docs/toy-challenges.md`。
- docs 已由 _config.yml 排除，不会生成公开页面。
- 11 篇迁移前旧文已获得稳定 `uid`、`translation_key` 和显式 permalink；2 篇英文源位于 `/en/posts/`，原 URL 通过 legacy 重定向兼容。
- 11 篇旧文已全部完成双语配对；《SETI》、2026-08-08 从 Obsidian 外化的四组随笔、《工业革命：匹兹堡》规则教学，以及 2026-08-12 新增的综合训练系统也均有完整中英文版本，因此当前共有 18 组、36 篇随笔。`_data/translation_exemptions.yml` 现为保留架构的空闭集。新文章必须双语发布，不得新增豁免。
- 2026-08-10，当前 16 组、32 篇随笔已按领域共识术语和阅读负担原则完成全量整理；主称呼、首次定义、双语语义、修订记录及结构契约见 `docs/all-posts-reader-language-2026-08-10.md`。SETI 资源量化研究底稿继续暂缓，不属于公开随笔候选。
- 2026-08-11，全站普通代码块已在共享 `_sass/site/_article.scss` 中默认对齐 `50rem` 正文栏，额外宽度改为显式 `article-wide` 语义；《大创造时代》中英文随笔各自的 14 个换算式代码框继续使用 `article-conversion` 保持紧凑宽度与等号对齐。`tests/browser/article-layout-round3.spec.mjs` 同时检查 Minecraft 双语随笔的普通代码对齐、宽代码显式覆盖，以及两种语言换算框的完整数量、逐框对齐和页面横向溢出。
- 2026-08-11，《工业革命：匹兹堡》双语规则教学已纳入候选；文章按摆桌、回合结构、资源运输、六种行动、完整首轮与时代结算的顺序组织，以当前公开多人规则稿为版本边界，配图来源和规则审计分别记录在 `docs/article-assets/202608102107.yml` 与 `docs/brass-pittsburgh-rules-audit-2026-08-10.md`。
- 2026-08-11，《四种颜色的外套》中英文随笔已重构为同一虚构模特的受控穿搭图谱与个人衣橱验证流程：综合图只改变同款外套颜色，四张分组图固定各自外套并比较支持搭配；正文明确区分图内相对比较、实物色貌、个人偏好与耐用证据，生成提示、参考输入、尺寸和 SHA-256 记录在 `docs/article-assets/202608081100.yml`，研究与视觉协议见 `docs/four-color-outerwear-research-2026-08-11.md`。
- 2026-08-11，《Minecraft 服务器的最小运维闭环》已完整重写为《状态型服务的运维方法：以 Minecraft Java 服务器为例》及对应英文版；原 `uid`、日期、URL 与题图保持不变。文章以依赖、配置与身份、可变状态、运行证据四类对象为模型，以单写者、可复现、可恢复、可观测四项不变量贯穿兼容性、信任边界、容量、备份、升级和排障；动态版本只指向官方入口，论断边界、来源矩阵与验收设计见 `docs/minecraft-server-operations-research-2026-08-11.md`。
- 《与珍珠鸟建立信任》于 2026-08-09 二次重构为《与珍珠鸟建立信任：从行为机制到可检验训练》：以社会性、情境应激、个体差异和联结学习的原始研究为起点，明确实验到家庭的外推边界，再用健康／刺激负荷／退出能力／社会情境／学习历史／动机六变量模型推导基线指标、五阶段协议、故障诊断和停止条件；中英文保留原 `uid`、日期、URL 与题图。
- 2026-08-08 已在 `content/evergreen-article-rewrite-20260808` 外部工作树完成 GitHub Pages、强化学习、云服务器和游泳四组中英文随笔重构，并同步完成无效资源声明清理、外链检查器加固、SCSS 八模块拆分与维护文档修正；随后将 `codex/obsidian-export-20260808` 工作树中的四组新随笔、12 项题图及索引派生资产、来源登记和首页条目合并进来，强化学习文章保留原常青教程并融合开放任务分布、元强化学习混淆、长时程和视觉预训练内容。2026-08-08 首轮候选曾通过 Replit 完成端到端审阅，这只属于历史实验；2026-08-09 珍珠鸟二次重构又通过 392 项 Python、77 项 JavaScript、production Jekyll 构建、70 条旧 URL 和 169 项浏览器回归，同日开始把审阅流程迁移到 `preview/review` 的 GitHub artifact 与本机 loopback。截至 2026-08-09，该候选尚未合入正式 `master`。2026-08-11 已继续整合《工业革命：匹兹堡》双语教程，并完成 403 项 Python、77 项 JavaScript 和 169 项浏览器回归；用户随后授权正式发布。每次判断发布状态时，应复核当前 Git refs、GitHub run SHA、artifact 内 `preview-source-sha.txt` 和正式 Pages 运行结果。范围、来源、交叉审阅修正和验证证据记录在 `docs/evergreen-article-rewrite-2026-08-08.md`；合并、继续修改或放弃工作树时必须同步更新。
- `scripts/translation_guard.py` 同时保护翻译 source hash、成对 URL、结构签名、修订日期与题图元数据；题图 alt/图注可本地化，但共享 thumbnail、图注 Markdown 结构和链接目标／顺序受保护。普通代码围栏逐字保护，Mermaid 仅允许独立 `ID(可见标签)` 节点的标签本地化，图类型、节点 ID、形状和边仍必须一致。
- 2026-08-07 本轮复核时，Ark Coding Plan 返回月度额度耗尽，本地 Kimi 在 4 分钟内无输出，DeepSeek API 仍不可用；这些是动态状态，未来每次使用前必须重新复核，不得把本次结果当作永久不可用。

## 常用验证

环境前提与首次依赖安装以 README.md 的“验证”为准。非浏览器完整验证与发布级完整验证分别使用：

```powershell
python scripts/validate.py
python scripts/validate.py --browser
```

项目同步检查需要设置可用的 `GITHUB_TOKEN`；若使用 GitHub CLI，应先 `gh auth login`，再用 `gh auth token` 设置该环境变量，CI 会自动提供凭据。`npm ci` 属于首次准备。统一入口用子进程环境临时设置 `JEKYLL_ENV=production`，只针对成功生成的 `_site` 执行产物、旧 URL 与浏览器检查；浏览器入口只给测试子进程设置 `SITE_URL`，并负责在所有退出路径关闭服务器。聚焦排查时可以运行底层测试，但发布验收不得用零散命令替代统一入口。

## 关键文档

- 2026-08-07 维护收口：docs/maintenance-closeout-2026-08-07.md
- 2026-08-11 依赖安全基线：docs/dependency-security-baseline-2026-08-11.md
- 内容维护：docs/content-editing.md
- GitHub 测试分支与本地审阅流程：docs/preview-workflow.md
- 2026-08-08 持久型随笔重构：docs/evergreen-article-rewrite-2026-08-08.md
- 2026-08-10 全站随笔术语与阅读负担整理：docs/all-posts-reader-language-2026-08-10.md
- 2026-08-11《四种颜色的外套》研究与视觉协议：docs/four-color-outerwear-research-2026-08-11.md
- 《四种颜色的外套》正文生成图来源：docs/article-assets/202608081100.yml
- 2026-08-11 Minecraft 服务器运维研究与论断边界：docs/minecraft-server-operations-research-2026-08-11.md
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
- 《工业革命：匹兹堡》正文图片来源：docs/article-assets/202608102107.yml
- 《工业革命：匹兹堡》规则与版本审计：docs/brass-pittsburgh-rules-audit-2026-08-10.md
- 萌娘百科猜猜组件：docs/moegirl-quiz-component.md
- 动画主角猜猜（AniList）：docs/acg-relation-quiz-component.md
- ACG／听声候选闸门：docs/acg-sound-candidate-gates-2026-08-05.md
- 名画猜猜（克利夫兰艺术博物馆）：docs/toy-art-glimpse.md
- 时间线候选闸门：docs/toy-timelines-feasibility-2026-08-05.md
- 萌娘百科题库质量实测：docs/moegirl-quiz-quality-audit-2026-08-03.json
- 萌娘百科英文题源审计：docs/moegirl-quiz-english-source-audit-2026-08-04.md
- “百科条目猜猜”多来源改造开工计划：docs/superpowers/plans/2026-08-05-encyclopedia-entry-quiz.md
- 外部开放数据小游戏并行实施计划：docs/superpowers/plans/2026-08-05-multi-external-toys.md
- 本地轻量挑战：docs/toy-challenges.md
- 随机生成器：docs/toy-generators.md
- 小玩意扩充路线：docs/toy-expansion-roadmap-2026-08-04.md
- 小玩意按首次展开加载：docs/toy-loading.md
- 小玩意 M2 体验审计：docs/toy-experience-audit-2026-08-07.md
- 外部开放数据小游戏调研：docs/toy-external-dataset-research-2026-08-05.md
- 数字 Wordle：docs/toy-codebreaker.md
- 凑成 24：docs/toy-make-24.md
- 翻灯：docs/toy-lights-out.md
- MathJax 同源资产：docs/mathjax-localization.md
- 性能与语义标题基线：docs/experience-quality-baseline-2026-08-03.md
- 内容体验集中优化：docs/superpowers/plans/2026-08-03-content-experience-round5.md
- 全站 GitHub Discussions 评论：docs/superpowers/plans/2026-08-03-page-comments.md
- 代码库工程收敛与体验修复：docs/superpowers/plans/2026-08-07-repository-hardening.md
- 下一阶段交付收口、小玩意按需加载与单一原型：docs/superpowers/plans/2026-08-07-next-phase-toys.md
- AI 历史总结：docs/agent-memory/history.md

## AI 历史总结

过往实施与验证时间线已移至 `docs/agent-memory/history.md`。其中内容仅供回溯，恢复工作时先复核本文件的当前事实、专题文档、代码和现行测试。

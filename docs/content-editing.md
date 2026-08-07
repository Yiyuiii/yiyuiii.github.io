# 主页内容维护

这个站点把长文本、短界面文案、公开仓库数据和论文数据分开保存。修改内容时优先编辑源文件，不要把正文写进布局、样式或脚本。

## 中英文排版基线

中文自然语言使用全角逗号、句号、分号、冒号、问号和感叹号，英文自然语言使用对应的半角标点。Markdown 链接语法、URL、表情、版本号、程序标识、公式、代码，以及 `LLM + Home Assistant` 一类技术表达按原语法保留，不做机械全角化。检查标点时必须区分自然语言与结构／技术语法；旧文章的批量规范化应作为独立内容修订处理，并同步对应英文、翻译哈希与验证，不要混进无关页面改动。

## 欢迎页与内容流

`/` 与 `/en/` 是中英文欢迎页，所有人工欢迎文案集中在 `_data/home.yml`。这里维护欢迎标题、介绍、页眉功能指引、“随机发现 / 浏览起点 / 最近更新”等分区文字、内容类型名称和无 JavaScript 说明；不要把这些可见文字写进 `_includes/home-feed.liquid`、`assets/js/home-feed.js` 或 CSS。两种语言必须保持完全相同的键、列表结构和指引目标。

`/writing/` 与 `/en/writing/` 才是随笔索引。左上品牌链接回当前语言欢迎页，页顶“随笔 / Writing”进入对应索引；旧 `/?tag=...` 在 JavaScript 可用时会保留完整 query 与 hash 迁移到随笔索引，无 JavaScript 时欢迎页提供自然入口。

欢迎页的混合内容流只在 `_data/home_feed.yml` 维护稳定引用，不重复抄写标题、摘要、URL 或日期。每条记录只能有：

```yaml
- id: "writing:202302032000"
  kind: writing
  ref: "202302032000"
```

- `writing` 的 `ref` 是文章 `uid`；`project` 是 `owner/repository`；`publication` 是论文 `key`。
- `id` 必须严格等于 `<kind>:<ref>`，创建后不得改变。
- 首页统一显示并按 `marker_date` 排序；这个运行时标志日期从内容自己的来源解析，不在首页清单手填：
  - 随笔：有 `revisions` 时取第一条初稿日期，否则取文章 `date`；第一条修订日期必须和 `date` 相同。`uid` 只是稳定身份，不承载日期语义，不能从 UID 或文件名推算日期。
  - 项目：取 `_data/project_repositories.yml` 的 `created`，其日期由 `scripts/sync_projects.py` 在每次 CI 中和当前公开仓库的 GitHub API `created_at` 对照，再换算为香港自然日；它只表示仓库创建，不证明创建时已经公开。
  - 论文：取 `_data/publications.yml` 的 `first_public`；日期、精度、权威来源 URL 和来源字段必须一起维护。
- `created` 与 `first_public` 记录都固定包含 `date`、`precision`、`source_url`、`source_field`。当前条目都具有到日证据并使用 `precision: day`。若未来权威来源只能确认年份，必须用 `precision: year` 和 `YYYY`，页面只显示年份；不得伪造 1 月 1 日。
- 所有公开来源都必须恰好出现一次；不得增加 `featured`、`priority`、`score`、类型配额或其它隐性排序字段。
- 运行时严格按标志日期降序、同日 `id` 升序，显示最近 8 项。年精度条目排在同年所有已知到日条目之后，再按 `id` 稳定排序；这个位置只代表日期精度不足，不暗示 1 月 1 日。
- “随机发现”（英文 “Random discovery”）只从中英文都有内容、且不在任一语言最近 8 项中的共同身份抽取。每次载入或刷新欢迎页都会重新抽取；页面从浏览器 BFCache 恢复时也会重新抽取。中英文页面各自独立抽取，不承诺相同身份，连续两次也可能合理地抽到同一项。
- 抽样使用浏览器 `crypto.getRandomValues()` 产生 32 位无符号整数，并通过拒绝采样消除直接取模的偏差。不要改用 `Math.random`，也不要使用日期、手写随机表或访问历史影响结果。
- 随机发现只读取构建产物中的候选列表，不记录访问，不使用 Cookie、`localStorage`、`sessionStorage` 或外部请求。禁用 JavaScript、候选为空或随机源不可用时显示预渲染的固定“浏览起点”，不伪装成随机结果。
- 后续修订、GitHub push、Star/Fork、本站构建与整理日期都不得改变“最近更新”顺序或随机候选边界。
- 当前 26 条日期及其来源见 `docs/home-feed-date-sources.md`；修改日期字段时必须同步复核该清单与契约测试。

修改欢迎文案或内容流后运行：

```powershell
python -m pytest -q tests/test_home_contracts.py tests/test_check_site.py
python scripts/translation_guard.py --write _pages/home.en.md
python scripts/translation_guard.py --check --production
node --check assets/js/home-feed.js
```

## 关于yiyuiii

日常编辑只需要打开一个文件：

```text
_data/about.yml
```

它同时保存语言无关的显示设置 `display`、中文 `zh`、英文 `en`、整页栏目顺序、每栏条目、链接标签和 URL。`_pages/about.md` 与 `_pages/about.en.md` 只是路由入口，普通内容调整不要修改它们；Liquid 和 CSS 也不保存个人文案。

当前 block 顺序为：

```text
greeting → aesthetics → education → research → interests → skills → links
```

也就是 Ciallo、灵魂基调、教育经历、科研方向、兴趣方向、日常技能、我的链接。“我的链接”内部固定为 `heading → intro → items`：栏目标题下先显示捐助与联系说明，再显示四个链接。每个 block、段落、条目、教育字段和链接都有语言无关的 `id`。中英文两棵树的 ID、层级、顺序和字段必须对应；可见文字可以不同。

About 的问候、正文、栏目分隔线、详情列表、捐助说明和链接共同占满页面现有的 `52rem` 版心；窄屏时随可用宽度收缩。详情列表与分隔线保持原有宽度，正文不再单独使用 `ch` 宽度，否则会因为中西文字宽基准不同，再次形成正文窄、列表和分隔线宽的不协调布局。

### 临时隐藏或恢复栏目

页面当前通过文件开头的共享设置隐藏“教育经历”：

```yaml
display:
  hidden_blocks:
  - education
```

这里只控制中英文页面的共同显示状态，不会删除下面两棵语言树中的教育内容。需要恢复时，从 `hidden_blocks` 删除 `education`；需要临时隐藏其它栏目时，只能填写同时存在于 `zh.blocks` 和 `en.blocks` 的 block `id`。修改后仍应运行翻译守卫和预览检查。

### 修改一条说明

例如修改“唱歌”，分别找到中英文的 `id: singing`，只改 `description`：

```yaml
- id: singing
  name: 唱歌
  description: 正在练声，最熟的歌单基本被周杰伦承包了。
```

```yaml
- id: singing
  name: Singing
  description: I am working on vocal fundamentals; Jay Chou has more or less taken over the part of my songbook I know best.
```

### 新增一个兴趣或技能

在 `zh` 与 `en` 对应的 `items` 中放到相同位置，使用同一个新 ID：

```yaml
- id: coffee
  name: 咖啡
  description: 目前主要尝试手冲，仍在熟悉不同豆子、研磨度和水温的影响。
```

```yaml
- id: coffee
  name: Coffee
  description: I currently focus on pour-over coffee and am still learning how beans, grind size, and water temperature affect the result.
```

ID 只能使用小写英文、数字和单个下划线，不得有连字符、波浪号、首尾下划线或连续下划线；为了兼容稳定的 `3d_printing`，允许数字开头。ID 创建后尽量不要改。删除条目时也要同时删除中英文两份。

### 新增或重排栏目

重排时移动完整的 block，并在 `zh.blocks` 与 `en.blocks` 中保持完全相同的 ID 顺序。不要只移动标题。现有五种类型是：

- `greeting`：页面唯一的一级标题；
- `prose`：带普通段落的文字栏目；`heading` 可省略，但当前数据没有无标题的 `prose` block；
- `education`：时间、学校、专业或院系、培养阶段；
- `details`：名称与完整说明；
- `links`：栏目标题、标题下的 `intro` 说明，以及带既有图标的链接。

新增普通文字栏目可复制下面两个完整 block：

```yaml
- id: current_notes
  type: prose
  heading: 近期想法
  paragraphs:
    - id: summary
      style: normal
      inline_markdown: 这里写一段简短、客观的中文说明。
```

```yaml
- id: current_notes
  type: prose
  heading: Current Notes
  paragraphs:
    - id: summary
      style: normal
      inline_markdown: Write the corresponding concise English paragraph here.
```

如果需要现有五种类型之外的全新视觉结构，才需要修改 `_includes/about-profile.liquid` 与 `assets/css/main.scss`。

### 修改链接

“我的链接”标题下、四个链接上方的捐助与联系文字位于 `links.intro.paragraphs`。`intro`、`donation`、`contact` 是稳定 ID；修改时只改中英文对应的 `inline_markdown` 或 `style`，不要把 `intro` 移回顶层 block。

链接顺序、标签和地址也在同一个 `links` block 中。中英文 URL 和行为字段必须相同，只翻译 `label`：

```yaml
- id: github
  icon: github
  label: GitHub
  url: https://github.com/Yiyuiii
  relative: false
  new_tab: true
```

可用图标键只有 `github`、`email`、`rss`、`paypal`。站内路径设置 `relative: true`；新窗口外链同时设置 `new_tab: true`。

### 文字与 YAML 注意事项

- 每层保持两个空格缩进，不使用 Tab。
- 含 `: `、`#` 或容易被 YAML 误解的标点时，用双引号包住整句。
- 英文所有格可以使用弯引号 `’`；若使用直撇号并用单引号包字符串，需要写成两个单引号。
- 一段较长文字仍可放在一行；若改用 `>` 或 `|` 多行语法，后续行必须继续缩进。
- `inline_markdown` 与 `description` 只支持 `*斜体*`、`**粗体**`、`[文字](https://...)` 和 `[文字](mailto:...)`。
- 不要放原始 HTML、图片、标题、列表、代码反引号、HTTP 链接或带 title 的 Markdown 链接。
- 履历只记录时间范围和公开事实，不从结束年份推断“当前在读”“已毕业”或其它状态。
- 不要把手机号、出生日期、政治面貌、涉敏项目、合作单位或未公开投稿复制到公开页面。

### 用 LLM 同步英文

修改中文后，可把下面提示词连同完整 `_data/about.yml` 交给 LLM：

```text
请更新这个 YAML 的 en 树，使其逐项准确翻译当前 zh 树。只翻译用户可见的
heading、text、aria_label、label、name、description、value 和
inline_markdown 字符串。必须原样保留所有 id、type、style、icon、url、
relative、new_tab、键名、列表层级、条目数量和条目顺序；Markdown 链接目标
不得改变。不要添加、删除、合并或概括条目，不要输出解释，只返回完整 en 树。
英文应自然、像本人在聊天，保留中文里的轻松、自嘲和玩心，但不得发明经历、
身份或能力，也不要把个人偏好改写成履历或宣传稿。
```

把返回的完整 `en` 树替换回文件后，刷新中文来源 hash：

```powershell
python scripts/translation_guard.py --write-about _data/about.yml
python scripts/translation_guard.py --check --production
```

`--write-about` 不会翻译文字。它会先检查中英文结构、英文完整性和 Markdown 安全性；只有全部通过才更新 `translation.source_hash`。如果只改中文而没有同步英文，直接手改 hash 会掩盖过期翻译，不要这样做。

提交前再运行：

```powershell
python -m pytest tests/test_about_contracts.py tests/test_translation_guard.py tests/test_style_contracts.py -q
python scripts/translation_guard.py --check --production
git diff --check
```

本机没有 Ruby 时，Jekyll 预览由 GitHub Actions 的 `site-preview` artifact 提供。下载并在端口 62091 启动后，按本文末尾的浏览器命令检查 1280、641、640、390 与 320 像素宽度。

## 导航和短界面文字

中文与英文短文案都在 `_data/site_text.yml`。两种语言必须保留完全相同的键：

主导航固定按“欢迎｜随笔｜GitHub｜论文｜小玩意｜关于yiyuiii”的顺序展示；英文使用同样的六项结构。欢迎页和“小玩意”都是正式导航目的地，因此对应中英文页面必须分别声明 `nav_key: home` 与 `nav_key: toys`，让当前页只标记一个 `aria-current="page"`。修改导航后要同时检查 820、640、390 与 320 像素宽度，不能让链接横向溢出。

```powershell
python scripts/translation_guard.py --check --production
```

404 页的中英文标题、说明和返回链接也在这里维护。`_pages/404.md` 只声明公开路径，`_layouts/not-found.liquid` 会根据缺失 URL 是否以 `/en/` 开头选择一种语言显示；不要恢复自动跳转，否则英文缺失路径会被带回中文首页。

## 小玩意索引

`/toys/` 与 `/en/toys/` 共用 `_includes/toy-index.liquid`，条目标题、说明、关键词、分组和页首短引言集中在 `_data/toys.yml`。页面视觉上不重复显示“小玩意 / Toys”大标题，但保留一个仅供语义和无障碍使用的一级标题。全部功能按单栏原生 `details` 排列；简单功能直接在条目内展开，未来只有确实复杂、适合独立页面的功能才跳转。页面只收录已经能在生产站使用的轻量互动，尚未实现、依赖接口仍在评估或只有想法的条目不要先写成“可用”。

数据先按 `groups` 分组；不需要可见分组标题时把 `title` 设为 `null`。新增条目时复制一个完整记录，并维护以下字段：

```yaml
- id: example-group
  title:
    zh: 示例分组
    en: Example group
  items:
    - id: example-toy
      title:
        zh: 示例小玩意
        en: Example toy
      description:
        zh: 准确说明它现在能做什么。
        en: Describe exactly what it can do now.
      keywords:
        zh: [示例, 互动]
        en: [example, interactive]
```

- 分组和条目的 `id` 只用小写英文、数字与连字符，创建后保持稳定；条目 ID 同时是页面锚点和搜索结果目标。
- `title`、`description`、`keywords` 必须完整提供中英文，两个页面始终按同一 `groups → items` 顺序渲染。
- 新增内嵌功能时还必须在 `_includes/toy-index.liquid` 的显式 `case` 白名单中增加组件 include；不要根据数据拼接任意模板名。
- 搜索索引会遍历每个分组下的条目并读取标题、说明和关键词，不要在搜索模板里重复抄写。
- 当前不提供随机名字。随机密码和随机数字的文案维护在 `_data/toy_generators.yml`；实现、安全边界和验证见 `docs/toy-generators.md`。
- 色差挑战、盲估十秒和反应时间的组件边界见 `docs/toy-challenges.md`。三者不联网；色差不保存，两个计时挑战只在浏览器本机用各自精确键保留最近 100 次完成记录并允许清空。折叠条目或隐藏页面时会取消正在进行的计时，取消不写历史。
- 猜图类功能不得自行维护一个固定小数据集。只有能接入庞大、许可和接口稳定性可核验的外部数据集时才立项，否则不做。

萌娘百科猜猜是索引页中的渐进增强组件：稳定折叠锚点仍是 `#moegirl-quiz`，可见标题和说明由统一清单提供，组件自身不重复标题。唯一题源是中文萌娘百科；随机批次、近期排除窗口与双语文案维护在 `_data/moegirl_quiz.yml`，筛选、匿名化、请求时机和许可说明见 `docs/moegirl-quiz-component.md`。中英文页面都明确说明题目为中文。打开页面或展开折叠项不联网；只有用户点击开始后才向萌娘百科官方 API 发起一次随机纯文字 GET，每轮不得静默追加请求。不要增加来源选择器、Wikipedia 回退、页面预载、后台预取、固定小白名单、远程题图、图片复制或静默追踪。

修改后运行：

```powershell
python -m pytest -q tests/test_toys_contracts.py tests/test_encyclopedia_quiz_contracts.py tests/test_toy_generators_contracts.py tests/test_toy_challenges_contracts.py tests/test_source_contracts.py tests/test_check_site.py
python scripts/translation_guard.py --check --production
node --test tests/toy_challenges.logic.test.mjs tests/toy_challenge_history.logic.test.mjs tests/toy_color_challenge.logic.test.mjs
```

## 随笔

- 正文：`_posts/*.md`
- 中文文章使用 `lang: zh`，英文文章使用 `lang: en`
- 新文章必须同时提供完整中英文版本；当前 12 组、24 篇随笔已经全部配对，`_data/translation_exemptions.yml` 必须保持空闭集，不能加入新豁免
- 每组共用引号包裹的 12 位 `uid` 和 `post-<uid>` 形式的 `translation_key`
- 中文 URL 位于 `/posts/`，英文 URL 位于 `/en/posts/`，并且全部使用显式 `permalink`
- `tags` 是文章自己的真实标签；随笔索引会按当前语言中的全局出现频率自动排序
- 每篇已发布随笔都必须声明共享的 `thumbnail: /assets/posts/...`，以及只含本地化 `alt`、`caption` 的 `article_cover`；题图由统一组件渲染，不要在 Markdown 正文重复插入首图和图注

文章正文和原有永久链接不要为了索引或欢迎页展示而改写。`excerpt` 保留文章原有开场或背景，`description` 专门承担索引、欢迎页、搜索和 SEO 简介；已发布随笔必须同时保留两者。简介应先回答读者要解决什么问题，再说明本文提供的具体方法、顺序或证据，以及它相较零散教程、单点点评、固定节奏视频等同类资料的优势。不要复述标题、罗列主题或只写“记录了一些经验”，也不要使用无法由正文支持的宣传判断。中文控制在 100 字以内，英文控制在 200 个字符以内；页面不会再自动截断。欢迎页从同一 `description` 读取，不另存重复摘要。

### 正文标题与统一排版

文章布局会用 front matter 的 `title` 生成页面唯一的一级标题。Markdown 正文必须从二级标题开始，只使用连续的二级、三级和四级层次：

```markdown
## 主要章节

### 子章节

#### 更细的说明
```

不要在正文重复文章标题，不要从二级标题直接跳到四级标题，也不要用加粗段落代替标题。新增、翻译或重排章节时，应同时检查宽屏侧边目录与较窄视口中的正文内折叠目录；标题文字会参与生成公开片段锚点，已发布标题不要只为视觉效果改名。

所有随笔共用 `assets/css/main.scss` 中唯一一套 `.post-content` 排版。文章不得添加仅供自己使用的 CSS class、ID 或样式文件来调整字号、字距、列表、代码块和图片。中英文可以通过页面 `lang` 使用同一系统内的语言级规则，但不得按文章分叉。

含公式的中英文文章必须同时声明 `math: true`。行内公式使用 `$...$`，独立公式使用 `$$...$$` 或项目既有等价写法；变量下标与单位使用标准 TeX，例如 `\rho_{\mathrm{water}}`、`985\,\mathrm{kg/m^3}`，不要把中文字符直接写成未分组下标，也不要在数学式中混用程序语言的 `*`。MathJax 3.2.2 运行时和 CHTML 字体固定在 `assets/vendor/mathjax/3.2.2/`，路径与完整性值集中在 `_config.yml`，加载器位于 `assets/js/mathjax-loader.js`；修改公式、加载器或本地化资产后应运行 `tests/browser/math-rendering-round3.spec.mjs`，它会在阻断站外请求的条件下覆盖全部 16 个现有中英文公式页。

极少数历史文章可能在正文中保留不可见的显式片段锚点，以兼容已经公开的旧链接。它不是标题，也不要随意删除或改名；制作对应翻译时，应让双方的标题层级和显式 ID 保持一致，便于翻译结构签名检查图片、公式、代码、章节和锚点的对应关系。

真实原稿一方不写 `translation_source`；译文用该字段指向原稿，并保存 `translation_status: current` 和 `source_hash`。双方只有在文件都实际存在时才写 `translation_url`，且必须互相指向对方的显式 `permalink`。不要为了统一方向，把两篇英文旧文的中文译文反过来定义为原稿。

修改原稿后，必须先同步复核并更新译文语义，再刷新译文 `source_hash`；不要通过增加翻译豁免绕过差异。守卫会检查题图字段与来源链接、正文图片目标、公式、代码块、行内代码、外部链接、可映射的站内文章链接、表格行列轮廓、标题层级、显式锚点、脚注、资料说明标记和修订日期是否对应；仍需另行复核自然语言语义，不能只刷新 hash：

```powershell
python scripts/translation_guard.py --write "_posts/<译文文件>.md"
python scripts/translation_guard.py --check --production
```

### 维护修订历史

文章标题下方依次显示文章标签与“修订历史”。折叠时只显示“修订历史”，不会用次数强调编辑过程；读者展开后才会看到初稿日期、最近修订日期和各次说明。

需要公开修订说明时，在文章 front matter 中加入：

```yaml
revisions:
  - date: "2022-11-11"
    note: 初稿
  - date: "2026-07-29"
    note: 补充资料来源，校正硬件型号、成本及部分技术表述；保留 2022 年视角（ChatGPT 协助）
```

- 日期必须加引号并使用 `YYYY-MM-DD`，按时间从早到晚排列。
- 第一条日期必须等于文章 `date` 换算为香港时区后的自然日。
- `note` 应简练说明这版对读者有意义的变化，不必记录标点修改等琐碎操作。
- 没有需要公开的修订过程时，省略整个 `revisions` 字段；页面会用文章日期显示一条初稿记录。
- 不要写空的 `revisions: []`，也不要让中英文成对文章的修订日期错位。

### 章节导航与资料说明

阅读页会根据正文中的二级、三级标题自动生成导航：小于 `1536px` 时显示正文内原生折叠目录，从 `1536px` 起显示 `13rem` 的左侧粘性目录，并与 `72rem` 宽内容画布保持 `2rem` 间隔。粘性边界覆盖正文和评论区，但不覆盖页眉与页脚，因此目录能随评论继续滚动，同时不会遮挡左上角环境光入口或底部版权。标题、普通段落、列表、引用和脚注保持在 `50rem` 可读宽度内；题图、独立图片、表格、代码块、`figure` 与 Mermaid 最多使用 `72rem`。图片不会被强制放大超过自然尺寸，宽表格只在自身横向滚动，页面不得横向溢出。正文里不要再手写“目录”小节，也不要为了凑目录强迫文章采用固定结构；没有足够标题时，导航会自动省略。

普通引用继续使用标准 Markdown 引用。只有补充资料、技术规格或来源说明才在引用块后加一行属性：

```markdown
> **资料说明｜示例主题**
>
> 这里写用于支持正文判断的资料、规格或来源。

{: .article-evidence}
```

这类资料块在视觉上会比正文安静，不要求编号，也不要求每篇文章使用。

若以后更换 Markdown 引擎，构建产物把 `{: .article-evidence}` 原样显示为文字，才把对应块改成显式 HTML：

```html
<blockquote class="article-evidence" markdown="1">

**资料说明｜示例主题**

这里写用于支持正文判断的资料、规格或来源。
</blockquote>
```

### 使用 Git 保留多轮修订

正式 master 的维护规则是只保存正式文章，不复制完整旧稿、AI 审阅稿或候选稿；本次正式化分支合并前必须移除现有过程稿与过程封面目录。普通 Git 历史对长期恢复的承诺，仅限已经进入 master 且提交仍可达的正式版本；临时 worktree 或分支中的中间提交在删除分支或 squash 后不保证可达。需要多轮修改时：

1. 从最新 master 创建独立分支或临时 worktree。
2. 修改前先提交或记录基准提交；不要在 docs 下复制整篇文章。
3. 在 _posts 中实施经批准的当前稿，每一轮用独立 Git 提交标记边界。
4. 使用 git diff 比较任意提交；需要恢复时从 Git 历史读取旧版本。
5. 中间版本确需长期保留时，使用经批准的受保护 tag、归档分支、仓库外 git bundle 或专门资产库；不要把过程档案放回 master 当前树，当前正式树只保留具有长期维护价值的结构化事实。

比较文章前后版本：

```powershell
git diff <基准提交>..<当前提交> -- "_posts/<文章文件>.md"
```

文章封面使用 docs/asset-provenance.yml 作为单一生产来源清单。每篇已发布文章的 `thumbnail` 必须恰好由一条记录覆盖，`asset` 也不得重复；同一内容的中英文文章应列在同一记录的 `posts` 中并共享封面，不要复制图片。`article_cover.alt` 与 `article_cover.caption` 按语言人工撰写，但图注的 Markdown 结构、HTTPS 来源链接目标和顺序必须对应；页面统一通过 `_includes/article-cover.liquid` 显示 26rem 内等比、不裁切的正式题图，详细组件契约见 `docs/article-cover-component.md`。更换封面时按以下严格契约同步更新：

- 文件顶层只能包含 `version`、`index_derivatives` 与 `covers`，其中 `version` 为 2，`covers` 为按唯一正式封面组织的记录列表。
- `index_derivatives` 固化随笔索引派生规则：版本 1、160/320 px、WebP quality 75、method 6、Lanczos、Pillow 12.0.0、libwebp 1.6.0，并清除元数据。编码规则变化时必须升级派生版本和文件名，不能原地覆盖旧缓存 URL。
- 公共必填字段为 `asset`、`posts`、`origin_type`、`source_url`、`author`、`license`、`license_url`、`transform`、`sha256`、`dimensions` 与 `attribution`；`posts` 是非空、无重复的文章路径列表；`origin_type` 只能是 `external`、`self-produced` 或 `generated`，除按类型要求为 null 的 URL 外，公共字符串字段必须非空。
- `asset` 与 `posts` 中的路径必须使用规范的仓库相对 POSIX 路径，不得含反斜线、绝对路径、空段、`.` 或 `..`；前者位于 `assets/posts`，后者位于 `_posts`，且都必须实际存在。每篇文章的 `thumbnail` 去掉开头 `/` 后必须等于所属记录的 `asset`。
- 生产资产必须是 WebP；`dimensions` 是 `[宽, 高]` 两个正整数并与文件一致，`sha256` 必须与当前生产文件一致。
- `external`：`source_url` 与 `license_url` 都必须是 HTTPS，`author`、`license` 与 `attribution` 必须非空；不得包含生成图专用字段或 `source_asset`。
- `self-produced`：`source_url` 与 `license_url` 必须为 null，`license` 必须为 `project-owned`；可选 `source_asset`，但它只允许用于此类型，并且必须是 `assets` 下实际存在的规范仓库相对 POSIX 路径；不得包含生成图专用字段。
- `generated`：`source_url` 与 `license_url` 必须为 null，`license` 必须为 `project-use-rights`，不得包含 `source_asset`；必须提供非空的 `generator`、`generated_at`、`source_description`、`purpose`、完整 `prompt` 与 `approval`，以及由非空字符串组成的非空 `reference_inputs` 列表。
- 正文必须满足生产封面的使用与外部可见署名要求：通常应能看到对应资产 URL；仅 `purpose` 明确标为 `writing-index cover` 的生成图可只用于文章索引。外部封面的正文必须公开显示 `source_url`、`attribution` 与 `license`，`license_url` 与来源页不同时也必须显示。

上述字段、路径、文件内容和正文可见性要求以 tests/test_asset_provenance.py 与 tests/test_generate_post_thumbnails.py 为权威可执行契约。

正式封面生成或更换后，在仓库根目录生成并检查索引派生图：

```powershell
python scripts/generate_post_thumbnails.py --write
python scripts/generate_post_thumbnails.py --check
```

派生图与原图同目录，命名为 `<原文件名去扩展名>-index-v1-160.webp` 和 `-index-v1-320.webp`；原分辨率正式封面继续供文章正文使用，不得被派生图替换。派生图不在清单中逐项重复保存路径和 SHA-256：每张原图已有受检 SHA-256，`index_derivatives` 又完整固定了尺寸、编码参数、Pillow 与 libwebp 版本，`--check` 和测试会从原图重新编码并逐字节比较提交文件。这条“原图哈希 + 固定编码器与策略 + 逐字节重算”链路是派生文件哈希的单一等价证据，避免两份清单失步。编码器版本不一致时脚本会在处理前明确失败。

### 正文图片与响应式派生图

正文图片的 `alt` 必须描述图中能独立理解的信息，不得只写“图 1／Figure 1”、文件名或空字符串。中英文成对文章保持图片目标与顺序对应，但 `alt` 应分别用当前页面语言自然表达。构建插件会从真实本地 PNG、GIF、JPEG 或 WebP 文件读取固有宽高，并为正文图片加入延迟加载与异步解码；不要在 Markdown 中猜测尺寸，也不要手写与文件不符的 `width`、`height` 或 `srcset`。

需要降低正文大图传输量时，在 `_data/article_image_derivatives.yml` 声明原图、派生文件、宽度和 `sizes`。派生文件与原图同目录，原图继续保留以兼容旧 URL；页面只会输出清单中通过路径、尺寸、编码版本和逐字节重算检查的候选。生成与验证命令为：

```powershell
python scripts/generate_article_images.py --write
python scripts/generate_article_images.py --check
```

调整质量、缩放算法、Pillow/libwebp 版本或候选尺寸时，必须升级策略版本和文件名，不能原地覆盖已经公开的缓存 URL。发布前统一入口会自动执行 `--check`。

### 正文外部图片的来源记录

`docs/asset-provenance.yml` 仍是所有正式题图的唯一生产契约。若单篇随笔还使用了较多外部正文图片、官方媒体包素材或规则书必要裁图，可在 `docs/article-assets/<uid>.yml` 另存一份文章级来源记录，逐项保存正式资产路径、直接来源、处理方式、尺寸与 SHA-256。它只补充正文素材的可追溯性，不替代题图契约，也不保存下载包、完整规则书、未采用候选或过程截图。当前实例见 `docs/article-assets/202608021600.yml`。

计算当前文件 SHA-256：

```powershell
(Get-FileHash -Algorithm SHA256 "assets/posts/<目录>/<封面文件>").Hash.ToLowerInvariant()
```

当前生产使用的生成图必须按上述契约保存生成日期、生成器、完整提示词、参考输入边界、用途和批准状态。未采用候选的原图、生成源和提示词只在确有长期法律或再生成需求时进入专门资产库；不要默认放进站点 master。

## GitHub 仓库

- 人工公开仓库清单：`_data/project_repositories.yml`
- GitHub 仓库简介、内容哈希与站内翻译：`_data/project_cache.yml`
- 仓库创建日期及 GitHub API 证据：`_data/project_repositories.yml` 的 `created`
- star、fork、主要语言、许可证、`updated_at`：每次构建从 GitHub API 获取，不手填

仓库展示顺序不是人工配置：先按 star 降序，同 star 再按 `updated_at` 降序，完全相同时按仓库名稳定排序。`updated_at` 只用于排序，不显示在页面上；人工清单中不要添加 `order`。

主要语言和许可证会自动显示为站内筛选标签，值分别来自 GitHub API 的 `language` 与许可证 SPDX 标识。不要另写项目分类或手工标签。点击标题或项目简介才会打开仓库；语言、许可证、star 和 fork 都不属于仓库外链。

项目卡片以 GitHub 仓库自身的 `description` 为原文来源。简介应准确说明项目解决的问题、主要机制或相较常见替代方案的独特价值；不能只罗列技术名词，也不能在博客缓存中另写一份与 GitHub 脱节的原文。需要改简介时，先在对应 GitHub 仓库页或官方 REST API 更新 `description`，再刷新本站缓存。本站只人工维护另一种语言的翻译。

`created` 的 `source_url` 必须是该仓库的 GitHub API URL，`source_field` 必须是 `created_at`。脚本会把这个 UTC 时间换算为香港自然日后与提交值比较；不要用 `updated_at`、第一次进入本站的日期或最近 push 日期替代，也不要把仓库创建时间表述为已证实的首次公开时间。

GitHub 仓库简介更新后：

```powershell
python scripts/sync_projects.py --update-cache
```

检查新同步的原文，把对应翻译更新到 `project_cache.yml`，将译文的 `source_hash` 改成原文的 `content_hash`，并把 `status` 设为 `current`。然后运行：

```powershell
python scripts/sync_projects.py
```

脚本只接受无需个人凭证即可访问、`visibility: public` 且未禁用的仓库。不要为此配置宽权限个人令牌。

## 论文

论文清单在 `_data/publications.yml`。身份消歧、投稿状态与来源审计材料保存在仓库外的私有项目档案中，不进入公开仓库；新增或修改论文前仍需人工核验作者身份、发表状态和权威公开链接。

每篇论文必须包含 `first_public`。优先使用最早可核验的公开版本：公开预印本 v1 早于正式出版时取预印本日期；期刊有在线优先日期时取在线日期；没有预印本或在线优先记录时才取出版社或正式论文集的公开日期。`source_url` 必须直达支持该日期的出版社、论文集、期刊或可信预印本页面，`source_field` 说明读取了哪个日期字段。本站录入、修订或重新构建的日期不能作为论文日期。

每条论文的 `title`、`authors`、`venue` 都有 `zh` 与 `en` 两组显示值。优先抄录出版社提供的正式双语元数据；原论文只有一种语言时，可以在两组中保留相同的官方题名和作者姓名，不要为了页面观感擅自翻译或改写。中文论文的英文页必须使用出版社给出的英文题名、作者拼写和期刊名。

作者列表中的 `Yiyu Chen` / `陈奕宇` 由 Liquid 模板负责强调；不要为了强调效果改写论文数据。若本人在某篇论文中有可核验的共同第一作者贡献，可在该论文上添加：

```yaml
self_contribution:
  zh: （共同第一作者）
  en: (co-first author)
```

它只会紧跟本人的作者名行内显示，不另起说明段落。该字段不得用于版本标签、影响力判断、通用论文摘要或未公开核验的作者贡献；不要添加 `note_zh` / `note_en`，也不要把 `Extended Abstract` 等版本描述当成页面标签。

若期刊或会议提供了可公开核验的获奖、精选或关注度名单，可在对应论文上添加可选的 `recognition`。它会紧邻 venue 显示，并进入当前语言的站内搜索；不要用它填写自行判断的“高影响力”或引用量评价。

```yaml
recognition:
  label:
    zh: 2024年高被关注综述论文
    en: 2024 Top-20 High-Attention Review Paper
  url: https://mp.weixin.qq.com/s/0c-6egiMkVL0nn7jbSP0Cg
```

新增条目前必须人工完成作者身份消歧，并提供 DOI、出版社、会议论文集或可信预印本平台链接。正式发表、公开预印本、投稿中和被拒稿不能混写。TACO 当前只作为公开代码仓库，不在论文页。

## 本地检查

### 明暗主题与环境光维护

日光/月光参数集中在 `assets/css/main.scss` 的主题变量、`--sunlight-x`、`--sunlight-y`、`body::before` 与 `body::after`；不要按单页复制样式。`body::before` 是静态光晕，`body::after` 是 `360s` 极慢旋转光束；旋转层必须继续使用响应式半径而非固定超大纹理，`prefers-reduced-motion` 必须停转但保留静态光。若改变页眉最大宽度、水平内边距或头像尺寸，必须同步光源公式，并复跑 `tests/browser/sunlight.spec.mjs` 的 1280/390/320 px 对齐与旋转层上限检查。

两个控件的文案分别只维护 `_data/site_text.yml` 的 `sunlight` 与 `theme` 中英文并保持字段平行。`yiyuiii.sunlight.v1` 只保存环境光 `on` / `off`，`yiyuiii.theme.v1` 只保存 `light` / `dark`；它们是互不覆盖的兼容接口。更换键必须升级版本，不得加入访问数据。明暗样式切换后，同一头像按钮的日光/月光文案与视觉必须即时联动；关闭环境光时两层都必须消失。

头像旁的 `yiyuiii` 始终返回当前语言欢迎页。JavaScript 可用时头像渐进增强为环境光开关；不可用时头像必须保留为首页链接。404、无 JavaScript、reduced-motion 与暗色搜索框的边界以实施规格和自动化测试为准。

### 页面评论维护

默认布局在正文之后只渲染 `_includes/page-comments.liquid`。评论由 `assets/js/page-comments.js` 渐进增强：默认情况下，只有读者点击当前语言的“显示评论”按钮后才注入 `https://giscus.app/client.js`；普通显示只作用于当前页面，不会被解释为长期同意。读者明确勾选“自动加载评论”后，当前页面立即加载，并在今后访问正式页面时自动加载。不要把 Giscus 的远程脚本或 iframe 直接写入 Liquid，也不要绕过这一显式选择直接为默认用户加载。此前的全站页面反馈组件、Issue 与邮件提示已经移除；仓库仍保留 `.github/ISSUE_TEMPLATE/page-feedback.yml` 供直接进入 GitHub Issues 的用户使用，但站内不再渲染或链接它。

评论仓库、仓库 Node ID、分类、分类 Node ID、严格路径映射和主题名集中在 `_config.yml` 的 `giscus`。当前使用 `Yiyuiii/yiyuiii.github.io` 的 `Announcements` 公告分类；中英文 URL 按 `pathname` 分别形成讨论。页面说明、加载、重试、错误和 Discussions 链接文案只维护 `_data/site_text.yml` 的 `comments` 中英文平行字段；Discussions 链接嵌在“评论公开保存在……”说明句中，不另设一行操作入口。`_includes/bilingual-seo.liquid` 输出正式 canonical backlink，避免本地预览生成的讨论回链到 loopback 地址。

根目录 `giscus.json` 只允许 `https://yiyuiii.github.io` 以及带任意端口的 `localhost` / `127.0.0.1` 预览来源，并固定评论按最早在前排列。扩展来源前必须确认确有站点部署需要；不要添加通配公网来源。仓库侧必须保持 Discussions 开启，并确认 Giscus GitHub App 只授权本仓库。若以后需要用 `Announcements` 发布真正公告，再新建专用的 `Comments` 公告分类、更新 `_config.yml` 的分类名称与 Node ID，并同时更新契约测试。

重定向兼容页和 404 不渲染评论。评论脚本必须继续监听 `yiyuiii:themechange`，通过 Giscus 官方 `setConfig` 消息同步明暗主题；明亮和夜晚分别使用 Giscus 官方 `light`、`dark` 主题，官方署名保留在上游组件的原生位置。不要通过自定义 Giscus 主题依赖 iframe 内部 DOM、隐藏或重排官方署名。

自动加载偏好只允许使用 `localStorage` 键 `yiyuiii.comments.v1` 和严格值 `auto`：默认与手动显示均不创建它，开启时写入，关闭时删除；不得保存页面路径、时间、身份或其它访问数据，也不得增加 Cookie、`sessionStorage` 或额外键。无效值保持不动并按关闭处理；读写存储失败时不得自动联网，选项回到未选中并保留手动加载。关闭自动加载只影响后续页面，不应伪装成可以撤回当前页面已经发出的请求或强行移除已经显示的评论。修改评论相关文件后至少运行：

```powershell
node --check assets/js/page-comments.js
python -m pytest -q tests/test_comments_contracts.py tests/test_issue_form_contracts.py
python scripts/run_browser_tests.py --site _site -- tests/browser/page-comments.spec.mjs
```

本机无需 Ruby 即可运行：

```powershell
python -m pytest -q
python scripts/sync_projects.py
python scripts/translation_guard.py --check --production
node --check assets/js/site-search.js
node --check assets/js/theme-compat.js
node --check assets/js/theme.js
node --check assets/js/article-navigation.js
node --check assets/js/home-feed.js
node --check assets/js/sunlight.js
git diff --check
```

真实 Jekyll 构建由 GitHub Actions 完成。PR 的 `site-preview` artifact 是浏览器验收的唯一构建来源；不要用手写静态页面替代它。

下载并在 `http://localhost:62091` 提供该 artifact 后，可复跑真实浏览器检查：

```powershell
npm ci
$env:SITE_URL='http://localhost:62091'
npm run test:browser
```

脚本覆盖桌面、1536px 目录断点、641/640 导航断点与两种手机宽度，以及中英文、搜索与标签交互、文章宽度和折叠/侧栏目录、修订历史和公式、本地小玩意、项目/论文/个人介绍索引、双语 404、对比度与旧 service worker 退役。

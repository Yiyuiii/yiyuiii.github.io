# 主页内容维护

这个站点把长文本、短界面文案、公开仓库数据和论文数据分开保存。修改内容时优先编辑源文件，不要把正文写进布局、样式或脚本。

## 欢迎页与内容流

`/` 与 `/en/` 是中英文欢迎页，所有人工欢迎文案集中在 `_data/home.yml`。这里维护欢迎标题、介绍、页眉功能指引、“随机发现 / 浏览起点 / 近期公开”等分区文字、内容类型名称和无 JavaScript 说明；不要把这些可见文字写进 `_includes/home-feed.liquid`、`assets/js/home-feed.js` 或 CSS。两种语言必须保持完全相同的键、列表结构和指引目标。

`/writing/` 与 `/en/writing/` 才是随笔索引。左上品牌链接回当前语言欢迎页，页顶“随笔 / Writing”进入对应索引；旧 `/?tag=...` 在 JavaScript 可用时会保留完整 query 与 hash 迁移到随笔索引，无 JavaScript 时欢迎页提供自然入口。

欢迎页的混合内容流只在 `_data/home_feed.yml` 维护稳定引用，不重复抄写标题、摘要、URL 或日期。每条记录只能有：

```yaml
- id: "writing:202302032000"
  kind: writing
  ref: "202302032000"
```

- `writing` 的 `ref` 是文章 `uid`；`project` 是 `owner/repository`；`publication` 是论文 `key`。
- `id` 必须严格等于 `<kind>:<ref>`，创建后不得改变。
- 首页统一显示并按 `first_public_date` 排序；这个运行时字段从内容自己的权威来源解析，不在首页清单手填：
  - 随笔：有 `revisions` 时取第一条初稿日期，否则取文章 `date`；第一条修订日期必须和 `date` 相同。`uid` 只是稳定身份，不承载日期语义，不能从 UID 或文件名推算日期。
  - 项目：取 `_data/project_repositories.yml` 的 `first_public`，其日期由 `scripts/sync_projects.py` 在每次 CI 中和当前公开仓库的 GitHub API `created_at` 对照，再换算为香港自然日。
  - 论文：取 `_data/publications.yml` 的 `first_public`；日期、精度、权威来源 URL 和来源字段必须一起维护。
- `first_public` 固定包含 `date`、`precision`、`source_url`、`source_field`。当前条目都具有到日证据并使用 `precision: day`。若未来权威来源只能确认年份，必须用 `precision: year` 和 `YYYY`，页面只显示年份；不得伪造 1 月 1 日。
- 所有公开来源都必须恰好出现一次；不得增加 `featured`、`priority`、`score`、类型配额或其它隐性排序字段。
- 运行时严格按首次公开日期降序、同日 `id` 升序，显示最近 8 项。年精度条目排在同年所有已知到日条目之后，再按 `id` 稳定排序；这个位置只代表日期精度不足，不暗示 1 月 1 日。
- “随机发现”（英文 “Random discovery”）只从中英文都有内容、且不在任一语言最近 8 项中的共同身份抽取。每次载入或刷新欢迎页都会重新抽取；页面从浏览器 BFCache 恢复时也会重新抽取。中英文页面各自独立抽取，不承诺相同身份，连续两次也可能合理地抽到同一项。
- 抽样使用浏览器 `crypto.getRandomValues()` 产生 32 位无符号整数，并通过拒绝采样消除直接取模的偏差。不要改用 `Math.random`，也不要使用日期、手写随机表或访问历史影响结果。
- 随机发现只读取构建产物中的候选列表，不记录访问，不使用 Cookie、`localStorage`、`sessionStorage` 或外部请求。禁用 JavaScript、候选为空或随机源不可用时显示预渲染的固定“浏览起点”，不伪装成随机结果。
- 后续修订、GitHub push、Star/Fork、本站构建与整理日期都不得改变“近期公开”顺序或随机候选边界。
- 当前 25 条日期及其来源见 `docs/home-feed-date-sources.md`；修改日期字段时必须同步复核该清单与契约测试。

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
greeting → intro → aesthetics → education → research → interests → skills → links
```

也就是 Ciallo、两段开场说明、个人基调、教育经历、科研方向、兴趣方向、日常技能、我的链接。每个 block、段落、条目、教育字段和链接都有语言无关的 `id`。中英文两棵树的 ID、层级、顺序和字段必须对应；可见文字可以不同。

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
  description: 业余爱好者，正在磨炼声乐基础，也会定期录音复盘。
```

```yaml
- id: singing
  name: Singing
  description: An amateur working on vocal fundamentals and regularly reviewing my own recordings.
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

ID 使用小写英文、数字和下划线，创建后尽量不要改。删除条目时也要同时删除中英文两份。

### 新增或重排栏目

重排时移动完整的 block，并在 `zh.blocks` 与 `en.blocks` 中保持完全相同的 ID 顺序。不要只移动标题。现有五种类型是：

- `greeting`：页面唯一的一级标题；
- `prose`：普通段落，可有 `heading`，也可像 `intro` 一样不设标题；
- `education`：时间、学校、专业或院系、培养阶段；
- `details`：名称与完整说明；
- `links`：带既有图标的链接。

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

链接顺序、标签和地址也在 YAML 中。中英文 URL 和行为字段必须相同，只翻译 `label`：

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
英文应自然、客观，重点保留我的真实经历、水平和兴趣，不宣传领域本身。
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

`/toys/` 与 `/en/toys/` 共用 `_includes/toy-index.liquid`，所有可见内容集中在 `_data/toys.yml`。页面只收录已经能在生产站使用的轻量互动；尚未实现、依赖接口仍在评估或只有想法的条目不要先写成“可用”。其中 `page.zh/en` 保存页标题、引言和状态文案，`items` 保存同一份语言无关顺序下的双语条目。

新增条目时复制一个完整记录，并维护以下字段：

```yaml
- id: example-toy
  kind:
    zh: 轻量实验
    en: Lightweight experiment
  title:
    zh: 示例小玩意
    en: Example toy
  description:
    zh: 准确说明它现在能做什么。
    en: Describe exactly what it can do now.
  action:
    zh: 打开小玩意
    en: Open the toy
  keywords:
    zh: [示例, 互动]
    en: [example, interactive]
  href:
    zh: /toys/example/
    en: /en/toys/example/
  external: false
```

- `id` 只用小写英文、数字与连字符，创建后保持稳定；它同时是页面锚点和搜索结果目标。
- `kind`、`title`、`description`、`action`、`keywords` 必须完整提供中英文，两个页面始终按同一 `items` 顺序渲染。
- 站内功能用根路径开头的本地 URL，并设置 `external: false`。无需跳转、直接在页眉操作的功能可把 `href` 写成 `null`。
- 外部功能必须使用 HTTPS，并设置 `external: true`；渲染器会自动增加新窗口和隔离属性。不要填入需要泄露本站访问数据、密钥或私人信息的地址。
- 搜索索引会自动读取每条记录的标题、说明和关键词，不要在搜索模板里重复抄写。

修改后运行：

```powershell
python -m pytest -q tests/test_toys_contracts.py tests/test_source_contracts.py tests/test_check_site.py
python scripts/translation_guard.py --check --production
```

## 随笔

- 正文：`_posts/*.md`
- 中文文章使用 `lang: zh`，英文文章使用 `lang: en`
- 新文章必须同时提供完整中英文版本；现有 11 组、22 篇随笔已经全部配对，`_data/translation_exemptions.yml` 必须保持空闭集，不能加入新豁免
- 每组共用引号包裹的 12 位 `uid` 和 `post-<uid>` 形式的 `translation_key`
- 中文 URL 位于 `/posts/`，英文 URL 位于 `/en/posts/`，并且全部使用显式 `permalink`
- `tags` 是文章自己的真实标签；随笔索引会按当前语言中的全局出现频率自动排序
- 每篇已发布随笔都必须声明共享的 `thumbnail: /assets/posts/...`，以及只含本地化 `alt`、`caption` 的 `article_cover`；题图由统一组件渲染，不要在 Markdown 正文重复插入首图和图注

文章正文和原有永久链接不要为了索引或欢迎页展示而改写。随笔摘要来自 `description` 或完整 `excerpt`，不会自动截断；欢迎页从同一字段读取，不另存重复摘要。

### 正文标题与统一排版

文章布局会用 front matter 的 `title` 生成页面唯一的一级标题。Markdown 正文必须从二级标题开始，只使用连续的二级、三级和四级层次：

```markdown
## 主要章节

### 子章节

#### 更细的说明
```

不要在正文重复文章标题，不要从二级标题直接跳到四级标题，也不要用加粗段落代替标题。新增、翻译或重排章节时，应同时检查侧边章节导航与手机端章节对话框；标题文字会参与生成公开片段锚点，已发布标题不要只为视觉效果改名。

所有随笔共用 `assets/css/main.scss` 中唯一一套 `.post-content` 排版。文章不得添加仅供自己使用的 CSS class、ID 或样式文件来调整字号、字距、列表、代码块和图片。中英文可以通过页面 `lang` 使用同一系统内的语言级规则，但不得按文章分叉。

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

阅读页会根据正文中的二级、三级标题自动生成导航：宽屏显示为正文左侧随阅读滚动保持可见的目录，手机端显示为“章节”按钮和对话框。正文里不要再手写“目录”小节，也不要为了凑目录强迫文章采用固定结构；没有足够标题时，导航会自动省略。

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

派生图与原图同目录，命名为 `<原文件名去扩展名>-index-v1-160.webp` 和 `-index-v1-320.webp`；原分辨率正式封面继续供文章正文使用，不得被派生图替换。派生图不在清单中重复保存 22 组路径和 SHA-256：每张原图已有受检 SHA-256，`index_derivatives` 又完整固定了尺寸、编码参数、Pillow 与 libwebp 版本，`--check` 和测试会从原图重新编码并逐字节比较提交文件。这条“原图哈希 + 固定编码器与策略 + 逐字节重算”链路是派生文件哈希的单一等价证据，避免两份清单失步。编码器版本不一致时脚本会在处理前明确失败。

计算当前文件 SHA-256：

```powershell
(Get-FileHash -Algorithm SHA256 "assets/posts/<目录>/<封面文件>").Hash.ToLowerInvariant()
```

当前生产使用的生成图必须按上述契约保存生成日期、生成器、完整提示词、参考输入边界、用途和批准状态。未采用候选的原图、生成源和提示词只在确有长期法律或再生成需求时进入专门资产库；不要默认放进站点 master。

## GitHub 仓库

- 人工公开仓库清单：`_data/project_repositories.yml`
- README 来源、Git 对象版本与翻译：`_data/project_cache.yml`
- 首次公开日期及 GitHub API 证据：`_data/project_repositories.yml` 的 `first_public`
- star、fork、主要语言、许可证、`updated_at`：每次构建从 GitHub API 获取，不手填

仓库展示顺序不是人工配置：先按 star 降序，同 star 再按 `updated_at` 降序，完全相同时按仓库名稳定排序。`updated_at` 只用于排序，不显示在页面上；人工清单中不要添加 `order`。

主要语言和许可证会自动显示为站内筛选标签，值分别来自 GitHub API 的 `language` 与许可证 SPDX 标识。不要另写项目分类或手工标签。点击标题或 README 摘要才会打开仓库；语言、许可证、star 和 fork 都不属于仓库外链。

`first_public` 的 `source_url` 必须是该仓库的 GitHub API URL，`source_field` 必须是 `created_at`。脚本会把这个 UTC 时间换算为香港自然日后与提交值比较；不要用 `updated_at`、第一次进入本站的日期或最近 push 日期替代。

README 更新后：

```powershell
python scripts/sync_projects.py --update-cache
```

检查新提取的原文，把对应翻译更新到 `project_cache.yml`，将 `source_object_id` 改成新的 README 对象 ID，并把 `status` 设为 `current`。然后运行：

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

脚本覆盖桌面、641/640 响应式断点与两种手机宽度，以及中英文、搜索与标签交互、文章侧栏目录、移动端章节对话框、修订历史和公式、项目/论文/个人介绍索引、双语 404、对比度与旧 service worker 退役。

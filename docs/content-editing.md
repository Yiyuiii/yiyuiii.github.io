# 主页内容维护

这个站点把长文本、短界面文案、公开仓库数据和论文数据分开保存。修改内容时优先编辑源文件，不要把正文写进布局、样式或脚本。

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

```powershell
python scripts/translation_guard.py --check --production
```

404 页的中英文标题、说明和返回链接也在这里维护。`_pages/404.md` 只声明公开路径，`_layouts/not-found.liquid` 会根据缺失 URL 是否以 `/en/` 开头选择一种语言显示；不要恢复自动跳转，否则英文缺失路径会被带回中文首页。

## 随笔

- 正文：`_posts/*.md`
- 中文文章使用 `lang: zh`，英文原文使用 `lang: en`
- 不要求每篇文章有翻译
- `tags` 是文章自己的真实标签；首页会按当前语言中的全局出现频率自动排序
- 只有明确选择图片时才写 `thumbnail: /assets/...`

文章正文和原有永久链接不要为了首页展示而改写。首页摘要来自 `description` 或完整 `excerpt`，不会自动截断。

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

正式 master 的维护规则是只保存正式文章，不复制完整旧稿、AI 审阅稿或候选稿；本次正式化分支合并前必须移除现有 `docs/content-revisions` 与 `docs/content-covers`。普通 Git 历史对长期恢复的承诺，仅限已经进入 master 且提交仍可达的正式版本；临时 worktree 或分支中的中间提交在删除分支或 squash 后不保证可达。需要多轮修改时：

1. 从最新 master 创建独立分支或临时 worktree。
2. 修改前先提交或记录基准提交；不要在 docs 下复制整篇文章。
3. 在 _posts 中实施经批准的当前稿，每一轮用独立 Git 提交标记边界。
4. 使用 git diff 比较任意提交；需要恢复时从 Git 历史读取旧版本。
5. 中间版本确需长期保留时，使用经批准的受保护 tag、归档分支、仓库外 git bundle 或专门资产库；不要把过程档案放回 master 当前树，当前正式树只保留具有长期维护价值的结构化事实。

比较文章前后版本：

```powershell
git diff <基准提交>..<当前提交> -- "_posts/<文章文件>.md"
```

文章封面使用 docs/asset-provenance.yml 作为单一生产来源清单。每篇已发布文章的 `thumbnail` 必须恰好对应一条记录，`asset` 也不得重复。更换封面时按以下严格契约同步更新：

- 文件顶层只能包含 `version` 与 `covers`，其中 `version` 为 1，`covers` 为记录列表。
- 公共必填字段为 `asset`、`post`、`origin_type`、`source_url`、`author`、`license`、`license_url`、`transform`、`sha256`、`dimensions` 与 `attribution`；`origin_type` 只能是 `external`、`self-produced` 或 `generated`，除按类型要求为 null 的 URL 外，公共字符串字段必须非空。
- `asset` 与 `post` 必须使用规范的仓库相对 POSIX 路径，不得含反斜线、绝对路径、空段、`.` 或 `..`；前者位于 `assets/posts`，后者位于 `_posts`，且两者必须实际存在。`asset` 必须等于文章 `thumbnail` 去掉开头 `/` 后的值。
- 生产资产必须是 WebP；`dimensions` 是 `[宽, 高]` 两个正整数并与文件一致，`sha256` 必须与当前生产文件一致。
- `external`：`source_url` 与 `license_url` 都必须是 HTTPS，`author`、`license` 与 `attribution` 必须非空；不得包含生成图专用字段或 `source_asset`。
- `self-produced`：`source_url` 与 `license_url` 必须为 null，`license` 必须为 `project-owned`；可选 `source_asset`，但它只允许用于此类型，并且必须是 `assets` 下实际存在的规范仓库相对 POSIX 路径；不得包含生成图专用字段。
- `generated`：`source_url` 与 `license_url` 必须为 null，`license` 必须为 `project-use-rights`，不得包含 `source_asset`；必须提供非空的 `generator`、`generated_at`、`source_description`、`purpose`、完整 `prompt` 与 `approval`，以及由非空字符串组成的非空 `reference_inputs` 列表。
- 正文必须满足生产封面的使用与外部可见署名要求：通常应能看到对应资产 URL；仅 `purpose` 明确标为 `writing-index cover` 的生成图可只用于文章索引。外部封面的正文必须公开显示 `source_url`、`attribution` 与 `license`，`license_url` 与来源页不同时也必须显示。

上述字段、路径、文件内容和正文可见性要求以 tests/test_asset_provenance.py 为权威可执行契约。

计算当前文件 SHA-256：

```powershell
(Get-FileHash -Algorithm SHA256 "assets/posts/<目录>/<封面文件>").Hash.ToLowerInvariant()
```

当前生产使用的生成图必须按上述契约保存生成日期、生成器、完整提示词、参考输入边界、用途和批准状态。未采用候选的原图、生成源和提示词只在确有长期法律或再生成需求时进入专门资产库；不要默认放进站点 master。

## GitHub 仓库

- 人工公开仓库清单：`_data/project_repositories.yml`
- README 来源、Git 对象版本与翻译：`_data/project_cache.yml`
- star、fork、主要语言、许可证、`updated_at`：每次构建从 GitHub API 获取，不手填

仓库展示顺序不是人工配置：先按 star 降序，同 star 再按 `updated_at` 降序，完全相同时按仓库名稳定排序。`updated_at` 只用于排序，不显示在页面上；人工清单中不要添加 `order`。

主要语言和许可证会自动显示为站内筛选标签，值分别来自 GitHub API 的 `language` 与许可证 SPDX 标识。不要另写项目分类或手工标签。点击标题或 README 摘要才会打开仓库；语言、许可证、star 和 fork 都不属于仓库外链。

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

本机无需 Ruby 即可运行：

```powershell
python -m pytest -q
python scripts/sync_projects.py
python scripts/translation_guard.py --check --production
node --check assets/js/site-search.js
node --check assets/js/theme-compat.js
node --check assets/js/article-navigation.js
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

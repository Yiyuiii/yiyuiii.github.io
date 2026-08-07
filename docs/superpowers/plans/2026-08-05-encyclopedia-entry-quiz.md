# “百科条目猜猜”多来源改造开工计划

## 目标与范围

本轮只改造现有“萌娘百科条目猜猜”，不新增第二个同构折叠项。完成后，可见名称统一为“百科条目猜猜 / Encyclopedia entry quiz”，并按页面语言提供两个来源：

| 页面 | 默认来源 | 可选来源 |
| --- | --- | --- |
| 中文 `/toys/` | 萌娘百科（中文） | 维基百科（中文） |
| 英文 `/en/toys/` | Wikipedia (English) | Moegirlpedia (Chinese clue) |

本轮的核心目标是让英文页面真正产生英文题目，同时保留中文页面原有的萌娘百科体验。AIC、Bangumi、AniList、封面题、音频题和逐句揭示不进入同一改动；它们仍按 `docs/toy-external-dataset-research-2026-08-05.md` 的独立路线评估。

## 用户原始要求

- 不做任何需要 API 密钥、用户凭据、维护者凭据或代签后端的项目。
- 不批量下载、提交或向读者下发外部题库、媒体索引、图片或音频。
- 只有读者明确点击开始一题后，才允许为本题请求外部官方接口。
- 每次开始至多发出一次已披露的 API 请求；不预取、不追随 continuation、不因筛选失败而静默补请求。
- 外部响应只保留在当前页面内存，不使用 Cookie、`localStorage`、`sessionStorage` 或其它持久化存储保存题目、作答或访问历史。
- 请求前说明当前服务方、题目语言、一次请求、服务方可见的信息，以及本游戏不请求图片的事实。
- 题目框只承载“这是什么？ / What is this?”和本轮匿名化线索，固定机制、隐私和许可说明放在题目框外。
- 条目不保证是角色，界面不得使用“角色猜猜”或暗示答案必然是人物。

## 不可破坏的现有契约

- 正式 clone `D:\Codes\yiyuiii.github.io\master` 保持干净并与 `origin/master` 一致；实现继续在外部 worktree 和功能分支完成。
- 玩具页初次载入、展开折叠项、切换来源都不得访问萌娘百科或 Wikipedia；只有开始按钮可触发请求。
- 请求保持 `credentials: "omit"`、`cache: "no-store"`、`redirect: "error"` 和 `referrerPolicy: "no-referrer"`。`no-referrer` 会去掉包含具体路径的 `Referer`，但跨域 CORS 请求仍可能携带站点 `Origin`。披露因此应准确写成“服务方可看到 API 请求、IP 地址和浏览器发送的站点来源（通常只到 `https://yiyuiii.github.io`，不含本页具体路径）”，不能声称来源信息完全不会发送。
- 使用 `crypto.getRandomValues()` 和拒绝采样，不得回退到 `Math.random`。
- 不请求 `pageimages`、缩略图或任何远程媒体，不在仓库保存外部条目正文。
- 远程 JSON 与纯文字导言都按不可信输入处理；页面不使用 `innerHTML` 显示线索、标题、错误或署名。
- 超时、超大响应、异常 JSON、无四个同类候选、匿名化失败等情况都显式失败并允许用户主动重试，不得自动发出第二次请求。
- 当前稳定片段 `#moegirl-quiz` 已被搜索结果和历史链接使用。本轮只改可见名称和内部组件名称，保留这个片段 ID；不要借功能改造破坏旧链接。

## 交互设计

### 开始前

组件按以下顺序显示：

1. 原生 `<select>` 来源选择器，标签为“题目来源 / Question source”；只有两个当前页面允许的选项。
2. 随选择实时更新的一段披露，说明题目语言、一次官方 Action API 请求、浏览器本地筛选与标题遮蔽、服务方可见的请求/IP/站点来源、本游戏不保存题目或作答且不请求图片。
3. “开始一题 / Start a round”按钮。

来源选择只存在当前页面内存，不写持久化存储。切换来源只更新本地界面并清除已经结束或仍在显示的旧题，不产生请求。加载期间禁用选择器和开始按钮；响应结束后恢复。程序化来源变化或新一轮开始必须中止旧控制器并使旧响应令牌失效，防止慢响应覆盖新状态。

中文索引说明建议为“读读匿名化的导言，看看四个候选里谁是答案。”；英文为“Read the anonymized introduction and choose the matching entry.”。不要恢复组件内重复的 eyebrow、标题或玩法说明。

### 出题与作答

- 保持“线索 + 四个原生按钮”的紧凑双栏布局，窄屏改为单栏。
- 线索标题固定为“这是什么？ / What is this?”，正文只显示纯文字匿名化导言。
- 成功出题后焦点移到线索；选项有明确的组标签，键盘和触摸均可作答。
- 作答后锁定四个选项，以现有正确/错误视觉语义标记答案；状态区宣布结果。
- 作答后才显示来源、准确修订链接、许可和“名称片段已遮蔽/内容已修改”的说明。
- “再来一题”使用当前选择的来源重新开始，并触发新的、仍然只有一次的请求。
- 首版不做逐句揭示。先验证英文线索、来源选择和候选质量，再决定是否把它作为独立玩法增强。

### 状态机

控制器只允许以下状态：

| 状态 | 来源选择 | 开始按钮 | 题目 | 来源/许可 |
| --- | --- | --- | --- | --- |
| `idle` | 可用 | 开始一题 | 隐藏 | 隐藏 |
| `loading` | 禁用 | 禁用 | 隐藏 | 隐藏 |
| `active` | 可用；变化时清题 | 再来一题 | 可作答 | 隐藏 |
| `answered` | 可用；变化时清题 | 再来一题 | 锁定并标结果 | 显示 |
| `error` | 可用 | 重试 | 隐藏 | 隐藏 |

来源变化、新一轮、失败和销毁都必须走同一个 `resetRound()`，清空旧 DOM、`data-result`、来源 URL、许可和活动令牌。最近候选历史按来源分别保存在 `Map<sourceId, string[]>` 中，刷新即消失；一个来源的近期条目不能挤占另一个来源的窗口。

## 数据与组件结构

将单来源命名改为中性的百科命名，但保留外部片段 ID：

- `_data/moegirl_quiz.yml` → `_data/encyclopedia_quiz.yml`
- `_includes/toy-moegirl-quiz.liquid` → `_includes/toy-encyclopedia-quiz.liquid`
- `assets/js/moegirl-quiz.js` → `assets/js/encyclopedia-quiz.js`
- 新增 `assets/js/encyclopedia-quiz-logic.js`，只承载可在 Node 与浏览器共用的无副作用纯函数
- `docs/moegirl-quiz-component.md` → `docs/encyclopedia-quiz-component.md`
- `tests/test_moegirl_quiz_contracts.py` → `tests/test_encyclopedia_quiz_contracts.py`
- `tests/browser/moegirl-quiz.spec.mjs` → `tests/browser/encyclopedia-quiz.spec.mjs`

`_data/toys.yml` 继续使用 `id: moegirl-quiz` 作为兼容片段，但标题、说明和关键词改为百科语义。`_includes/toy-index.liquid` 的该分支改为加载新 include，并加一行注释解释旧 ID 的兼容用途。

新的 YAML 只保存可信静态配置和本地化文案，不保存题目或外部响应。建议结构如下：

```yaml
timeout_ms: 10000
recent_history_size: 24
defaults:
  zh: moegirl_zh
  en: wikipedia_en
available_sources:
  zh: [moegirl_zh, wikipedia_zh]
  en: [wikipedia_en, moegirl_zh]
sources:
  moegirl_zh:
    adapter: moegirl
    language: zh
    endpoint: https://zh.moegirl.org.cn/api.php
    batch_size: 50
    license_url: https://creativecommons.org/licenses/by-nc-sa/3.0/
  wikipedia_zh:
    adapter: wikipedia
    language: zh
    endpoint: https://zh.wikipedia.org/w/api.php
    batch_size: 20
    license_url: https://creativecommons.org/licenses/by-sa/4.0/
  wikipedia_en:
    adapter: wikipedia
    language: en
    endpoint: https://en.wikipedia.org/w/api.php
    batch_size: 20
    license_url: https://creativecommons.org/licenses/by-sa/4.0/
copy:
  zh: { ... }
  en: { ... }
source_copy:
  moegirl_zh: { zh: { ... }, en: { ... } }
  wikipedia_zh: { zh: { ... } }
  wikipedia_en: { en: { ... } }
```

Liquid 将完整配置和当前语言允许的来源序列化到一个 `application/json` 节点；不再通过多个 `data-*` 属性拼装单来源配置。Python 契约测试必须证明：默认来源属于对应允许列表、三个来源 ID 唯一、端点恰为三个官方 HTTPS Action API、适配器只允许 `moegirl`/`wikipedia`、没有 `entries`/题库/图片字段、所有实际界面文案完整。

JavaScript 不做任意可扩展插件系统，只保留两个显式适配器和一个共享控制器：

```text
界面控制器
  ├─ Moegirl 适配器：现有纯文字导言与角色相关质量筛选
  └─ Wikipedia 适配器：纯文字导言匿名化、广义条目分类、修订署名
```

配置文件即使来自本站也不能放宽网络边界。脚本内部仍维护精确的来源 ID、协议、主机和 `/w/api.php`/`/api.php` 路径白名单；端点、作答链接和许可链接分别验证，不能信任 API 返回的任意 `fullurl`。

## 单次请求协议

### 萌娘百科

保留现有一次请求：`generator=random`、主命名空间、非重定向、`grnlimit=50`，请求 `extracts|info|categories`；`explaintext=1`、`exchars=900`、`exlimit=20`。继续使用 128 位 `requestid`、`maxage=0`、`smaxage=0`。不追随 API continuation。

首轮不要顺手扩大萌娘百科筛选范围；把当前角色相关信号视为这个来源的质量适配器，而不是向用户保证答案一定是角色。原敏感、消歧义、歌曲/音乐和装备子页过滤继续保留并回归。

### 中文与英文 Wikipedia

两个语言使用同一适配器，只更换精确主机和本地化规则。一次请求使用：

```text
action=query
format=json
formatversion=2
generator=random
grnnamespace=0
grnfilterredir=nonredirects
grnlimit=20
prop=extracts|categories|pageprops|revisions
exintro=1
explaintext=1
exchars=900
exlimit=20
cllimit=max
rvprop=ids|timestamp
origin=*
maxage=0
smaxage=0
requestid=<128-bit nonce>
```

即使响应含有 `continue`，控制器也只处理当前 `query.pages`，不发送后续请求。不要设置 `rvlimit`：官方 Revisions 文档明确规定，generator 提供多个页面时不能使用这个只适用于单页的列表参数；省略它并只请求 `ids|timestamp` 时，每页返回最新修订。页面必须有主名字空间、非缺失标题、导言、可接受分类、非消歧义 `pageprops.disambiguation`，以及有效 `revid`；不满足则本地跳过。准确来源链接由可信主机和整数修订 ID 本地构造为 `https://<lang>.wikipedia.org/w/index.php?oldid=<revid>`，不采用远端返回的任意 URL。

请求只使用 CORS 简单请求允许的普通 GET 与 `Accept: application/json`。浏览器会自动发送自己的 `User-Agent`；不要额外设置 `Api-User-Agent` 或其它非简单自定义请求头，因为这会触发一次 CORS `OPTIONS` 预检，使“每轮一次 API GET”的披露失真。Wikimedia 的 User-Agent 政策明确说明浏览器 JavaScript 使用浏览器 User-Agent 不构成违规，`Api-User-Agent` 只是鼓励项。若该政策以后改为强制自定义头，应重新设计并披露请求数，而不是悄悄引入预检。

维持 10 秒超时和 256 KiB 声明/实际响应双重上限。可行性实测若证明 20 条、每条最多约 900 字符的合法响应稳定超过上限，只能在记录证据后把统一上限提高到 512 KiB；不得删除上限或直接放宽到不受约束。

## 本地筛选、分类与出题

### 统一归一化模型

两个适配器都输出以下内存对象，不保留原始响应：

```text
{
  sourceId,
  language,
  title,
  key,
  semanticType,
  plainIntroduction,
  maskTerms,
  revisionId?,
  sourceUrl
}
```

所有文本先执行 Unicode NFKC、控制/双向格式字符清理、空白折叠和长度限制。标题键按来源语言大小写规则归一化，用于去重和近期排除。

### Wikipedia 纯文字匿名化

Wikipedia 请求显式使用 `explaintext=1`。不解析 HTML、不实例化远端节点，也不依赖粗体标记；这样从协议层避免导言中的图片、iframe 或其它 URL 触发附加请求。匿名化步骤为：

1. 对纯文字执行 NFKC、控制/双向格式字符清理和空白折叠。
2. 根据完整标题、去括号标题、冒号后标题和少量语言安全变体建立遮蔽词；不要为英文标题机械生成所有单词，也不要把普通高频词当作别名。
3. 中文只在首个介绍性“是/为”之前的主语实际包含标题或安全标题变体时遮蔽整段主语；英文同样要求首段主语包含标题变体，并随后出现 `is/was/are/were`。不能让“但是”“作为”“However, it is”等普通开头满足匿名化闸门。
4. 遮蔽线索中四个候选的完整标题变体，以及常见中文/英文别名引导字段；合并连续黑块。
5. 如果没有真正发生遮蔽、匿名化后仍出现完整标题/已识别别名、线索少于 30 字符或页面类型不合格，则该页不能成为答案。
6. 最终线索继续用 `textContent` 写入，最长约 420 个 Unicode 字符并尽量在句末截断。

选项标题也只用 `textContent`。浏览器测试仍要让恶意桩响应把 `<img onerror>`、`<script>`、伪造链接和双向控制符放进所谓“纯文字”字段，证明它们只可能成为被清理或按字面显示的字符，不会创建节点、执行代码或请求资源。

### Wikipedia 广义类型

Wikipedia 不能沿用“角色信号”。首版只识别六个宽类型：人物、地点、作品、组织、生物、事件。分类器分别维护中英文类别信号，按加权分数选出唯一最高类型；低分、并列或只命中泛词的页面标为 `unknown` 并丢弃。最低规则集包括：

- 人物：出生/逝世/在世人物、职业人物类别；`births`、`deaths`、`living people`、人物职业类别。
- 地点：行政区、城市、聚居地、河流、山脉等；`cities`、`settlements`、`rivers`、`mountains`、地理类别。
- 作品：书籍、小说、电影、电视节目、专辑、歌曲、电子游戏等明确作品类别。
- 组织：公司、机构、大学、政党、运动队等明确组织类别。
- 生物：物种、属、动物、植物、真菌及 `taxa` 类别。
- 事件：战役、选举、赛事、灾害和其它有明确事件类别的条目。

过滤器另行排除日期页、年份页、列表、索引、消歧义、模板/门户痕迹、敏感导言和明显不适合轻量页面的内容。敏感过滤应以保守拒绝为原则，但不能把 `isAdult` 一类不存在的字段当成保证。

出题顺序固定为：

1. 归一化、过滤、分类并排除本来源近期标题。
2. 为可能成为答案的页面预先生成匿名化线索。
3. 按 `semanticType` 分组，只保留总候选不少于 4 且至少有一个可匿名化答案的组。
4. 用安全随机先选可行组和答案，再从同组剩余页面无放回抽取三个干扰项。
5. 安全洗牌四个选项，记录四个标题到本来源内存历史。

不得先随机选四项再依赖碰巧存在可用答案；也不得用 `unknown` 组成杂类题。这样可以避免“导言显然是人物、三个候选却是地点”的廉价提示。当前响应不能形成同类四选一时进入 `no_clue_error`，请求计数仍为一次。

## 来源、许可与隐私文案

### 萌娘百科

- 揭晓链接指向通过白名单验证的来源条目。
- 说明线索是名称已遮蔽的匿名化节选，来源页许可是最终依据。
- 保留 CC BY-NC-SA 3.0 入口和来源署名提示。

### Wikipedia

- 揭晓链接必须是本题实际使用的 `oldid` 修订，不只是可变化的当前页面。
- 明确写出条目标题、语言版 Wikipedia、CC BY-SA 4.0，并说明本站只做了纯文字提取、名称遮蔽和长度截取；修改后的线索本身也按 CC BY-SA 4.0 提供，而不只是链接原文许可。
- 许可链接固定为 Creative Commons 官方 HTTPS 地址；所有外链继续使用 `noopener noreferrer` 与 `referrerpolicy="no-referrer"`。

请求前文案不要声称“本站不使用持久化存储”，因为站点其它功能确实保存主题和部分计时成绩。准确范围应是“本游戏不保存题目、答案或作答；响应只留在当前页面内存”。无 JavaScript 时显示通用说明：“此小玩意需要 JavaScript；未启用时不会连接萌娘百科或 Wikipedia。”

## 实施步骤

### 阶段 0：一次一请求的可行性闸门

先在当前外部工作树建立一个不保存正文的单请求检查器，或直接用浏览器原型手动触发。每次命令/点击只请求一个来源的一批页面，不循环、不续页、不写题库；只记录来源、耗时、响应字符数、返回页数、六类候选数、可匿名化答案数和匿名失败原因计数。必要的人工质量样本最多保留三个页面 ID/修订 ID，不保存导言全文。

中文、英文 Wikipedia 各由测试者显式开始 20 局，验收底线：

- 每个来源至少 16/20 的单次批次可以形成同类四选一题；
- 成功题中完整标题或已识别别名泄漏为 0；
- 人工复核的候选类型明显一致率至少 90%，敏感/消歧义/列表误收为 0；
- 中位响应时间不高于 2.5 秒，90 分位不高于 6 秒，且响应未越过已声明上限。

如果任何来源未达门槛，先调整当前响应内的分类、遮蔽或 `exchars`，然后重新做显式点击验证；不得用追加请求掩盖失败。两轮仍未达标，则停止该来源上线，保留现有来源与研究证据，并重新评估玩法，而不是降低隐私契约。

### 阶段 1：先写契约，再迁移命名

1. 新增/重命名 Python 契约测试，固定来源表、语言默认、官方端点、无题库/图片字段、完整双语文案和旧片段 ID。
2. 扩展全站玩具契约，允许 Wikipedia 域名但继续禁止 `preconnect`、`dns-prefetch`、`prefetch` 和初次网络请求。
3. 按上文文件映射完成数据、include、脚本、样式和文档的中性命名；使用 `rg` 清查旧内部名称，只保留 `#moegirl-quiz` 兼容 ID、历史文档引用和必要迁移说明。

### 阶段 2：来源选择和共享控制器

1. 渲染原生来源选择器、动态披露、默认来源和无 JavaScript 回退。
2. 把当前请求、状态、焦点、响应上限、随机与内存历史整理到共享控制器。
3. 把现有萌娘逻辑搬进显式适配器，先让全部现有萌娘测试在新结构下通过；这一步不得改变线上行为。
4. 添加来源变化、请求中止、旧响应失效和按来源分离历史的测试。

### 阶段 3：Wikipedia 适配器

1. 先以固定桩响应实现 URL 构造、精确白名单、纯文字匿名化、修订 URL 和六类分类器。
2. 用中英文、每种类型、未知/并列、消歧义、列表、短文和伪装成纯文字的恶意标记固件覆盖纯逻辑。
3. 接入控制器并加入中文 Wikipedia、English Wikipedia 的单请求浏览器测试。
4. 确保英文页面默认题目、选项、状态和来源均为英文；选择 Moegirlpedia 后才明确显示中文题目。

### 阶段 4：样式、文案与文档

1. 将 `.moegirl-quiz*` 改为 `.encyclopedia-quiz*`，为选择器增加与其它小玩意一致的标签、控件和焦点样式。
2. 在 1280、390、320 px 验证选择器、长英文候选、长中文标题、错误状态和许可说明无横向溢出。
3. 更新组件维护文档、内容编辑说明、外部数据调研状态和 `AGENTS.md` 的当前事实；明确首版没有逐句揭示。
4. 将旧的五请求萌娘实时审计工具退役或改成默认且最大只执行一次请求的检查器，防止未来维护者误把批量抓取当普通测试。

### 阶段 5：完整回归与可玩预览

局部验证通过后执行 production Jekyll 构建、站点检查、legacy 检查和完整 Playwright。用 loopback 预览让用户在中英文页面实际试玩四种“页面 × 来源”路径；在用户确认前只保留功能分支/本地提交，不推送正式页。

## 自动化测试清单

### Python/静态契约

- 三个来源、两个页面允许列表和两个默认值严格匹配。
- 只允许精确官方 HTTPS API、许可 URL 与适配器类型。
- YAML 无题目数组、图片、音频、凭据或持久化键。
- 中英文共同文案字段一致；来源专属文案只要求对应页面实际可用的组合完整。
- 可见名称是“百科条目猜猜 / Encyclopedia entry quiz”，稳定 ID 仍为 `moegirl-quiz`。
- HTML 只加载新脚本，不包含资源提示或远程图片。

### 纯逻辑测试

若现有无构建脚本结构不适合直接导出函数，可将纯函数放入一个先加载的 IIFE 模块，并只暴露冻结的内部命名空间给控制器和 Node 测试；不要引入打包器。覆盖：

- 安全随机拒绝采样和无放回抽样；
- 三种 API URL 参数、nonce 和端点拒绝；
- 中英文规范化、标题键、主语锚定和别名遮蔽；
- 六类分类的正例、冲突、低分和排除例；
- “先选答案、再选同类干扰项”的四选一组装；
- 安全修订 URL、许可 URL 和响应大小边界。

### Playwright

- 中文和英文页在进入、展开、切换来源前对三个外部域名均为零请求。
- 中文默认一次萌娘请求；中文选择 Wikipedia 后一次中文 Wikipedia 请求。
- 英文默认一次 English Wikipedia 请求并生成英文线索；选择 Moegirlpedia 后一次萌娘请求并明确中文线索。
- 每次点击恰好一个请求，URL 含完整预期参数和唯一 nonce，不出现 continuation 请求、图片请求或重定向目标请求。
- 来源切换不联网、清空旧题；加载中不可重复点击；旧响应不能覆盖新状态。
- 四个候选同类、标题唯一，答案匿名化；伪装成标记的恶意字符串只显示为安全纯文字且不触发资源请求。
- 没有可行组、网络失败、超时、超大响应、错误 JSON、随机源不可用都可聚焦重试，且请求数不增加。
- 作答后来源、准确 `oldid`、许可和修改声明正确；错误选项和正确答案的无障碍状态清楚。
- 无 JavaScript 时只显示说明，三个外部域名零请求。
- 1280/390/320 px、明暗主题、键盘操作和长标题均无溢出。
- 搜索“百科”“Wikipedia”“萌娘百科”仍能到达 `/toys/#moegirl-quiz` 或对应英文 URL，并自动展开折叠项。

## 验证命令与发布闸门

实施时按 README 的环境前提执行，局部命令预期为：

```powershell
python -m pytest -q tests/test_encyclopedia_quiz_contracts.py tests/test_toys_contracts.py
node --check assets/js/encyclopedia-quiz-logic.js
node --check assets/js/encyclopedia-quiz.js
npx playwright test tests/browser/encyclopedia-quiz.spec.mjs
```

最终必须再执行全量 `python -m pytest -q`、production Jekyll build、`scripts/check_site.py`、`scripts/check_legacy_urls.py` 和 `scripts/run_browser_tests.py`。只有同时满足下列条件才进入正式发布候选：

1. 中英文 Wikipedia 可行性实测达到阶段 0 门槛；
2. 自动化全绿，外部请求观察器证明无预取和每轮至多一次；
3. 用户可在本地网页实际玩到中文默认、英文默认和两个可选来源；
4. 许可、隐私和题目语言披露经人工阅读无歧义；
5. 外部审阅提出的实质问题已经吸收或有证据地反驳；
6. 用户明确同意发布后，才合入/推送正式分支并观察 GitHub Actions 部署。

## 回退策略

来源由静态允许列表控制。如果某一 Wikipedia 语言版出现长期 CORS、API、许可或质量问题，可以只从对应页面的 `available_sources` 移除它并恢复原默认，不需要删除共享组件或影响另一语言。若整项多来源改造未通过试玩，可在功能分支上停止，不触碰正式 clone；不能用内置小题库、远程图片或静默补请求作为降级方案。

## 开工时复核的官方依据

- MediaWiki Random：<https://www.mediawiki.org/wiki/API:Random>
- TextExtracts 参数与每次最多 20 条：<https://www.mediawiki.org/wiki/Extension:TextExtracts>
- Revisions 的 generator/多页限制：<https://www.mediawiki.org/wiki/API:Revisions>
- 跨站 `origin=*` 行为：<https://www.mediawiki.org/wiki/API:Cross-site_requests>
- 浏览器 User-Agent 与 `Api-User-Agent` 边界：<https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy>
- Wikipedia 文本署名、修改和同许可要求：<https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use/en>

这些页面和外部服务行为会变化。正式实现和以后维护时应复核当前官方文档；本计划记录的是 2026-08-05 的可执行基线，不把外部接口状态写成永久事实。

## 2026-08-05 实施状态

数据、Liquid、共享纯逻辑、控制器、样式、维护文档和固定桩测试已在外部功能分支实现；旧 `#moegirl-quiz` 片段继续兼容。全量 Python、纯逻辑、生产构建、站点/legacy 检查及本次变更影响的浏览器回归均已通过，尚未推送或发布。

真实闸门因当前环境无法连接中文、英文 Wikipedia Action API 而保持未评估。两种产品路径各只显式尝试一局并正确进入网络错误/重试状态；没有把网络失败计作内容批次失败，也没有为凑样本重复请求。结构化证据见 `docs/encyclopedia-quiz-live-feasibility-2026-08-05.json`。正式发布仍必须在可联网环境完成两个 Wikipedia 来源各 20 局，并达到本计划的 16/20、零泄漏、同类一致性、延迟和响应大小门槛。

## 本轮明确不做

- 不接入 AIC、Bangumi、AniList、MusicBrainz 或其它来源。
- 不做封面、音频、题图、Wikimedia Commons 媒体或跨域热链。
- 不做预生成题库、构建期抓取、离线缓存、Service Worker 缓存或维护者审阅语料库。
- 不做账号、积分榜、跨页历史、Cookie 或任何新增持久化键。
- 不做逐句揭示、难度设置、类别设置或自动重试；这些只有在首版真实质量数据支持时另立计划。

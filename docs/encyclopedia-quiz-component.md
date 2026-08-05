# 百科条目猜猜组件维护说明

## 组件边界

“百科条目猜猜 / Encyclopedia entry quiz”是嵌入双语“小玩意”折叠清单的渐进增强组件。可见名称和索引说明由 `_data/toys.yml` 维护；来源、默认值、超时、批次大小、近期排除窗口及中英文文案集中在 `_data/encyclopedia_quiz.yml`。Liquid 只渲染当前页面允许的来源和本地化文案，纯逻辑位于 `assets/js/encyclopedia-quiz-logic.js`，界面与请求状态位于 `assets/js/encyclopedia-quiz.js`。

可见名称已经从萌娘百科专名扩展为百科语义，但 `_data/toys.yml` 的稳定 ID 仍为 `moegirl-quiz`。搜索结果和历史 URL `/toys/#moegirl-quiz`、`/en/toys/#moegirl-quiz` 必须继续展开同一折叠项；内部文件、CSS 类和 DOM hook 不再使用单一来源命名。

## 页面和来源

| 页面 | 默认来源 | 可选来源 | 题目语言 |
| --- | --- | --- | --- |
| 中文 `/toys/` | `moegirl_zh` | `wikipedia_zh` | 中文 |
| 英文 `/en/toys/` | `wikipedia_en` | `moegirl_zh` | 默认英文；选择萌娘百科时中文 |

来源选择只存在当前 DOM 和 JavaScript 内存。切换来源会清除旧题并更新开始前披露，但不访问网络；刷新后恢复当前页面默认来源，不写 Cookie、`localStorage` 或 `sessionStorage`。

## 网络与隐私契约

- 进入玩具页、展开折叠项、切换来源、浏览其它游戏和无 JavaScript 回退均为零萌娘百科/Wikipedia 请求，也不得为这些域名添加 `preconnect`、`dns-prefetch` 或 `prefetch`。
- 只有用户明确点击“开始一题 / Start a round”“再来一题 / Another round”或失败后的“重试 / Try again”，才可向当前选择的官方 Action API 发出一次 GET。一次点击至多一次 API GET；不追随 continuation、不静默补候选、不预取下一题。
- 请求使用 `credentials: "omit"`、`cache: "no-store"`、`redirect: "error"` 和 `referrerPolicy: "no-referrer"`。不要设置 `Api-User-Agent` 或其它会触发 CORS OPTIONS 预检的自定义头；浏览器自动发送自己的 User-Agent。
- `no-referrer` 去掉具体页面路径，但跨域 CORS 请求仍可能向服务方发送站点 Origin。开始前披露应说明服务方可看到 API 请求、IP 地址和浏览器发送的站点来源，通常不包含本页具体路径。
- 响应只在当前异步调用和归一化对象中存在；刷新即消失。不保存外部正文、题目、答案、作答或时间，不请求 `pageimages`、缩略图、图片或音频。
- 加载中来源和开始按钮禁用。来源变化、新一轮和失败使用活动令牌与 `AbortController` 使旧响应失效；中止已经发出的请求不能触发自动重试。
- 请求 10 秒后中止；声明长度超过 256 KiB 时不读取正文，支持响应流的浏览器还会在读取过程中达到 256 KiB 时立即取消；不支持响应流时仍在解析前检查实际文字长度。异常状态、重定向、错误 JSON、无可行候选、匿名化失败和安全随机源不可用均显式失败并等待用户再次操作。

## Action API 参数

### 萌娘百科

`https://zh.moegirl.org.cn/api.php` 使用 `generator=random`、主命名空间、非重定向、`grnlimit=50`，并请求 `extracts|info|categories`。导言使用 `explaintext=1`、`exintro=1`、`exchars=900`、`exlimit=20`；分类 `cllimit=max`。因此随机批次最多列出 50 页，但实际最多只有 20 页附带可进入候选池的导言；这两个数字不能混同。每次请求带 128 位 `requestid`、`origin=*`、`maxage=0` 和 `smaxage=0`。

### Wikipedia

中文、英文分别只允许 `https://zh.wikipedia.org/w/api.php`、`https://en.wikipedia.org/w/api.php`。两者使用 `generator=random`、主命名空间、非重定向、`grnlimit=20`，并在同一响应请求 `extracts|categories|pageprops|revisions`。导言必须为纯文字：`exintro=1`、`explaintext=1`、`exchars=900`、`exlimit=20`；修订只用 `rvprop=ids|timestamp`。

不要添加 `rvlimit`。MediaWiki 的 Revisions 模块不允许在 generator 提供多个页面时使用这个单页列表参数；省略后每页返回最新修订。响应即使含有 `continue` 也不得跟随。

## 安全边界

- 静态配置和运行时逻辑都维护精确的来源 ID、HTTPS 主机和 API 路径白名单；不得把 YAML 改成任意用户 URL 代理。
- 远程 JSON、标题、分类和纯文字导言一律是不可信输入。执行 NFKC、控制字符/双向格式字符清理、空白折叠和长度限制，所有可见内容通过 `textContent` 写入。
- 不解析或插入远端 HTML。即使测试响应把 `<img onerror>`、`<script>` 或 URL 放进 `extract`，它也只能作为被清理或按字面显示的普通文本，不能创建 DOM 节点或附加请求。
- Wikipedia 来源链接不信任远程 `fullurl`；脚本用允许主机和整数 `revid` 构造 `https://<lang>.wikipedia.org/w/index.php?oldid=<revid>`。萌娘来源 URL 也必须通过精确主机、协议、无凭据/端口验证。
- 外部链接使用 `noopener noreferrer` 和 `referrerpolicy="no-referrer"`。

## 匿名化与候选

两个适配器先把页面归一化为内存条目，再由同一个四选一组装器出题。近期标题按来源分别保存在内存数组中；一个来源的历史不影响另一个来源。

萌娘百科继续用角色、人物、虚拟主播、吉祥物或拟人相关信号作质量筛选，同时排除敏感、消歧义、列表、歌曲/音乐和 `/人格面具` 子页。这个筛选只改善候选质量，不向用户保证答案必然是角色。

Wikipedia 只接受能唯一归入人物、地点、作品、组织、生物或事件之一的页面。分类信号低分、并列、未知、日期/年份、列表、消歧义或敏感页面被拒绝。出题先找“至少四个候选且至少一个可匿名化答案”的同类组，再安全随机选答案、三个同类干扰项并洗牌；不得用 `unknown` 杂类拼题。

匿名化要求首段主语实际包含标题或安全标题变体，随后才可按中文“是/为”或英文 `is/was/are/were` 遮蔽整段主语。线索还会遮蔽四个候选的标题变体和常见别名字段。没有真实遮蔽、仍泄漏完整标题/已识别别名、少于 30 字符的导言不能成为答案；最终线索最多约 420 个字符并尽量在句末截断。

抽样只使用共享安全随机接口 `crypto.getRandomValues()` 和拒绝采样，不得降级到 `Math.random`。当前批次不能组成题目时显示“本批没有足够合适条目”，由用户主动重试。

## 来源和许可

作答前不加载也不显示来源链接；题目框只显示“这是什么？ / What is this?”与动态线索。作答后才显示：

- 萌娘百科：经验证的来源条目、匿名化节选说明和 CC BY-NC-SA 3.0 入口；来源页标示的具体许可仍是最终依据。
- Wikipedia：本题准确 `oldid` 修订、语言版项目、CC BY-SA 4.0 链接，以及“已提取纯文字、遮蔽名称并截短”的修改声明。修改后的线索本身也按 CC BY-SA 4.0 提供。

## 状态、无障碍与布局

- 控制器只有 `idle`、`loading`、`active`、`answered`、`error` 五种可见状态。所有重置路径清空旧选项结果、来源 URL、许可和活动令牌。
- 来源选择和四个答案使用原生 `select`/`button`；线索可聚焦，出题后焦点移到线索；结果与错误通过 `aria-live` 宣读。
- 选择器、开始按钮、长中文/英文候选和许可说明在 1280、390、320 px 均不得横向溢出；明暗主题沿用全站变量。
- 无 JavaScript 时不显示无效交互，只说明不会连接萌娘百科或 Wikipedia。

## 维护与验证

普通测试和 CI 只使用固定桩，绝不联网。显式实时检查器每次启动最多请求一个来源的一批页面，不循环、不续页、不保存导言；只保留响应耗时、大小、分类和匿名失败计数。调整外部参数、分类或遮蔽规则时必须更新 `reviewed_on`，同时检查误收和误杀。

常用局部验证：

```powershell
node --check assets/js/encyclopedia-quiz-logic.js
node --check assets/js/encyclopedia-quiz.js
node --test tests/encyclopedia_quiz.logic.test.mjs
python -m pytest -q tests/test_encyclopedia_quiz_contracts.py tests/test_toys_contracts.py
npx playwright test tests/browser/encyclopedia-quiz.spec.mjs
```

完整发布前仍须按 README 运行 production Jekyll build、站点和 legacy 检查以及完整浏览器回归。实施与验收细节见 `docs/superpowers/plans/2026-08-05-encyclopedia-entry-quiz.md`；外部候选来源取舍见 `docs/toy-external-dataset-research-2026-08-05.md`。

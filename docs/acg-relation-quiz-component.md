# “动画主角猜猜（AniList）”组件

## 玩法与关系语义

组件从 AniList 按流行度排列的前 360 部动画中随机选择一页，一次读取 6 部作品及每部最多 10 个文字角色关系。玩家可在开始前多选题型；浏览器只使用这一次响应，并在“已启用且本批可成题”的类型中等概率选择一种：

1. **动画 → 主角**：给出动画，从同作 1 名 `MAIN` 与 3 名 `SUPPORTING` 中找出主角之一；
2. **主角 → 动画**：给出 1 名 `MAIN`，从 4 部动画中找出对应作品；
3. **主角 → 同作主角**：给出 1 名 `MAIN`，从 4 名分别标作 `MAIN` 的角色中找出与其同属一部动画的另一人。

这里的“主角之一”是 AniList `MAIN` 关系的自然中文表达。它通常指主人公或核心主角团，可能同时标给多人；不保证是唯一主人公，也不是本站根据戏份、叙事视角或宣传位重新作出的判断。即时揭晓不再复述数据库字段，而是直接说明“某角色是某动画的主要角色”或“二人都是某动画的主要角色”，让玩家先获得有用的现实关系；`MAIN` 的精确来源含义仍保留在开始前说明和揭晓后的来源署名中。

题型设置沿用其它游戏的折叠设置面板。恢复按钮只修改面板草稿，点击“应用设置”后才清空当前局并生效；应用设置本身不请求 AniList。设置只存在当前页面内存，不写入本地存储。若只启用的题型在本批无法形成无歧义四选一，组件直接提示本批不能成题，不会偷偷改用未启用题型或追加请求。

反向题只在当前响应能形成无歧义四选一时出现：可见题名必须不同，线索角色不得以相同 ID 或相同显示名出现在候选动画中；同作主角题的三名干扰项分别来自不同动画，也不能与目标作品已返回的角色、线索角色或答案重复。条件不足时保留其它可成题类型；三类都不可用时才提示本批无法成题，不追加请求。

## 名称与语言

AniList 网站界面主要使用英文，其 API 对作品提供 `native`、`romaji`、`english`，对角色提供 `native` 与 `full`，但没有独立中文题名或中文角色名字段。

- 中文页作品名优先显示 `原文（罗马字）`；
- 中文页角色在两个字段都有值且不同时显示 `原文名（拉丁字母名）`；
- 英文页作品优先英语题名、其次罗马字；角色优先 `full`；
- 原文字段缺失时不臆造翻译，直接使用 AniList 可用名称。

这能避免把 `Yoshiki Tsujinaka` 一类拉丁字母显示名误当作角色唯一原名，同时不声称站点提供官方中文译名。

## 文件

- 数据与双语披露：`_data/acg_relation_quiz.yml`
- 渐进增强结构：`_includes/toy-acg-relation-quiz.liquid`
- 纯逻辑：`assets/js/acg-relation-quiz-logic.js`
- DOM、状态与网络：`assets/js/acg-relation-quiz.js`
- 纯逻辑测试：`tests/acg_relation_quiz.logic.test.mjs`
- 构建契约：`tests/test_acg_relation_quiz_contracts.py`
- 固定桩浏览器测试：`tests/browser/acg-relation-quiz.spec.mjs`
- 实时闸门：`docs/acg-sound-candidate-gates-2026-08-05.md`

稳定 ID 仍为 `anilist-role-quiz`，只修改可见名称和玩法：

- 中文标题：`动画主角猜猜（AniList）`
- 英文标题：`Anime protagonist quiz (AniList)`

## 网络与隐私契约

开始前没有 AniList 请求。点击开始后：

1. 浏览器可能先发一个 CORS OPTIONS 权限检查；
2. 随后只发一个 `POST https://graphql.anilist.co`；
3. 不追随其它页，不因本批失败自动重试；
4. `credentials: "omit"`、`cache: "no-store"`、`redirect: "error"`、`referrerPolicy: "no-referrer"`；
5. 10 秒超时，响应正文最多 256 KiB，流式越界时立即取消；
6. 响应只留在当前页面内存，不写 Cookie、`localStorage` 或 `sessionStorage`。

请求只读取文字关系字段，不读取封面、横幅和简介。AniList 能看到请求、IP 与浏览器为 CORS 发送的本站 Origin。前端不发送认证、用户收藏或其它用户数据。

## 内容与安全边界

服务端查询排除 `isAdult=true`、Ecchi／Hentai 类型及五个敏感标签；客户端再次拒绝成人标记、敏感类型／标签、命中本地敏感词的作品名或角色名、不安全 URL 和无法组成任何题型的结果。AniList 官方说明其成人过滤不是适用于所有平台的完整分级，界面照实披露这一限制。

所有远端名称只经 `textContent` 进入 DOM。来源 URL 仅允许 `https://anilist.co/anime/<id>`；配置端点与条款 URL 不匹配时，组件保持隐藏且不联网。启用题型、答案与近期排除键只留在当前页面内存。

## 固定桩验收

```powershell
node --test tests/acg_relation_quiz.logic.test.mjs
python -m pytest -q tests/test_acg_relation_quiz_contracts.py
npx playwright test tests/browser/acg-relation-quiz.spec.mjs --reporter=line
```

覆盖：精确端点／查询／范围、三种题型及多选设置、设置不联网、同名与跨作品歧义排除、自然关系反馈、原文角色名显示、加密随机、内容拒绝、开始前零请求、一次 POST、可选预检、失败不补请求、响应越界、恶意文本、精确来源链接、无图片／音频／存储及不可信配置关闭。

截至 2026-08-07：三种题型、配置状态和即时关系反馈已有纯逻辑、Python 契约与 11 项固定桩浏览器回归；全站 Python 356 项和 Playwright 163 项通过，生产构建、站点契约与 70 条旧 URL 政策通过。真实浏览器只启用“动画 → 主角”后，以一次 AniList POST 生成四选一，并自然揭晓“澪（Mio）是《月が導く異世界道中（Tsuki ga Michibiku Isekai Douchuu）》的主要角色”。用户已批准将组件随本轮知识问答小游戏改动正式发布。

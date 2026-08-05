# AniList 角色关系猜猜组件

## 玩法与范围

组件从 AniList 按流行度排列的前 360 部动画中随机选择一页，一次读取 6 部作品及每部最多 10 个角色关系。浏览器只从当前响应中选择一部至少包含 1 个 MAIN 与 3 个 SUPPORTING 的作品，再问“这部动画的主角之一是谁？”

这里的“主角之一”是 AniList `MAIN` 关系的自然中文表达：通常指主人公或核心主角团，可能同时标给多位角色；它不保证候选是唯一主角，也不是本站根据戏份、叙事视角或宣传位重新作出的判断。正确反馈会再次写出 AniList 的 `MAIN` 原始标注，兼顾自然题面和可核验性。

首版只有这一种题型，不加入前传／续作判断、跨作品排除题、封面或简介。原因是 MAIN 关系可在单批响应内形成精确且容易验收的四选一，而其它关系需要更多请求或更复杂的歧义处理。

## 文件

- 数据与双语披露：`_data/acg_relation_quiz.yml`
- 渐进增强结构：`_includes/toy-acg-relation-quiz.liquid`
- 纯逻辑：`assets/js/acg-relation-quiz-logic.js`
- DOM、状态与网络：`assets/js/acg-relation-quiz.js`
- 纯逻辑测试：`tests/acg_relation_quiz.logic.test.mjs`
- 构建契约：`tests/test_acg_relation_quiz_contracts.py`
- 固定桩浏览器测试：`tests/browser/acg-relation-quiz.spec.mjs`
- 实时闸门：`docs/acg-sound-candidate-gates-2026-08-05.md`

## 网络与隐私契约

开始前没有第三方请求。点击开始后：

1. 浏览器可能先发一个 CORS OPTIONS 权限检查；
2. 随后只发一个 `POST https://graphql.anilist.co`；
3. 不追随其它页，不因本批失败自动重试；
4. `credentials: "omit"`、`cache: "no-store"`、`redirect: "error"`、`referrerPolicy: "no-referrer"`；
5. 10 秒超时，响应正文最多 256 KiB，流式越界时立即取消；
6. 响应只留在当前页面内存，不写 Cookie、`localStorage` 或 `sessionStorage`。

请求只读取文字关系字段，不读取封面、横幅和简介。AniList 能看到请求、IP 与浏览器为 CORS 发送的本站 Origin。前端不发送认证、用户收藏或其它用户数据。

## 内容与来源边界

服务端查询排除 `isAdult=true`、Ecchi／Hentai 类型及五个敏感标签；响应同时读取这些标签的名称与成人标记，客户端再次拒绝成人标记、Ecchi／Hentai、敏感／成人标签、命中本地敏感词的作品名或角色名、不安全 URL 和角色不足的结果。拉丁字母关键词使用单词边界，避免把 `Grapefruit` 之类无关名称误判为 `rape`。AniList 官方明确说明其成人过滤不是适用于所有平台的完整分级，界面照实披露这一限制。

AniList 没有独立中文题名字段。中文页显示原文加罗马字，并在开始前说明；英文页优先英语题名。角色名使用 AniList 的 `name.full`。揭晓后链接对应 `https://anilist.co/anime/<id>` 及 API 条款；不把 AniList 数据误标为某个 Creative Commons 许可证。

## 状态

- `idle`：只显示披露和“开始一题”；
- `loading`：按钮锁定，显示正在读取；
- `playing`：显示问题和四个文字按钮；
- `answered`：选项锁定，标记正确／误选，显示来源与条款；
- `failed`：网络、响应、内容或随机失败均只显示原因与“重试”，绝不自动补请求。

所有远端名称只经 `textContent` 进入 DOM。来源 URL 同时由逻辑层限制协议、主机和路径；配置端点与条款 URL 不匹配时，组件保持隐藏并且不联网。

## 主线集成

当前研究分支已按下列参数接入共享 `_data/toys.yml`、`_includes/toy-index.liquid` 与 `assets/css/main.scss`：

- 稳定 ID：`anilist-role-quiz`
- 中文标题：`AniList 角色关系猜猜`
- 英文标题：`AniList character role quiz`
- 中文短说明：`四名候选中，谁是这部动画的主角之一？`
- 英文短说明：`Which candidate is one of this anime's main characters?`
- include：`{% include toy-acg-relation-quiz.liquid heading_id='anilist-role-quiz-title' %}`

样式 hook：

- 根：`.acg-relation-quiz`
- 来源与披露：`__source-label`、`__privacy`
- 操作：`__start`
- 题目：`__round`、`__prompt`、`__options`
- 反馈与出处：`__status`、`__source`
- 状态：根元素的 `data-acg-state="idle|loading|playing|answered|failed"`
- 答案：选项按钮的 `data-result="correct|incorrect"`

## 固定桩验收

```powershell
node --test tests/acg_relation_quiz.logic.test.mjs
python -m pytest -q tests/test_acg_relation_quiz_contracts.py
npx playwright test tests/browser/acg-relation-quiz.spec.mjs --reporter=line
```

覆盖：精确端点／查询／范围、加密随机、内容拒绝、MAIN 与 SUPPORTING 关系、开始前零请求、一次 POST、可选预检、失败不补请求、响应越界、恶意文本、精确来源链接、无图片／音频／存储及不可信配置关闭。

截至 2026-08-05：纯逻辑 9 项、Python 契约 6 项、组件固定桩 Playwright 7 项通过；全站 Python 355 项、生产构建、站点契约、70 条旧 URL 政策与全量 157 项 Playwright 回归通过。最终本地真实浏览器验收以一次 AniList GraphQL POST 成功生成“《アオハライド（Ao Haru Ride）》的主角之一是谁？”四选一题；桌面为两列、320 px 为单列且无横向溢出。组件只留在研究分支和 loopback 预览，尚未推送或发布。

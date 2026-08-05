# ACG 关系题与听声题实时闸门（2026-08-05）

## 边界与方法

本轮只评估三条分配给当前子任务的路线：Bangumi 文字关系题、AniList 文字关系题、Wikimedia Commons“听声猜猜”。共同边界如下：

- 不使用 API 密钥、登录态、代签后端或本地远端题池；
- 玩家点击开始前零请求；响应只留在当前页面内存；
- 不预取下一题、不追随分页、不静默重试；
- 不使用动画封面、简介或商业录音；
- 真实闸门要求 10 次样本中网络成功至少 9 次、成题至少 8 次，单次正文小于 256 KiB、10 秒内返回；一旦数学上已不可能达到阈值，就停止制造无效请求；
- 普通自动化测试全部使用固定桩，绝不联网。实时样本只输出状态、时延、大小和成题数量，不保存标题、角色、音频或远端响应。

## 结论

| 路线 | 结论 | 主要依据 |
| --- | --- | --- |
| AniList MAIN 角色题 | **GO：实现为单一文字玩法** | 10/10 网络成功、10/10 成题；一次 GraphQL POST 的正文 7.9–8.8 KiB、1.57–4.75 秒；真实 Chrome 跨域成功 |
| Bangumi 每日放送／角色关系 | **NO-GO：停止实现** | `calendar` 第一次 13.25 秒，之后两次均 20 秒超时；已有两次失败，10 次最终成功率数学上最多 8/10 |
| Commons 听声猜猜 | **NO-GO：停止实现** | 元数据技术上合格，但无法为大陆目标环境建立当前可达性证据；原生 `<audio>` 还会发送来源页 Referer，不能满足本轮统一的 `no-referrer` 网络边界 |

## AniList：通过

### 官方接口与条款

- 端点：`POST https://graphql.anilist.co`
- 无认证公开读取：[认证说明](https://docs.anilist.co/guide/auth/)
- 不得囤积／批量收集：[API 使用条款](https://docs.anilist.co/guide/terms-of-use)
- 当前降级限额为每分钟 30 次，正常值为 90 次：[限流说明](https://docs.anilist.co/guide/rate-limiting)
- 官方明确说明可用性和成人过滤并非保证，Ecchi 不属于其成人标记：[注意事项](https://docs.anilist.co/guide/considerations)

一次查询固定读取按流行度排列的随机一页：页码在 `1..60` 中用浏览器加密随机数选择，每页 6 部动画，每部最多 10 个角色关系。请求只取 ID、题名、站内链接、成人标记、类型、用于本地复检的标签名称／成人标记和 MAIN／SUPPORTING 关系，不取封面、横幅或简介。服务端查询排除：

- `isAdult: false`；
- `genre_not_in: ["Ecchi", "Hentai"]`；
- `tag_not_in: ["Nudity", "Sexual Content", "Rape", "Incest", "Gore"]`。

客户端再次拒绝成人标记、Ecchi／Hentai 类型、敏感／成人标签、命中本地敏感词的作品名或角色名、不安全链接、少于 1 个 MAIN 或少于 3 个 SUPPORTING 的作品。拉丁字母关键词使用单词边界以减少误杀。题面自然表述为“这部动画的主角之一是谁”；其精确定义仍是 AniList `MAIN` 关系，可能有多位，不代表本站另行判断戏份或唯一主角。成人过滤不能被宣传为适合所有平台的完整分级。

### 10 次聚合样本

- 网络：10/10 成功；
- 成题：10/10；每批 6 部中有 5–6 部满足“至少 1 MAIN + 3 SUPPORTING”；
- 时延：最小 1.57 秒，最大 4.75 秒；
- 正文：最小 7,884 字节，最大 8,838 字节；
- 响应均返回 `Access-Control-Allow-Origin: *`。

另用全新无登录 Chrome 从 `http://127.0.0.1:8125/toys/` 发起产品等价 `fetch`：状态 200，1.256 秒，正文 7,920 字符，6 部中 5 部可成题；浏览器请求观察到 1 个 POST 且没有 Referer。单独的 OPTIONS 审计返回 204，并允许 `POST, OPTIONS` 与 `Content-Type`。浏览器是否单独发送或复用预检由其缓存决定，所以开始前披露写成“通常会先做一次跨域权限检查”，不把整局宣传为严格一个 HTTP 请求。

中文体验的已知限制：AniList 没有独立中文题名字段。中文页明确披露并显示原文加罗马字；角色使用 AniList 的拉丁字母全名。英文页优先英语题名，其次罗马字和原文。

## Bangumi：提前失败

官方 API 文档列出匿名可读的 `GET /calendar`、浏览条目和按条目读取角色关系等端点；站点版权声明允许按 API 范围开发，并将条目／角色信息标为 [CC BY-SA 3.0](https://bgm.tv/about/copyright)。实测响应含 `Access-Control-Allow-Origin: *`，匿名访问成立。

单请求角色题无法闭合：浏览条目响应不含角色关系，角色端点又需要预先知道条目 ID。曾评估用一次 `/calendar` 响应形成“作品—放送星期”关系题，但实时结果是：

1. 成功，13.25 秒，89,892 字节，7 个星期组、115 个条目；
2. 20 秒超时；
3. 20 秒超时。

两次失败后，即使剩余 7 次全部成功，最终也只能达到 8/10，低于 9/10 网络阈值；第一次也已经超过 10 秒门槛。因此停止后续实测和产品代码，不用第二请求角色题掩盖问题。

## Wikimedia Commons：技术可成题，但产品停止

### 元数据入口

此前研究认为没有合格随机入口；本轮找到一个不需要本地索引的官方 Action API 组合：

```text
generator=search
gsrnamespace=6
gsrsort=random
gsrsearch=filetype:audio incategory:"Audio files of animal sounds"
prop=imageinfo
iiprop=url|mime|size|mediatype|extmetadata
```

它能在一个 GET 中返回最多 20 个随机文件及逐文件作者、许可、大小和直链。10 次元数据样本均成功并可形成四选一：每批有 13–17 个文件同时满足“媒体类型为 AUDIO、大小不超过 3 MB、逐文件许可属于公有领域／CC0／CC BY／CC BY-SA、描述互异”；正文 53,517–78,358 字节，时延 2.84–4.07 秒。

### 原生音频请求审计

真实 Chrome 流程把目标 `<audio>` 设为 `preload="none"`：

- 玩家播放前：0 个媒体请求；
- 玩家播放后：1 个 `GET`，请求头 `Range: bytes=0-`；
- 响应：206，`Content-Range: bytes 0-8633/8634`；
- 即使元素设置 `referrerpolicy="no-referrer"`，Chrome 仍发送 `Referer: http://127.0.0.1:8125/`。

这证明不能把“一个音频文件”误写成“严格一次 HTTP 请求”，也不能依赖 `<audio>` 上的 `referrerpolicy`。若以后重启，必须改成玩家点击后用 `fetch(..., {credentials: "omit", referrerPolicy: "no-referrer"})` 取得有大小上限的单文件 Blob，再用本地 Object URL 播放；这会在播放前完整下载最多 3 MB，仍需重新审阅体验与内存成本。

### 大陆可达性证据边界

2019 年 Wikimedia Foundation 公告当时明确说 Commons 仍可用，不能拿它证明 2026 年状态。公开封锁监测的搜索结果将 `commons.wikimedia.org` 标为被阻断，但本轮无法从当前环境直接读取 GreatFire／Blocky 的目标详情页，也没有可控制的中国大陆探针；因此这里只能记录“大陆可达性没有被本轮直接证实，且与用户刚遇到的 Wikimedia 访问失败高度相关”，不能写成官方确认的当前事实。

本站不提供代理或回退数据源。对当前明确关注大陆可用性的读者而言，这个缺口足以阻止上线；再加上原生媒体 Referer 不满足统一网络边界，本轮删除所有 Commons 产品组件，只保留这份证据。

## 代码状态

- 保留：AniList 单来源的 data／include／logic／controller、固定桩测试与组件文档；
- 删除：Bangumi 产品适配器、Commons data／include／logic 及联网审计脚本；
- 不包含：封面、音频、远端响应、ID 全表、题库、密钥、Cookie 或任何持久化状态。

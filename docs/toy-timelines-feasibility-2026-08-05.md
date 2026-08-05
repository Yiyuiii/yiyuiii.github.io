# 外部数据时间线小游戏可行性复核（2026-08-05）

## 结论

| 候选 | 决定 | 直接原因 |
| --- | --- | --- |
| Wikidata 时间线 | **不接入** | 最终查询模板在真实 Chrome CORS 的 10 次小样本中只有 6 次联网成功、6 次形成四项题，未达到 9/10 与 8/10 闸门。 |
| MusicBrainz 乐坛时间线 | **不接入** | 官方要求每个应用在 `User-Agent` 请求头提供应用名、版本和可联系维护者的信息；浏览器 `fetch` 没有保留脚本试图设置的应用级 `User-Agent`，而本站又不增加代签后端。 |

两项都没有进入 `_data/toys.yml`、`_includes/toy-index.liquid` 或生产样式。为验证玩法曾建立的 Wikidata 自包含原型也已在得出结论后删除；本文件保留查询模板、交互契约、固定桩结果和复评条件。

## 共同边界

- 无 API 密钥、登录、读者凭据或代签后端；
- 只有玩家明确开始后才请求当前一局直接需要的数据；
- 每局最多一条公开接口请求，无续页、静默重试或下一局预取；
- 响应只留在当前页面内存，不写 Cookie、`localStorage`、`sessionStorage` 或题库；
- 不请求、复制或热链图片与音频；
- 请求采用 `credentials: "omit"`、`cache: "no-store"`、`redirect: "error"`、`referrerPolicy: "no-referrer"`、`AbortController`、10 秒超时和 128 KiB 流式响应上限；
- 普通自动化全部使用固定桩，不联网。

## Wikidata 时间线

### 原型玩法

一局从两个主题中选择其一：

1. 四位诺贝尔奖得主，按出生年份从早到晚排列；
2. 四部奥斯卡最佳影片，按最早发行年份从早到晚排列。

中文页显示中文 Wikidata 标签，英文页显示英文标签。玩家依次点击四张卡片建立顺序，再检查答案；相同年份不会同时入题。揭晓只显示年份、名称和对应 `https://www.wikidata.org/wiki/Q…` 链接，数据许可为 CC0 1.0。响应不含正文、图片或音频。

候选最初还试验过宽泛电影和奥运会主题，均被舍弃：宽泛电影会混入成人作品，奥运会名称本身含年份，答案直接泄漏。最终模板只保留主题边界明确、名称不直接泄漏年份的两类数据。

### 最终单请求模板

诺奖主题用六个准确奖项 ID、出生日期与中英文标签。浏览器从 16 个固定窗口中安全随机选择一个 `OFFSET`；响应上限 40 行。`nonce` 是每局 128 位安全随机数，只作为 SPARQL 注释避免中间缓存固化本题，不改变查询范围。

```sparql
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
# round {32-hex nonce}
SELECT DISTINCT ?item ?date ?labelZh ?labelEn WHERE {
  VALUES ?award { wd:Q38104 wd:Q44585 wd:Q80061 wd:Q37922 wd:Q35637 wd:Q47170 }
  ?item wdt:P166 ?award; wdt:P569 ?date.
  ?item rdfs:label ?labelZh, ?labelEn.
  FILTER(LANG(?labelZh) = "zh")
  FILTER(LANG(?labelEn) = "en")
}
ORDER BY ?item
LIMIT 40
OFFSET {0, 20, …, 300}
```

最佳影片主题从 `[1927, 1947, 1967, 1987, 2007]` 中选择一个二十年窗口；同一影片有多个发行日期时只取最早值。

```sparql
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
# round {32-hex nonce}
SELECT ?item (MIN(?rawDate) AS ?date) ?labelZh ?labelEn WHERE {
  ?item wdt:P166 wd:Q102427; wdt:P577 ?rawDate.
  FILTER(?rawDate >= "{start}-01-01T00:00:00Z"^^xsd:dateTime)
  FILTER(?rawDate < "{start + 20}-01-01T00:00:00Z"^^xsd:dateTime)
  ?item rdfs:label ?labelZh, ?labelEn.
  FILTER(LANG(?labelZh) = "zh")
  FILTER(LANG(?labelEn) = "en")
}
GROUP BY ?item ?labelZh ?labelEn
ORDER BY ?date
LIMIT 40
```

查询使用官方 `https://query.wikidata.org/sparql` GET 端点，返回 SPARQL JSON。Wikidata 官方建议在只知道目标数据特征时使用 WDQS，并说明主命名空间结构化数据采用 CC0；官方页面也提醒 WDQS 适合范围已经明确且结果集较小的查询：<https://www.wikidata.org/wiki/Help:Data_access>、<https://www.wikidata.org/wiki/Help:Queries>。

### 真实浏览器闸门

最终模板由真实 Google Chrome 页面从随机 loopback HTTP Origin 发起，交替运行五次诺奖和五次最佳影片查询。每个样本恰好一条 GET，未出现 OPTIONS、续页或自动重试。只保存下列聚合字段，不保存名称、正文或完整响应。完整机器可读记录见 `docs/wikidata-timeline-live-feasibility-2026-08-05.json`。

| 次数 | 主题 | 结果 | 耗时 | 响应 | 合格条目 / 不同年份 |
| ---: | --- | --- | ---: | ---: | ---: |
| 1 | 诺奖 | 10 秒取消 | 10.007 s | 0 | 0 / 0 |
| 2 | 最佳影片 | 成题 | 1.379 s | 9,936 B | 19 / 18 |
| 3 | 诺奖 | 10 秒取消 | 10.001 s | 0 | 0 / 0 |
| 4 | 最佳影片 | 成题 | 2.864 s | 11,481 B | 22 / 19 |
| 5 | 诺奖 | 10 秒取消 | 10.009 s | 0 | 0 / 0 |
| 6 | 最佳影片 | 成题 | 2.113 s | 10,910 B | 21 / 20 |
| 7 | 诺奖 | 成题 | 8.676 s | 21,095 B | 40 / 37 |
| 8 | 最佳影片 | 成题 | 0.824 s | 10,432 B | 20 / 18 |
| 9 | 诺奖 | 10 秒取消 | 10.010 s | 0 | 0 / 0 |
| 10 | 最佳影片 | 成题 | 1.612 s | 10,915 B | 21 / 18 |

结果为：

- 联网成功：`6/10`，要求至少 `9/10`；
- 可形成四个不同年份的题目：`6/10`，要求至少 `8/10`；
- 最佳影片主题：`5/5` 成功；诺奖主题：`1/5` 成功；
- 成功响应全部小于 10 秒和 128 KiB；最大成功响应 21,095 B；
- 请求边界为 `10/10` 恰好一条 GET，无预检请求。

在删除中英文 Wikipedia sitelink 联结之前，另一轮 10 次样本为 9/10 联网成功、9/10 成题，但一条请求超时，另一次诺奖查询耗时 9.3 秒。删除联结后的最终模板反而降至 6/10，说明公共查询服务的时段负载足以支配结果，不能把偶然一轮的较好数据当作稳定性保证。继续调低闸门、延长超时或失败后追加请求都违反既定体验和网络披露边界，因此停止。

### 中国大陆可达性

本机样本不能代表中国大陆网络。GreatFire 对 `https://www.wikidata.org` 的最近一次直接页面记录显示：2026-04-28 测试时在中国大陆被阻断；该页同时说明近 90 天没有更新测试，因此状态可能变化：<https://en.greatfire.org/https/www.wikidata.org>。

目前没有取得 `query.wikidata.org` 的同等直接大陆测量，不能从 `www` 域名结果机械推断查询子域，也不能声称查询服务在大陆可用。即使查询子域偶尔可达，揭晓链接仍指向已有阻断证据的 `www.wikidata.org`。若未来复评，界面必须明确披露 Wikimedia 服务在中国大陆可能无法连接。

### 固定桩原型验证与删除

未接入生产索引的自包含原型曾通过：

- Node 纯逻辑：8 项；
- Python 静态契约：5 项；
- Playwright 固定桩交互：7 项。

覆盖了端点白名单、两个查询模板、安全随机与无放回抽样、不同年份、恶意标签纯文字渲染、一次 GET、无预取、错误不重试、排序与揭晓、CC0 链接、错误配置零联网等边界。通过固定桩只能证明实现遵守契约，不能抵消真实服务闸门失败。

得出 NO-GO 后已删除下列原型，不在最终树留下不可上线的生产组件：

- `_data/toy_timelines.yml`
- `_includes/toy-wikidata-timeline.liquid`
- `assets/js/wikidata-timeline-logic.js`
- `assets/js/wikidata-timeline.js`
- `tests/wikidata_timeline.logic.test.mjs`
- `tests/test_wikidata_timeline_contracts.py`
- `tests/browser/wikidata-timeline.spec.mjs`
- `tests/tools/audit-wikidata-timeline-live.mjs`

## MusicBrainz 乐坛时间线

### 一次响应能否成题

`release-group` 搜索可用一条 GET 返回专辑名称、艺人、`first-release-date`、发行状态与 MBID；按年代窗口查询后，在浏览器本地筛选四个不同年份即可形成“按首次发行年代排序”。接口响应包含 `Access-Control-Allow-Origin: *`，技术上可由浏览器读取，不需要 API 密钥。MusicBrainz 核心数据许可与接口分别见：<https://musicbrainz.org/doc/About/Data_License>、<https://musicbrainz.org/doc/MusicBrainz_API>。

但这不等于本站可以合规直连。官方 API 页面明确写明：

- 当前不需要 API key；
- **必须**提供有意义的 `User-Agent`；
- 每个客户端应用不得超过每秒一次请求；
- 限流说明要求 `User-Agent` 包含应用名称、版本，以及能联系维护者的 URL 或邮箱。

官方依据：<https://musicbrainz.org/doc/MusicBrainz_API>、<https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting>。

### 浏览器冲突实测

从真实 Chrome 页面执行一次 `fetch`，脚本尝试设置：

```text
User-Agent: yiyuiii-toys/0.1 (https://yiyuiii.github.io/)
```

Playwright 观察到实际出站请求仍为浏览器自己的通用 UA：

```text
Mozilla/5.0 (...) HeadlessChrome/150.0.0.0 Safari/537.36
```

`custom_application_ua_preserved` 为 `false`。该请求 CORS 可读、HTTP 200、耗时 2.336 秒；较早的一次相同类型搜索耗时约 13.34 秒，说明延迟仍需单独闸门，但结构性阻碍已经先出现。

通用 Chrome UA 没有本站应用名、版本或可联系维护者的信息，不满足 MusicBrainz 对“每个客户端应用”的识别要求。把联系信息放进任意查询参数并非官方认可替代；伪造其它自定义头也不会让 MusicBrainz 的 UA 限流机制识别本站。本站又明确不增加代签后端，因此该矛盾在当前架构下不可解，不再发起 10 次内容样本。

此外，MusicBrainz 标题以原始名称为主，没有可靠的中英双语译名字段。即使 UA 问题解决，也应把中文界面表述为“名称按 MusicBrainz 原文显示”，不能假定中文题名完整。

## 未来复评条件

Wikidata 只有同时满足以下条件才重启：

1. 官方提供更稳定、无需密钥、允许浏览器 CORS 的小型结构化查询入口，或现有 WDQS 在不同日期的真实 Chrome 十次样本达到至少 9/10 联网与 8/10 成题；
2. 成功请求全部小于 10 秒和 256 KiB，每局仍只有一条 GET，无重试、续页或预取；
3. 对 `query.wikidata.org` 取得近期、直接的中国大陆可达性测量，并据实披露；
4. 重新复核查询 ID、双语标签、敏感内容和 CC0 说明。

MusicBrainz 只有在官方文档提供浏览器应用可用的识别机制，或官方书面说明通用浏览器 UA 对该使用方式足够时才重启。届时再做 10 次真实浏览器样本，验证至少 9/10 联网、8/10 成题、每次一条请求、10 秒与 256 KiB 上限，并重新复核非商业使用边界和原文标题说明。

# 网络延迟与波动检测器

## 公开能力与解释边界

该组件用浏览器发出的低流量请求测量到公共端点的 **HTTPS 往返耗时**。“开始测试”与运行状态组成顶部紧凑操作栏，位于“当前网络”之前，不再单列测试标题。点击开始后，全部 9 个节点立即进入各自独立的采样循环：每个节点预热一次，再以每秒最多一次的频率采集 60 个样本。一个慢节点不会阻塞其它节点，页面收到逐个样本后立即刷新“节点网络延迟”列表和多折线图，无需等到整轮或最终结束。列表每行突出显示 P50 典型延迟和相邻延迟波动；当前值、P95、最大值、请求失败、高延迟尖峰以及节点位置、网络类型、来源、测量方式和特性都收在该行的“查看详情”中，页面不再重复渲染九张节点资料卡。组件顶部不再重复渲染能力、线路边界或指标定义段落；完整解释保留在本文档。

浏览器只能看到请求开始、成功或传输失败以及结束时间，不能读取中间路由，也不能识别回程。因此它**不能识别具体承载线路**，包括 CN2、AS9929、CMIN2、运营商精品网或其它所谓“高速／低速”线路。界面的“优秀、良好、延迟偏高、不稳定”只评价本次实测表现，不声明线路身份，也不等同于游戏服务器的真实延迟。

“当前网络”先请求 [IPIP.NET 当前出口 IP 服务](https://www.ipip.net/myip.html)的 JSON 响应，读取公网 IP、IP 版本、近似国家／省市和运营商；该服务更面向大陆访问，但官方明确免费服务不提供质量承诺。只有 IPIP.NET 请求失败或响应无效时，页面才请求 [IP.SB Free IP API](https://ip.sb/api/) 作为回退，补充 ASN、网络名称和近似地区。若两者都失败，页面会尝试从本轮本来就会发出的 Cloudflare 零字节节点响应读取公网 IP，不增加新的 Cloudflare 请求；能否读取地区和 ASN 取决于浏览器实际暴露的响应头。页面会显示本次实际采用的来源，不会把回退来源伪装成 IPIP.NET。浏览器若实现 [Network Information API](https://wicg.github.io/netinfo/)，界面在“浏览器估计”一格用等宽数字显示 `RTT … · 下行 …`。该 API 的原始 `effectiveType` 只有 `slow-2g`、`2g`、`3g`、`4g` 四种历史命名，且由 RTT 与下行组合得出；为避免把它误读成物理接入制式，界面不再显示该原始档位。VPN、代理、企业出口和运营商级 NAT 都可能改变公网归属结果。

## 节点、来源与测量方式

| 页面名称 | 最细可确认位置 | 网络类型 | 来源名称 | 测量请求 | 解释限制 |
| --- | --- | --- | --- | --- | --- |
| 全球自动接入 · 腾讯 DNSPod | 官方公开北京、上海、广州、中国香港和北美接入集群；实际落点不可读 | 公共递归 DNS；BGP Anycast 多运营商接入 | [DNSPod Public DNS](https://www.dnspod.cn/products/publicdns) | 向 `https://doh.pub/dns-query` 发送小型 DoH GET | `no-cors` 响应不透明；可能接入大陆、中国香港或北美，不能读取状态或落点 |
| 全球自动接入 · 阿里公共 DNS | 官方全球公共递归服务；公开多个国内城市及海外节点，实际落点不可读 | 全球公共递归 DNS；服务端自动调度 | [Alibaba Public DNS](https://alidns.com/) | 向 `https://dns.alidns.com/dns-query` 发送小型 DoH GET | 同上；不能据此区分城市或运营商承载线路 |
| 全球就近 · Cloudflare | Anycast 自动选择；本页无法读取实际接入城市 | Cloudflare 全球边缘网络 | [Cloudflare Speedtest](https://github.com/cloudflare/speedtest) | 官方零字节下载端点 | 可读取 HTTP 成功状态；实际边缘节点和路径仍未知 |
| 日本 · 东京 · Vultr | 东京都会区（NRT）；设施不公开 | Vultr 公有云国际公网 | [Vultr Looking Glass](https://hnd-jp-ping.vultr.com/) | HTTPS HEAD、零响应正文 | 固定都会区；途中运营商和回程未知 |
| 新加坡 · 新加坡 · Vultr | 新加坡（SGP）；设施不公开 | Vultr 公有云国际公网 | [Vultr Looking Glass](https://sgp-ping.vultr.com/) | HTTPS HEAD、零响应正文 | 同上 |
| 韩国 · 首尔 · Vultr | 首尔都会区（ICN）；设施不公开 | Vultr 公有云国际公网 | [Vultr Looking Glass](https://sel-kor-ping.vultr.com/) | HTTPS HEAD、零响应正文 | 同上 |
| 德国 · 法兰克福 · Vultr | 法兰克福都会区（FRA）；设施不公开 | Vultr 公有云国际公网 | [Vultr Looking Glass](https://fra-de-ping.vultr.com/) | HTTPS HEAD、零响应正文 | 同上 |
| 美国 · 洛杉矶 · Vultr | 洛杉矶都会区（LAX）；设施不公开 | Vultr 公有云国际公网 | [Vultr Looking Glass](https://lax-ca-us-ping.vultr.com/) | HTTPS HEAD、零响应正文 | 同上 |
| 美国 · 新泽西 · Vultr | 新泽西／纽约都会区（EWR）；设施不公开 | Vultr 公有云国际公网 | [Vultr Looking Glass](https://nj-us-ping.vultr.com/) | HTTPS HEAD、零响应正文 | 同上 |

这些节点只保留来源明确、2026-08-23 用真实浏览器复核可发起请求的端点。2026-08-24 又复核了 IPIP.NET JSON 响应的 HTTPS、JSON 结构与 CORS 许可，并保留 IP.SB 回退；Cloudflare 原 `meta` 端点仍未采用，最后一级只读取测速节点原有零字节响应中浏览器实际可见的元数据头。[DNSPod 官方产品介绍](https://cloud.tencent.com/document/product/302/110744/)明确列出北京、上海、广州、中国香港和北美接入集群；[阿里公共 DNS 官网](https://alidns.com/)将服务描述为全球公共递归服务，并公开国内与海外节点。因此两个 DoH 端点都只能标为“全球自动接入”，用于观察到公共 DNS 入口的整体表现，不能根据服务商品牌推定本次请求落在中国大陆，也不能编造电信、联通、移动或某个机房标签。

[Vultr 官方说明](https://blogs.vultr.com/announcement-availability-of-NVIDIA-H100)将 Vultr 描述为 Constant 于 2014 年推出的旗舰云服务；[2024 年融资公告](https://blogs.vultr.com/financing2024)则将其描述为仍保持私有和独立运营的云基础设施公司。本页调用的是 Vultr 公开 Looking Glass 探针。它们提供可确认的都会区，适合横向观察跨境和远距离公网质量，代表用户到 Vultr 公有云互联网入口的 HTTPS 表现，不是游戏服务器替身，也不证明某条专线身份。

## 采样、波动与等级

- P50 是样本中位数，表示“多数时候的典型 HTTPS 延迟”，不表示平均网速或带宽。千兆宽带描述大文件吞吐能力；路径距离、跨网互联、拥塞、代理、TLS 和端点处理仍可能造成很高的 P50。
- P95 对偶发高延迟更敏感；最大值保留最严重尖峰。
- “相邻波动”只计算相邻且均成功的样本之间的绝对差。失败作为图表断点保留，不跨越失败拼接出虚假的波动值。
- 尖峰分别统计 `>100 ms`、`>200 ms` 和 `>300 ms`；最长异常连续段把失败或 `>100 ms` 都计为异常，便于发现实时游戏中连续卡顿。
- 成功样本少于 3 个时为“数据不足”。失败率超过 10%、相邻波动超过 40 ms，或连续失败至少 2 次时为“不稳定”。P95 不超过 50 ms、波动不超过 8 ms 且无失败时为“优秀”；P95 不超过 100 ms、波动不超过 20 ms 且失败率不超过 5% 时为“良好”；其它结果为“延迟偏高”。

紧凑列表用圆点和数字颜色表达两个核心指标。P50 按 `≤50 / ≤100 / ≤200 / >200 ms` 依次显示绿色、黄绿色、橙色和红色；相邻延迟波动按 `≤8 / ≤20 / ≤40 / >40 ms` 使用同一颜色层级。页面图例直接显示与节点行相同的彩色圆点及数字阈值，不再用颜色名称组成长句；数字与无障碍文本仍可独立表达含义。测试开始并收到结果前，当前网络、节点指标和折叠诊断统一显示中性短横线；只有相应请求已经完成而无可用结果时才显示“无法获取”。诊断数据中的“成功／已测”把成功响应与已完成尝试分开；失败率使用全部已测样本为分母。九条曲线共用随当前最大值变化的纵轴，横轴是每个节点自己的第 1 至第 60 个计分样本。颜色和线型同时区分节点；请求失败的位置断开，避免把失败前后的点直接连成一条虚假斜线。

阈值只是面向实时交互的可读参考。HTTPS 包含 DNS、TCP、TLS、代理、浏览器调度和服务端处理，数值通常不能直接替代 ICMP ping 或游戏 UDP 会话。

## 隐私、流量与生命周期

折叠或仅展开组件不会联系第三方；只有用户点击“开始全节点测试”后才发出请求。请求使用 HTTPS、`credentials: omit` 和 `referrerPolicy: no-referrer`，不携带本站 Cookie 或引用页地址。实际被尝试的 IPIP.NET／IP.SB 和对应测速服务商仍会看到公网 IP、浏览器网络栈信息和请求时间。

页面**不持久化**公网信息、样本或结果，不使用 Cookie、`localStorage` 或 `sessionStorage`。关闭组件、点击停止、隐藏标签页或离开页面会停止全部活动测试。一次完整运行对每个节点共发送 61 次低流量请求（1 次预热、60 次计分），另外先向 IPIP.NET 请求一次访客信息；只有失败时才再向 IP.SB 请求一次。Cloudflare 最后补充不产生节点采样之外的请求。每个响应为空或很小。正常快速响应时总时长约 60 秒，超时节点可能需要更久，但不会拖住其它节点的实时显示或采样节奏。

## 维护与验证

节点端点固定在 `assets/js/toy-network-latency-logic.js`，页面资料在 `_data/toy_network_latency.yml`，内容安全策略只允许这些精确来源。变更节点时要同时复核来源页、浏览器 CORS／`no-cors` 行为、请求大小、方法、隐私说明和 CSP，不能只确认命令行可连通。

聚焦回归：

```text
npm run test:unit
python -m pytest tests/test_toy_network_latency_contracts.py
```

发布前完整验收：

```text
python scripts/validate.py --browser
```

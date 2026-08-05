# “名画配对”组件

## 状态

组件已经接入当前研究分支的共享“小玩意”索引，但尚未推送或发布。数据源从芝加哥艺术博物馆（AIC）改为**克利夫兰艺术博物馆**（Cleveland Museum of Art，CMA），原因是 AIC 官方 IIIF 图片在真实浏览器中受到 Cloudflare 403 验证阻断，而 CMA 的官方开放图片 CDN 可以直接供普通 `<img>` 使用。

实时闸门结果见 [`cleveland-art-glimpse-feasibility-2026-08-05.json`](cleveland-art-glimpse-feasibility-2026-08-05.json)：10 个独立样本的元数据成功率为 10/10、成题率为 10/10、四图在 10 秒内完整返回率为 9/10，达到预设的 9/10 与 8/10 门槛。另有一局真实 Chrome 成功完成一次 API GET、四个 JPEG GET 与四个选项渲染。

## 一局怎样形成

玩家明确点击后，脚本才会：

1. 用 `crypto.getRandomValues()` 在 `0..300` 选择浅偏移；
2. 向 CMA 官方 Open Access API 发送一次 `GET`，固定检索 `landscape`、`cc0`、`has_image=1`、`type=Painting`，一次取 12 条必要字段；
3. 在浏览器内逐项要求 `share_license_status=CC0`、官方来源页、官方 `_web.jpg`、合理尺寸和声明文件大小，并过滤题名与说明中的明显裸体、性内容、血腥暴力和自伤词；
4. 用加密随机数选出四幅，声明文件大小合计不得超过 4,000,000 bytes；
5. 并行加载这四个官方约 900px JPEG。全部在 10 秒内成功解码后，显示答案作品的馆方题名、作者、年代，以及四幅完整候选图；任一失败即结束本次尝试，不补候选、不续页、不自动重试；
6. 玩家作答后显示正确图片、作者、年代、CMA 来源页、CC0 与开放获取说明。

线索名片只复用同一次元数据响应中的三个字段，不再生成局部裁切，也不使用 `canvas`。因此协议层仍只有四个候选媒体 URL，没有第五张线索图。开始下一题必须再次由玩家点击。

## 语言与题名

界面具有完整中英文文案，但 CMA 返回的馆藏题名没有可靠中文字段。中文页在作答前的名片和揭晓区都原样显示官方题名，不自动翻译、不伪造中文馆藏名；作者说明和年代也保留官方文本。四幅候选只显示完整图片，不重复题名。

所有外部字符串都只进入 `textContent` 或经过白名单验证的 URL 属性。作品页只允许 `clevelandart.org`／`www.clevelandart.org`，图片只允许 `openaccess-cdn.clevelandart.org`，API 只允许 `openaccess-api.clevelandart.org`；全部要求 HTTPS、默认端口且无凭据。

## 许可与隐私

CMA [Open Access 说明](https://www.clevelandart.org/open-access)表示，逐项标作 CC0 的公共领域作品图像和馆藏元数据可以下载、分享、改编和复用；[API 文档](https://openaccess-api.clevelandart.org/)说明 `cc0` 与 `has_image` 过滤、必要字段、900px web JPEG 以及公开无密钥访问。组件仍在揭晓处保留 CMA 来源、[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)和开放获取链接。

开始前文案披露：CMA／服务商能看到请求和玩家 IP；API 能看到本站 Origin；图片统一使用 `referrerPolicy=no-referrer`。响应和作答只留在页面内存，不写入 Cookie、`localStorage`、`sessionStorage`、IndexedDB 或仓库。

API 响应使用 `AbortController`、12 秒超时与 262,144 字符流式上限。图片 CDN 没有开放 CORS，因此产品必须使用普通 `<img>`：组件根据官方 API 报告的 `filesize` 过滤单图 1.2 MB、整局 4.0 MB 的**声明预算**，实际传输大小仍由馆方响应决定；10 秒时移除 `src`，并要求 `decode()` 成功。组件不能在前端读取图片响应头或精确累计传输字节。显式维护审计工具则会用可读的服务器侧请求验证 `image/jpeg`、实际字节上限和 `AbortController`。若将来要求产品端字节级硬上限，必须等官方图片端点开放 CORS；本站不会为此增加代理。

开始新一局或超时时，组件会移除未完成 `<img>` 的 `src`；Chromium 会据此停止当前加载，但 HTML 没有规定所有浏览器都必须立即取消底层传输。因此披露只承诺不主动补请求或预取，不把“取消后绝不会继续收到任何字节”写成跨浏览器保证。若将来 CDN 开放 CORS，可改为受 `AbortController` 控制的流式 `fetch`。

## 内容边界

发现范围固定为带 `landscape` 信号的绘画，以降低裸体和暴力图像比例。自动过滤会拒绝题名或说明中出现的裸体、色情、性交易、强奸、自杀、尸体、斩首、处决、屠杀、谋杀、血液、受难、殉道、战斗和战争场景等英文词形。

多轮真实四图视觉样本没有出现明显性行为、可见生殖器或血腥伤口；但其中一幅宗教绘画突出显示了缠腰布的男性裸露上身和小天使人物，另有宗教家庭场景及带细小人物的传统手稿式花园画。这证明 `landscape` 与元数据关键词只能降低风险，不能排除宗教或神话艺术中的非色情半裸形象。CMA 没有供程序使用的年龄分级。当前研究分支接受这一内容边界并在开始前明确披露；发现不合适作品时应记录来源并调整过滤，不能静默补取另一批来掩盖失败。

## 文件与验证

- 配置与双语文案：`_data/toy_art_glimpse.yml`
- 渐进增强结构：`_includes/toy-art-glimpse.liquid`
- 共享响应式样式：`assets/css/main.scss`
- 逻辑与控制器：`assets/js/art-glimpse.js`
- 纯逻辑测试：`tests/art_glimpse.logic.test.mjs`
- Python 契约：`tests/test_art_glimpse_contracts.py`
- 固定桩浏览器测试：`tests/browser/art-glimpse.spec.mjs`
- 单样本实时探针：`tests/tools/audit-art-glimpse-live.mjs`
- 真实 Chrome 一局：`tests/tools/audit-art-glimpse-browser-live.mjs`

截至 2026-08-05：改造后的固定桩 Node 8 项、Python 6 项、Playwright 8 项通过；全站 Python 355 项、生产构建、站点契约、70 条旧 URL 政策与全量 157 项 Playwright 回归通过。真实浏览器也以一次 CMA API 请求和四幅官方 JPEG 生成了属性配对题，桌面与 320 px 均无横向溢出。组件只留在研究分支和 loopback 预览，尚未推送或发布。

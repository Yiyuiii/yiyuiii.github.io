# 《SETI》规则随笔系统审计（2026-08-04）

## 用户原始要求

- 排查教程中未展开的规则，用户明确指出“登陆行星”说明不足。
- 在确有助于对照组件和版图时增加配图；继续只使用可核验的官方原装图片。
- 保持规则书式的简洁、清楚与实际游玩顺序，同时让纯文字学习者读完可以开局。

## 审计范围与事实来源

本轮逐项对照以下官方材料，并把正文中的多人基础流程、外星生物、单人模式和扩展分开核验：

- [基础游戏官方简中规则书](https://filemanager.czechgames.com/storage/files/seti-search-for-extraterrestrial-intelligence/rules/SE%20rulebook%20ZH-S%2006.pdf)
- [基础游戏官方 FAQ](https://filemanager.czechgames.com/storage/files/seti-search-for-extraterrestrial-intelligence/other-downloads/additional-content/seti-faq-printer-friendly.pdf)
- [五种基础外星生物官方辅助页](https://filemanager.czechgames.com/storage/files/seti-search-for-extraterrestrial-intelligence/other-downloads/alien-species/seti-alien-species-en.pdf)
- [《Space Agencies》官方简中规则书](https://filemanager.czechgames.com/storage/files/seti-space-agencies/rules/SE2%20rulebook%20ZH-S%2002.pdf)
- [三种扩展外星生物官方辅助页](https://filemanager.czechgames.com/storage/files/seti-space-agencies/other-downloads/alien-species/SE2%20aliens%20aid%20ZH-S%2002.pdf)

图片逐项来源、裁切坐标、尺寸与 SHA-256 见 `docs/article-assets/202608021600.yml`。

## 覆盖矩阵

| 规则模块 | 审计前状态 | 本轮处理 | 就近配图 |
| --- | --- | --- | --- |
| 设置、回合、免费行动 | 已完整 | 保留；与 FAQ 的强制效果和时点复核 | 已有 |
| 发射与移动 | 缺少多点移动拆分、“访问”定义 | 补全 | 新增移动示例 |
| 绕行 | 缺少容量与身份变化 | 补全任意数量、首位奖励和不再视为探测器 | 新增绕行示例 |
| 行星／卫星着陆 | 说明过短 | 补全对手人造卫星减费、数据位、火星双数据位、行星无限容量、卫星单格、卫星减费与身份变化 | 新增着陆示例 |
| 扫描、信号与扇区 | 已完整 | 与 FAQ 的超额信号、平手与结算时点复核 | 已有 |
| 数据与分析 | 缺少计算机科技安装边缘情形 | 补全可装在已有数据下方且不触发 2 分 | 已有 |
| 卡牌与任务 | 已完整 | 与 FAQ 的行动免基础费、任务触发和手牌上限复核 | 已有 |
| 科技与公转 | 科技效果只作概括 | 列明四种探测器和四种望远镜效果，并复核计算机科技 | 新增科技说明图 |
| 生命迹象与发现 | 只有通用发现流程 | 保留无剧透主流程，补充通用物种牌规则 | 已有 |
| 五种基础物种 | 完全缺失 | 新增硫铵虫、异常点、奥陌陌、半人马族、钻探者完整摘要 | 每种新增 1 张板块图 |
| 多人首轮与终局 | 已完整 | 保留并复核 | 已有 |
| 基础单人游戏 | 完全缺失 | 新增设置、资源转换、行动优先级、跳过、目标与常见物种特例 | 新增设置图与对手回合图 |
| 《Space Agencies》通用规则 | 已完整 | 保留并复核 | 已有 |
| 三种扩展物种 | 有规则但只共享总览图 | 保留规则摘要，为起源方舟、符文族、阿米巴分别增加板块图 | 每种新增 1 张板块图 |
| 促销牌 | 已完整 | 保留并复核 | 已有 |

## 本轮判断与边界

- 正文新增 14 张官方裁图；中英文正文现在各有 33 张图片，另有 1 张共享题图。所有新增图都来自上述官方 PDF，没有使用 AI 生图。
- 五种基础物种和三种扩展物种的完整机制继续默认折叠，避免无意剧透；通用发现流程保留在折叠区外。
- 单人模式属于基础盒完整规则，不再只在扩展章节零散提及。
- FAQ 中会影响通用操作的澄清放回对应章节或首局速查；只涉及个别牌号的低频裁定不扩写，以免把教程变成卡牌索引。正文继续链接官方持续更新的单卡澄清帖。
- 新增单人章节使后续章节序号顺延；旧章节的公开片段 ID 通过显式锚点保留。

## 验证记录

- `python -m pytest -q`：336 项源码测试通过；新增契约固定 14 张规则图的双语顺序、八种物种、基础单人章节、素材清单与旧扩展物种锚点。
- `python scripts/translation_guard.py --check --production`：中英文来源哈希、标题结构、图片与链接顺序一致。
- `python scripts/generate_post_thumbnails.py --check`：12 张源题图和 24 张索引派生图均为当前版本。
- `python scripts/sync_projects.py`：复用现有 GitHub CLI 凭据，6 个公开仓库同步契约通过。
- 生产 Jekyll 构建、`check_site.py` 与 70 条旧 URL 契约通过。
- `python scripts/run_browser_tests.py --site _site`：128 项 Playwright 回归全部通过。
- 针对 SETI 中文页另在 1440 px 与 390 px 检查探测器、着陆、单人规则及两处展开后的物种内容；页面宽度均无横向溢出，折叠区左边界分别与正文同为 320 px 和 16 px，新增图片和图注均正常显示。

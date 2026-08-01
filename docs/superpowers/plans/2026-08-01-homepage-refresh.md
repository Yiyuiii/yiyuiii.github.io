# 个人主页下一阶段实施计划

## 用户原始要求

- `/` 与 `/en/` 应成为真正的中英文欢迎页，而不是直接显示随笔索引。
- 欢迎页不提供“读随笔 / 看 GitHub / 看论文”入口卡，不做成果精选或排名；用规范化单列内容流展示随笔、项目和论文。
- 欢迎页文本必须集中、清晰并方便人工修改。
- 欢迎页可优先尝试箭头式页眉功能指引；若在 320、390、1280 px 中出现错位、遮挡或阅读负担，回退为自然语言指示。
- 页眉继续提供栏目、搜索、EN/中文切换；欢迎页负责解释这些控件。
- 每篇随笔最终必须有完整中英文版本，并保持结构与技术内容对应。
- 随笔索引不应加载原分辨率封面，应提供响应式小图。
- 所有随笔正文使用同一套全局样式，不得按文章编写 CSS。
- 左上太阳头像应延伸柔和、不妨碍阅读的阳光背景，并提供可访问开关。
- 每个专业模块由子任务完成现状审计、方案优化、实现和局部验证；主智能体审核、仲裁、整合并承担最终责任。
- 不要求用户逐项人工审阅；最终以 GitHub Actions 在 `master` 上构建和发布成功为完成条件。

## 不可破坏的仓库边界

- `D:\Codes\yiyuiii.github.io\master` 是与 GitHub `master` 一致的唯一正式 clone，实施期间不直接修改。
- 功能工作位于 `D:\Codes\yiyuiii.github.io-worktrees\` 下的临时 worktree。
- `original-40a013` 与 `archives` 不修改、不压缩、不纳入生产提交。
- Anthropic 外审来源永久不可用；需要外审时只复核 Ark Coding Plan 与本地 Kimi 的实时可用性。

## 目标信息架构

- `/`：中文欢迎页。
- `/en/`：英文欢迎页。
- `/writing/`：中文随笔索引。
- `/en/writing/`：英文随笔索引。
- 左上品牌链接回当前语言欢迎页。
- 文章 URL 尽量保留；需要调整的英文旧 URL 建兼容重定向并纳入 legacy inventory。
- 原 `/?tag=...` 在可执行 JavaScript 时迁往相应随笔索引并保留 query/hash；无 JavaScript 时提供明确的随笔索引入口。

## 欢迎页契约

欢迎页正文集中在 `_data/home.yml`，模板不得硬编码欢迎语、说明、栏目标题和轮换提示。建议数据形态：

```yaml
zh:
  title: 你好，欢迎来到 yiyuiii
  introduction: [...]
  guide: {...}
  sections: {...}
en:
  title: Hello, welcome to yiyuiii
  introduction: [...]
  guide: {...}
  sections: {...}
```

首页内容流不在 `home.yml` 重复维护内容详情。三类来源通过稳定 ID、语言、标题、摘要、URL、`feed_date`、可选图片归一化；`feed_date` 只表示本站新增或实质整理日期，不随普通 GitHub push、Star/Fork 或错别字变化刷新。排序为 `feed_date desc, id asc`，首页显示最近 8 项。

每日轮换使用稳定 ID 与香港日期计算，从最近 8 项之外选择，不记录访问、不读历史、不使用 Cookie、localStorage、指纹或外部 API；中英文选择同一主题。无 JavaScript 时仍有稳定可读的浏览起点。

箭头指引必须是渐进增强：语义说明始终存在，箭头只是视觉连接层；不得复制第二套导航。若跨视口验收失败，删除箭头层并保留自然语言指示。

## 专业子任务

1. **双语、URL、SEO 基础**：稳定 ID、配对契约、临时迁移豁免、翻译结构签名、canonical/hreflang、英文旧 URL 兼容及测试。
2. **统一正文排版**：全局 `.post-content` 标题、字体、字距、节奏、列表、代码、图片、日期；随后清理全部 11 篇标题语义，保护 TOC 与锚点。
3. **索引缩略图**：160/320 px WebP 派生、`srcset`/`sizes`、来源记录、生成和完整性测试；保留正文原图。
4. **欢迎页与内容流**：人工可编辑文案、箭头/文本指引、统一 feed、每日轮换、随笔索引迁址、品牌/导航/fallback/旧 tag 兼容。
5. **阳光背景**：替换左上紫晶光晕，保留并减弱右侧玉色；静态金色光晕与极淡光芒、无 JS 回退、版本化偏好、双语 ARIA、404 排除。
6. **文章双语迁移**：先修标题语义，再按结构复杂度逐篇完成 11 组中英文；图片、公式、代码、Mermaid、脚注、修订序列和站内链接通过自动结构检查。
7. **题图组件**：与普通正文图分离，只对正式题图使用不裁切限高；不得用 `.post-content img` 或脆弱的 `:first-child` 猜测。
8. **最终集成**：共享文件冲突、视觉回归、SEO、无障碍、性能、旧 URL、生产构建、GitHub Actions 与部署。

自托管标题字体暂不进入主线；只有真实中英标题对比确认收益后另立实验任务。

## 合入顺序

1. 双语/URL/SEO 基础、正文排版、缩略图分别在独立分支实现，可并行审计与编码。
2. 主智能体审核并依次合入集成分支，解决 `main.scss`、数据与测试冲突。
3. 欢迎页在稳定 ID 和缩略图契约之上实现。
4. 阳光任务在页眉和欢迎页指引接口稳定后实现。
5. 标题语义清理完成后开始逐篇翻译，避免双倍返工。
6. 题图组件与翻译批次协调合入。
7. 完成全量本地验证后推送，等待并修复 GitHub Actions，直到部署成功。

## 主智能体审核清单

- 子任务只修改授权范围，提供设计取舍、diff、测试结果和风险。
- 不接受逐篇 CSS、重复首页内容副本、隐性 featured/priority/score、运行时原图回退或失效无 JS 控件。
- 共享文件改动重放到最新集成分支，不能覆盖已合入规则。
- 对子任务输出进行代码审阅与反例检查；复杂改动按可用性使用 Ark/Kimi 独立外审，但不直接采信外审结论。
- 全量执行 README 约定的 pytest、项目同步、翻译守卫、production Jekyll build、站点与 legacy 检查、Playwright。
- 浏览器至少覆盖 1280、390、320 px；箭头、阳光、搜索、语言切换、TOC、代码横滚和无 JS 页面均需回归。
- 最终 `master` 必须与 GitHub 同步、工作树干净，Actions build/deploy 成功。

## 当前执行工作树

- 集成：`D:\Codes\yiyuiii.github.io-worktrees\integration` / `feature/homepage-refresh`
- 双语基础：`D:\Codes\yiyuiii.github.io-worktrees\bilingual-foundation` / `feature/bilingual-foundation`
- 正文排版：`D:\Codes\yiyuiii.github.io-worktrees\typography` / `feature/article-typography`
- 缩略图：`D:\Codes\yiyuiii.github.io-worktrees\thumbnails` / `feature/post-thumbnails`
- 欢迎页与内容流：`D:\Codes\yiyuiii.github.io-worktrees\welcome` / `feature/welcome-feed`
- 阳光背景与开关：`D:\Codes\yiyuiii.github.io-worktrees\sunlight` / `feature/sunlight-background`
- 正式题图组件：`D:\Codes\yiyuiii.github.io-worktrees\article-covers` / `feature/article-covers`
- 随笔翻译批次 A：`D:\Codes\yiyuiii.github.io-worktrees\translations-a` / `feature/translations-a`
- 随笔翻译批次 B：`D:\Codes\yiyuiii.github.io-worktrees\translations-b` / `feature/translations-b`
- 随笔翻译批次 C：`D:\Codes\yiyuiii.github.io-worktrees\translations-c` / `feature/translations-c`
- 随笔翻译批次 D：`D:\Codes\yiyuiii.github.io-worktrees\translations-d` / `feature/translations-d`

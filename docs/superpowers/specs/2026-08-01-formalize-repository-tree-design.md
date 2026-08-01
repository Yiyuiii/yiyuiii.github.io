# 主分支正式目录整理设计

状态：方案 B 已于 2026-08-01 获用户批准；本文等待用户复核后进入实施计划阶段。

## 1. 背景与事实基线

用户希望 D:\Codes\yiyuiii.github.io 保持清楚、唯一且正式的工作边界：

- D:\Codes\yiyuiii.github.io\master 是与 GitHub 主分支一致的正式 clone。
- D:\Codes\yiyuiii.github.io\original-40a013 是提交 40a0132204e4c58c636d940245810334b5db597b 的未压缩原站文件树。
- D:\Codes\yiyuiii.github.io\archives 保存整理前全工作区的冷备份、校验清单和恢复说明，不属于站点仓库。
- 本阶段以清理 GitHub master 当前文件树中的 tracked 冗余为主，并同步更新直接受影响的维护文档、测试与资产来源清单；不重写既有 Git 历史，也不直接修改或合并 master。

2026-07-31 的只读审计得到以下基线：

- origin/master 与本地 master 均指向 0cd73576339203377e8c82fc1944b644b9a64ea9。
- 当前树共 206 个 tracked 文件，约 23.559 MiB。
- docs 共 71 个文件，约 7.861 MiB，并已被 _config.yml 排除在 Jekyll 构建之外。
- docs/content-revisions 共 68 个文件，约 7.842 MiB，包含旧稿、当前稿副本、AI 审阅稿、事实审计、封面原图、生成源图和一次性验证脚本。
- docs/content-covers 共 2 个文件，约 0.013 MiB，记录已经完成的候选选择与推进过程。
- tests/test_writing_contracts.py 中有 7 个测试函数直接把上述历史材料的存在和内容固定为生产契约。
- assets 约 15.233 MiB；正文媒体大多被文章直接引用或由 _data/legacy_urls.yml 保护，不能按体积直接删除。
- sw.js、退役路由和未发布页面参与旧 URL 或禁止发布契约，不能按表面状态直接删除。
- 当前 Python 基线为 182 项测试全部通过。
- 提交 0cd7357 中的修订材料仍可由 Git 对象读取；冷备份中另有 259 个 content-revisions 成员，且备份已完成独立解包与 SHA-256 校验。

## 2. 目标

本阶段把 master 当前树整理为四类职责清楚的正式材料：

1. 站点源码：Jekyll 页面、布局、数据、插件、文章和生产资源。
2. 维护工具：构建、同步、翻译、链接、浏览器和回归测试。
3. 正式维护文档：项目入口、内容维护规则、生产资产来源与许可。
4. 可审计设计记录：经用户批准、能够解释结构决策的设计与实施计划。

整理后应同时满足：

- 当前树不再携带完整历史稿、AI 过程稿、候选台账和大体积封面源图。
- 删除过程材料不会削弱生产内容、许可追溯、旧 URL 兼容或回归验证。
- Jekyll 的约定目录保持原位，不为了“看起来整齐”而引入无收益迁移。
- master 工作目录始终保持与 origin/master 一致；所有变更在仓库外 worktree 的 cleanup 分支完成。
- 最终只推送 cleanup 分支并创建未合并 PR，由用户决定是否合并。

## 3. 非目标

本阶段明确不做以下工作：

- 不改版页面、不重写文章、不调整视觉设计。
- 不重写或压缩 Git 历史。
- 不压缩、移动或修改 original-40a013。
- 不把 archives、original-40a013 或其清单纳入站点提交。
- 不创建额外远端归档分支或归档仓库。
- 不删除仍被正文、构建产物、旧 URL 清单或浏览器兼容流程使用的资源。
- 不借清理之机升级 Ruby、Python、Node、GitHub Actions 或主题依赖。

## 4. 目标目录职责

整理后的正式树保持 Jekyll 原生结构：

    .github/                 GitHub Actions 构建与部署
    _data/                   站点结构化数据及兼容 URL 清单
    _includes/               可复用 Liquid 组件
    _layouts/                页面布局
    _pages/                  正式、重定向及明确停用的路由源
    _plugins/                本站 Jekyll 插件
    _posts/                  当前正式文章
    assets/                  当前生产样式、脚本、favicon 和文章媒体
    scripts/                 构建前后检查与维护脚本
    tests/                   源码、数据、构建结果和浏览器契约
    docs/content-editing.md  内容维护说明
    docs/asset-provenance.yml 当前生产封面的来源与许可
    docs/superpowers/        已批准设计与实施计划
    AGENTS.md                项目记忆入口和关键文档索引
    README.md                面向维护者的项目入口

不新增 src、app 或 tools 包装目录。现有下划线目录是 Jekyll 约定，而不是待修复的混乱。

## 5. 历史过程材料的处理

从 cleanup 分支当前树移除：

- docs/content-revisions 整个目录。
- docs/content-covers 整个目录。

预计净移除 70 个过程文件、约 7.855 MiB；实际值以实施后的 Git tree 统计为准。

这些材料不再复制到 master 的其它目录，也不另建远端归档分支。恢复路径为：

1. Git 历史中的 0cd7357 保留当前 68 个修订文件，可通过 git show 或临时 worktree 读取。
2. D:\Codes\yiyuiii.github.io\archives\workspace-before-consolidation-20260731.tar.gz 保存整理前多条工作线，SHA-256 为 6E7CF00480B4036818165910C537271594771764577A21FF698C786D1BD87C0E。
3. D:\Codes\yiyuiii.github.io\original-40a013 继续作为原站未压缩对照。

删除前必须从以下现有材料提取所有仍与生产资源相关的来源、作者、许可和处理信息：

- docs/content-revisions 各文章目录中的 cover-source*.md、cover-generated*.md 与 cover-approved*.md。
- docs/content-covers 下的封面台账与候选记录。
- _posts 中当前正式文章的 thumbnail 字段、题图、图题、署名和许可链接。
- assets/posts 下对应的当前生产文件及其实际 SHA-256。

完成逐文章交叉校验后才删除源目录。原图或过程文档中与当前生产文件无关的候选信息不进入新清单。

## 6. 生产资产来源清单

新增 docs/asset-provenance.yml，作为当前生产封面的单一维护清单。这里的“当前文章缩略图”严格定义为：每个 tracked _posts/*.md 文件 YAML front matter 中的 thumbnail 字段；仅排除 front matter 明确设置 published: false 的文章。正文第一张图片、Open Graph 默认图和 favicon 不作为文章缩略图识别来源。

每个当前文章缩略图恰好对应一条记录，至少包含：

- asset：仓库内生产文件路径。
- post：使用该文件的正式文章路径。
- origin_type：self-produced、external 或 generated。
- source_url：外部来源原始页面；非外部资源可省略。
- author：外部作者或生成资产责任主体。
- license 与 license_url：外部资源的精确许可；自有资源记录 ownership。
- transform：裁切、缩放、格式转换或生成方式的简洁说明。
- sha256：当前生产文件的 SHA-256。
- attribution：正式文章中可见的署名或来源说明要求。

清单不保存原图、候选图、完整文章副本或 AI 审阅过程。它只回答“当前生产文件来自哪里、允许怎样使用、当前文件是否仍是被批准的那个文件”。

## 7. 测试重构

保留现有面向生产行为的测试、构建检查和浏览器测试。对 tests/test_writing_contracts.py 做定向收缩：

- 移除 7 个只验证历史快照、AI 审阅稿、候选源图或一次性过程文件存在的测试函数。
- 不删除 tests/test_writing_contracts.py，也不降低文章元数据、修订日期、题图、正文引用和导航行为的现有契约。
- 增加生产资产来源测试，验证：
  - 每篇正式文章的 thumbnail 指向存在的本地文件。
  - 所有当前文章封面与 docs/asset-provenance.yml 一一对应，无缺项和孤儿项。
  - 清单中的 SHA-256 与当前生产文件一致。
  - external 记录具有来源 URL、作者、精确许可和许可 URL。
  - generated 与 self-produced 记录具有明确来源说明，不伪装成外部许可。
  - 需要公开署名的文章仍包含对应的可见来源或许可链接。

测试不固定整篇文章哈希。Git 已负责版本追踪；测试只保护具有长期行为或法律意义的契约。

## 8. 其它冗余候选

审计发现若干 favicon 变体没有在仓库文本中直接引用，但 _includes/head.liquid 会调用主题的 metadata.liquid，存在主题间接引用的可能。因此这些文件不在无条件删除范围内。

实施阶段把 favicon 文件视为一张可达性图，而不是逐个按文件名猜测。可达根为当前页面 head、主题 metadata include、_config.yml、_data/legacy_urls.yml 和构建后 HTML/CSS/JS/XML/JSON 中出现的 URL；manifest 或 browserconfig 等文本资源中的链接继续递归展开。具体检查顺序为：

1. 使用 git grep 或等价脚本扫描 tracked 文本中的精确文件名和仓库相对路径，记录入边。
2. 定位 al_folio_core 实际安装路径，检查 metadata.liquid 及其调用的 include；无法读取主题源码时不得删除候选。
3. 执行 production Jekyll 构建，扫描 _site 内所有文本产物中的精确文件名和 URL，建立构建后入边。
4. 只删除从可达根出发没有入边的完整连通分量；例如未被页面引用的 manifest 及仅由该 manifest 引用的图标必须作为一组判断。
5. 删除后重新构建，并执行 Playwright、站点检查和旧 URL 检查。
6. 在实施记录和 PR 说明中列出每个删除项、源码扫描结果、主题扫描结果、构建产物扫描结果和回归结果。

若无法得到完整证据，则保留。正文媒体、sw.js、停用路由和禁止发布页面采用同一原则：无证据不删除。

## 9. 文档调整

- 重写 README.md，使其说明站点职责、正式目录、常用验证命令和贡献入口。
- 更新 docs/content-editing.md，删除鼓励在 master 保存多轮完整快照的流程，改为使用 Git 提交、临时 worktree 和生产资产来源清单。
- 新增项目级 AGENTS.md，区分用户长期要求、当前事实状态和 AI 历史总结，并索引本设计、后续实施计划及内容维护文档。
- 文档不引用仓库内不存在的 historical snapshot 路径；恢复说明只给出 Git 提交和仓库外已验证归档位置。

## 10. Git 与隔离策略

- 正式 clone：D:\Codes\yiyuiii.github.io\master，保持 master 分支且工作树干净。
- 实施 worktree：D:\Codes\yiyuiii.github.io-cleanup-formal-tree。
- 分支：cleanup/formalize-repository，基于最新 origin/master。
- 设计文档、实施计划和代码清理使用可审阅的独立提交。
- 不 force push，不改写 master，不自动合并 PR。
- PR 创建后再次确认正式 clone 的 HEAD、分支、上游和工作树状态。

## 11. 验证策略

实施前记录基线，实施后执行以下验证：

1. Python 测试：python -m pytest -q。
2. 项目数据与翻译：生产模式同步检查和 translation guard。
3. Jekyll production 构建：bundle exec jekyll build --trace。
4. 构建产物检查：scripts/check_site.py 与 scripts/check_legacy_urls.py。
5. 浏览器回归：Playwright 全套测试，覆盖桌面与移动端关键页面、导航、搜索、文章和服务工作线程退役。
6. 资源清单：逐项验证文章引用、生产资产来源清单和 SHA-256。
7. 构建差异：除经证明删除的未引用资源外，正式路由和公开媒体 URL 不发生非预期变化。
8. Git 检查：git diff --check、git status、git fsck，并确认 master 正式 clone 未改变。
9. 外部审阅：在 cleanup worktree 根目录使用本机 Kimi Code CLI 的非交互命令 kimi -p 发起只读审阅，任务中明确禁止文件和 Git 写入；分别审查设计、最终 diff、测试覆盖和残留冗余。PR 说明记录命令角色、审阅结论及 Codex 对每项实质建议的接受、修正或证据反驳。Ark Coding Plan 仅是额度可用时的可选第二来源，不属于完成条件，缺席不影响验收。
10. GitHub PR 检查：远端 Actions 全部通过后，PR 仍保持未合并。

本地缺少某一构建运行时时，不以窄化验证替代。应使用项目可复现环境或 PR Actions 补齐，并在完成结论中明确证据来源。

## 12. 风险与控制

### 许可信息随源档删除

控制：先生成 asset-provenance.yml，再用脚本核对 11 篇文章封面、哈希、来源和许可，最后删除历史目录。

### 测试因删除快照而失去保护

控制：只移除过程存在性断言，以生产文件、来源清单、许可和页面行为测试替换，不以减少测试数量作为目标。

### 主题隐藏引用导致 favicon 误删

控制：检查主题 include 与实际构建产物；证据不完整时保留。

### 目录清理意外改变旧 URL

控制：保留 legacy inventory，运行源码、构建产物和浏览器三层检查，并比较公开 URL 清单。

### 远端数据导致验证不稳定

控制：单元测试继续使用固定 fixture；生产同步检查单独运行并由 GitHub Actions 使用 GITHUB_TOKEN 复核。

## 13. 成功标准

只有同时满足以下条件，本阶段才算完成：

- cleanup 分支当前树不含 docs/content-revisions 和 docs/content-covers。
- 当前 11 篇文章封面均有简洁、完整、可机检的生产来源记录。
- README、content-editing 和 AGENTS 对整理后的真实结构描述一致。
- 所有要求的源码、构建、链接、旧 URL、浏览器和 Git 验证通过。
- Kimi 外审的实质问题已由 Codex 接受修正或用证据反驳。
- cleanup 分支已推送并创建未合并 PR。
- D:\Codes\yiyuiii.github.io\master 仍与 origin/master 一致且工作树干净。
- original-40a013 与 archives 未被修改，也未进入站点提交。

## 14. 方案取舍

未采用保守方案 A，因为只删除少量精确重复文件无法解决生产树与过程档案混杂的问题。

未采用激进方案 C，因为删除维护文档、许可证据或行为测试会让仓库更小，却不再“正式、可维护”。

采用方案 B 的收敛版本：历史过程材料退出当前树，正式维护能力保留并结构化；不增加额外远端归档分支，避免为清理冗余再制造一条长期维护线。

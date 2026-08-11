# 2026-08-07 维护收口记录

本文记录本轮仓库维护的事实状态、删除边界与验证证据。它不扩大小玩意路线，也不替代 `AGENTS.md` 中的用户原始要求。

## 路线结论

- M2 已完成自动审计并由用户验收：现有十一项的分组、排序、信息密度和多项同时展开均无需调整。
- “接通电路”因玩法传统、没有额外逻辑新意与站点价值而取消；M3、M4 不再执行。
- 不自动改做漫水、节奏复现或其它传统候选。只有用户重新授权且候选能证明新的逻辑体验与明确价值时，才重新评估扩充。

## 工作树与分支清理

清理前共有 21 个已注册工作树。逐一检查未提交状态、分支名、PR 合并记录或等价整合提交后，删除了 19 个已完成的历史工作树及对应本地分支；其中 15 个有分支名完全一致的已合并 PR，4 个由祖先关系或等价整合提交证明已进入 `master`。另删除了 12 个仍残留在 GitHub、但对应 PR 已合并的远端源分支。

清理后只保留：

- `D:/Codes/yiyuiii.github.io/master`：官方只读 clone；清理后仍与 `origin/master` 为 `0/0` ahead/behind，工作区干净。
- `D:/Codes/yiyuiii-maintenance-closeout`：本轮维护分支；合并后才可删除。
- `D:/Codes/yiyuiii-seti-resource-analysis`：明确保留的进行中材料，仍含 `AGENTS.md` 的未提交修改与未跟踪的 `docs/seti-resource-analysis-working-notes.md`，本轮没有改动、移动或删除。

没有运行 `git gc` 或立即清除不可达对象：可回收空间很小，且保留恢复宽限比强行压缩更有价值。

## 依赖与安全

- 已启用 GitHub Dependabot 漏洞告警；没有启用自动修复、CodeQL、自动合并或其它额外自动化。
- `.github/dependabot.yml` 每月检查 Bundler、npm 与 `scripts/requirements.in`／`scripts/requirements.txt` 中的 Python 依赖；每个生态按组提 PR，最多同时保留 3 个。Python 清单于 2026-08-11 改为输入约束与带哈希锁文件，精确边界见 `docs/dependency-security-baseline-2026-08-11.md`。
- 首次默认分支扫描产生 20 条告警，实际只有两个根因：Pillow 12.0.0 对应 19 条历史公告，`css_parser` 1.22.0 对应 1 条公告。
- Pillow 已升级到 12.3.0。由于编码器版本属于图片确定性契约，索引题图升级为 `index-v2`，正文派生图策略升级为版本 3 / `content-v2`，并重新生成和核对尺寸、SHA-256 与中英文正文哈希。
- `css_parser` 的修复版为 3.0.0，但唯一引入者 `jekyll-3rd-party-libraries` 0.0.1 在已发布 gem 和上游 `main` 都限制 `< 2.0`。本站固定 `download: false`，实际只需要 URL 中的 `{{version}}` 展开，因此用 `_plugins/third_party_library_urls.rb` 的最小本地钩子替代，并在误开下载时阻断构建；`Gemfile.lock` 不再包含这两个 gem。
- `@playwright/test` 从 1.62.0 精确升级到 1.62.1；`npm audit` 为 0 个漏洞。

默认分支上的 Dependabot 告警要在本分支合并并由 GitHub 重新扫描后才会关闭，PR 阶段仍显示旧 `master` 的告警不代表修复未进入候选提交。

2026-08-11 复核发现 GitHub Dependency Graph 仍把 Pillow 识别为 12.0.0，因此此前 19 条 Pillow 告警没有自动关闭；正式清单和最新 CI 均已安装 12.3.0。新的开发依赖清单路径会触发重新解析，验收以 Dependabot、Dependency Graph 与 SBOM 的当前结果为准。

## 验证证据

最终执行 `python scripts/validate.py --browser` 并通过全部 10 个阶段：

- Python 386 项、JavaScript 77 项；
- 6 个公开仓库同步与双语来源哈希；
- 12 张题图的 24 个索引派生文件；
- 6 张正文源图的 9 个响应式派生文件；
- production Jekyll 构建、构建产物契约与 70 条旧 URL；
- Playwright 169 项。

此前一次完整浏览器运行出现单个 Chromium worker 启动超时，当轮为 168/169，失败不含页面断言。随后名画规格单独复跑 10/10，通过后又从头执行完整门禁并取得 169/169。最终发布依据是最后一次完整通过结果，不是单项复跑。

外部 Ark 方案审阅在等待窗口内没有返回内容并被终止；本轮结论依赖逐项 Git/GitHub 证据、依赖解析、确定性资产检查和完整本地门禁。

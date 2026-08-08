# yiyuiii.github.io

Yiyu Chen 的双语个人站点，发布随笔、公开项目与合作论文。站点使用 Jekyll 构建，由 GitHub Actions 验证并部署。

## 目录

- `_posts`：当前正式文章。
- `_pages`、`_layouts`、`_includes`、`_plugins`：页面、布局、组件与本站插件。
- `_data`：欢迎页、小玩意、关于页、项目、论文、界面文字与旧 URL 契约。
- `assets`：生产样式入口、脚本、favicon 和文章媒体；全站自定义 SCSS 模块位于 `_sass/site`。
- `scripts`：统一验证、项目同步、翻译检查、资源处理、构建产物检查与 Replit 预览入口。
- `tests`：源码、数据、构建结果与浏览器回归。
- `docs/content-editing.md`：内容维护流程。
- `docs/asset-provenance.yml`：当前文章封面的来源、许可与哈希。
- `docs/superpowers`：已批准的设计与实施计划。

正式 master 当前树不得保存完整历史稿、AI 审阅稿、封面候选或原始大图。合并正式化分支前，下面的命令必须无输出：

```powershell
git ls-files docs/content-revisions docs/content-covers
```

只有已经进入 master 且提交仍可达的正式版本，才承诺可由普通 Git 历史长期恢复。临时 worktree 或分支的中间提交在删除分支或 squash 后不保证可达；确需长期保留时，应使用经批准的受保护 tag、归档分支、仓库外 git bundle 或专门资产库，不要把过程档案放回 master 当前树。当前生产资源的法律与处理信息由 `docs/asset-provenance.yml` 维护。

## 验证

### 环境前提

- Python 3.12。
- Ruby 3.3.5、Bundler 2.5。
- Node.js 24。
- 浏览器回归使用 Playwright 自带的 Chromium；不需要 ImageMagick 或系统 Chrome。

首次准备：

```powershell
python -m pip install -r scripts/requirements.txt
bundle install
npm ci
npx playwright install --no-shell chromium
```

### 统一入口

日常完整验证（不含耗时较长的浏览器回归）：

```powershell
python scripts/validate.py
```

发布前与 CI 使用同一个入口并追加完整 Playwright 回归：

```powershell
python scripts/validate.py --browser
```

统一入口依次执行 Python 测试、JavaScript 逻辑测试、公开仓库同步、双语检查、缩略图检查、正文响应式派生图检查、production Jekyll 构建、构建产物检查和旧 URL 检查；`--browser` 再对刚生成的 `_site` 启动随机 loopback 预览并运行浏览器回归。脚本只给 Jekyll 子进程设置 `JEKYLL_ENV=production`，不会覆盖调用者环境。

公开仓库同步是联网验证。本地运行前应设置可用的 `GITHUB_TOKEN`；若使用 GitHub CLI，可先完成 `gh auth login`，再执行 `$env:GITHUB_TOKEN = gh auth token`。不要配置宽权限个人令牌。仅在已经有本次可信同步生成的 `_data/project_runtime.yml` 时，才可用 `--skip-project-sync` 做离线排查；该选项不是发布验证的替代品。

只排查某个浏览器规格时，可复用已经成功构建的 `_site`：

```powershell
python scripts/run_browser_tests.py --site _site -- tests/browser/site.spec.mjs
```

也可让统一入口完成前置检查和新构建，并把 `--` 后的参数传给 Playwright：

```powershell
python scripts/validate.py --browser -- tests/browser/site.spec.mjs
```

Ruby 依赖由已提交的 `Gemfile.lock` 固定；依赖有意变更时才更新锁文件。精确 CI 流程见 `.github/workflows/deploy.yml`。

### 人工页面审阅

人工页面审阅使用固定的 GitHub `preview/replit` 测试分支和 Replit 测试页面，不再向审阅者提供本机 `localhost`。本机 loopback 仍由 `scripts/validate.py --browser` 在进程内部用于自动化回归；它不是人工审阅入口。

候选提交推到 `preview/replit` 后，GitHub Actions 会运行与正式发布相同的完整门禁，但不会部署 GitHub Pages。CI 成功后，Replit App 还需要显式拉取该分支并重新发布，因为 GitHub 导入和 Replit 发布都不会随远端 push 自动更新。首次建立、每轮同步、失败边界和正式合并流程见 `docs/replit-preview-workflow.md`。

### 依赖维护

Dependabot 每月检查一次 Bundler、npm 与 Python 依赖，并按生态分组提出版本更新；每类最多同时保留 3 个更新 PR。仓库同时启用 Dependabot 漏洞告警，但不自动合并或自动修改生产分支。所有依赖更新仍须通过统一发布门禁后再人工合并。

### 可选外部服务维护检查

外部题源审计不会进入普通验证或 CI，必须由维护者显式选择联网。AniList 的单次生产形状探针使用：

```powershell
node tests/tools/audit-acg-relation-quiz-live.mjs --run-live
```

它每次只发送一个 GraphQL POST，不自动翻页或重试，也不输出题目内容。CMA 与萌娘百科的既有显式维护工具位于 `tests/tools/audit-art-glimpse-live.mjs` 和 `tests/tools/audit-moegirl-quiz-live.mjs`；运行前先阅读各脚本顶部的请求数量与输出边界。

构建后的外链可达性检查同样是独立、非发布阻断的维护入口：

```powershell
python scripts/check_site.py --site _site --external-links
```

外部站点可能限流、拒绝 `HEAD` 或临时不可用，因此该结果用于维护排查，不得替代统一发布门禁，也不应直接加入普通 CI。检查器先用 `HEAD`，遇到明确拒绝 `HEAD` 的状态再回退到 `GET`，对瞬时网络／TLS 异常做有限重试，并在错误中列出引用该 URL 的构建页面，避免单个异常直接中断检查器。

## 部署

Pull request 与 `preview/replit` push 只执行验证并上传 `site-preview`。master 的 push，或在 master 上通过 `workflow_dispatch` 手动触发工作流时，build 成功后才会部署 `_site`；不要直接把生成目录提交到 master。

## 许可

站点代码与仓库整体许可见 `LICENSE`。文章封面可能采用不同许可，逐项以 `docs/asset-provenance.yml` 和文章中的可见署名为准。

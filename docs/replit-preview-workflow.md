# GitHub 测试分支与 Replit 审阅流程

## 目标与边界

人工页面审阅统一使用 Replit 测试页面，不再把本机 `localhost` 地址交给审阅者。本机和 GitHub Actions 仍执行自动化测试；这两类检查用于发现确定性回归，不等于人工视觉审阅。

固定远端测试分支为 `preview/replit`。它是待审阅提交的集成镜像，不是生产分支，也不直接部署 GitHub Pages。正式站点仍只从 `master` 发布。

Replit 的 GitHub 导入、Git 同步和发布是三个独立动作：GitHub 推送不会让已导入的 Replit App 自动拉取，Replit 的已发布页面也是文件快照。因此每轮审阅都必须显式完成“拉取 + 重新发布”，不能只看分支已推送就声称测试页已更新。

## 仓库侧流程

1. 在仓库外 worktree 或功能分支完成改动。不要直接修改正式 `master` clone。
2. 运行与风险相称的聚焦测试；准备交付审阅时运行完整门禁：

   ```powershell
   python scripts/validate.py --browser
   git diff --check
   ```

3. 提交本轮候选，然后把该提交推到固定测试分支：

   ```powershell
   git push origin HEAD:preview/replit
   ```

4. 等待 GitHub Actions 的 `Build and deploy site` 工作流成功。`preview/replit` 只运行 `build`，上传 `site-preview` 作为可追溯产物；`deploy` 的条件仍只允许 `master`。
5. 在 GitHub Actions 成功后再同步 Replit。若 CI 失败，先在原工作分支修复并重新推送，不发布失败提交。

## Replit 首次建立

1. 从公开仓库 `https://github.com/Yiyuiii/yiyuiii.github.io` 导入 Replit App。
2. 在 Replit 的 Git 工具中切换到 `preview/replit`。Replit App 只作为远端分支镜像，不在其中直接编辑、提交或推回 GitHub。
3. 点击 Run。仓库根目录的 `.replit` 会运行 `bash scripts/replit_preview.sh serve`，以 production 配置构建并在 `0.0.0.0:3000` 提供 Preview。
4. Preview 正常后建立 Static 发布：

   - Build command：`bash scripts/replit_preview.sh build`
   - Public directory：`_site`
   - Visibility：优先选择仅本人可见的私有测试页

5. 记录 Replit App、固定测试 URL、当前提交 SHA 和首次验证结果。测试页不绑定正式域名。

## 每轮同步与发布

Replit 工作树必须保持干净。确认无本地改动后，在 Git 工具选择 Pull，或在 Replit Shell 执行等价的快进更新：

```bash
git fetch origin preview/replit
git checkout preview/replit
git pull --ff-only origin preview/replit
```

然后依次执行：

1. 点击 Run，确认 Replit Preview 能完成真实 Jekyll 构建并打开首页、随笔索引和本轮重点页面。
2. 点击 Republish，用原有设置覆盖同一个测试 URL。
3. 在发布状态成功后打开测试 URL，核对页面展示的候选与 `preview/replit` 最新提交一致。
4. 把测试 URL、提交 SHA、GitHub Actions 运行链接、需要人工判断的问题一起交给审阅者。

若 Replit 工作树出现本地修改、非快进历史或依赖安装导致的受跟踪文件变化，应停止同步并查明原因；不要 merge、force push、hard reset 或把 Replit 产生的改动推回仓库。

## 验收与正式发布

人工审阅只针对已通过 GitHub Actions 且已同步到 Replit 固定 URL 的提交。用户确认后，才把该提交按当次批准的方式合入 `master`。`master` push 会重新运行同一完整门禁，成功后才部署 GitHub Pages。

`preview/replit` 保留为长期测试入口，可以在下一轮被新的已提交候选快进更新。测试分支和 Replit 页面都不构成正式发布记录；正式状态仍以 GitHub `master` 和 GitHub Pages 为准。

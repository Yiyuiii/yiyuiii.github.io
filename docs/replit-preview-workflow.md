# GitHub 测试分支与 Replit 审阅流程

## 目标与边界

人工页面审阅统一使用 Replit 测试页面，不再把本机 `localhost` 地址交给审阅者。本机和 GitHub Actions 仍执行自动化测试；这两类检查用于发现确定性回归，不等于人工视觉审阅。

固定源码测试分支为 `preview/replit`。它是待审阅提交的集成镜像，不是生产分支，也不直接部署 GitHub Pages。完整门禁成功后，GitHub Actions 才把已验证的 `_site` 写入只含静态快照的生成分支 `preview/replit-site`；Replit App 只跟踪后者。正式站点仍只从 `master` 发布。

Replit 的 GitHub 导入、Git 同步和发布是三个独立动作：GitHub 推送不会让已导入的 Replit App 自动拉取，Replit 的已发布页面也是文件快照。因此每轮审阅都必须显式完成“拉取 + 重新发布”，不能只看分支已推送就声称测试页已更新。

## 当前测试入口

- Replit App：<https://replit.com/@yiyuiii/yiyuiiigithubio>
- 固定人工审阅 URL：<https://yiyuiiigithubio--yiyuiii.replit.app>
- 源码追溯：<https://yiyuiiigithubio--yiyuiii.replit.app/preview-source-sha.txt>
- Replit App ID：`bf6868bf-44c5-4b08-a15f-0b95406a27b7`（只用于自动化定位，不是凭据）

2026-08-08 首次实测为 Public Static 发布，Public directory 是 `_site`，Replit 页面显示到期日为 2026-09-07。Starter 发布会显示 “Made with Replit” 标记并按平台规则到期；到期前后的实际状态仍以 Replit Publishing 页面为准，不为维持测试页自动升级套餐。

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

4. 等待 GitHub Actions 的 `Build and deploy site` 工作流成功。`preview/replit` 会运行 `build`，上传 `site-preview`，并在成功后运行 `sync_replit_preview` 更新 `preview/replit-site`；正式 `deploy` 的条件仍只允许 `master`。
5. 只有 `build` 与 `sync_replit_preview` 都成功后才同步 Replit。若任一任务失败，先在原工作分支修复并重新推送，不发布失败提交。

## Replit 首次建立

1. 从公开仓库 `https://github.com/Yiyuiii/yiyuiii.github.io` 导入 Replit App。
2. 等待首轮 GitHub Actions 已生成 `preview/replit-site`，再在 Replit Shell 首次建立本地跟踪分支：

   ```bash
   git fetch origin refs/heads/preview/replit-site:refs/remotes/origin/preview/replit-site
   git switch --track -c preview/replit-site origin/preview/replit-site
   ```

   Replit App 只作为生成分支镜像，不在 Replit 中直接编辑、提交或推回 GitHub。
3. 重新打开 App，使生成分支中的 `.replit` 与 `replit.nix` 生效；这里只载入 Python 静态服务器，不在 Replit 安装 Ruby 或重新构建 Jekyll。若 Console 仍显示导入时缓存的旧命令，用 `Ctrl+K` 打开命令面板并执行 `Restart compute`，再核对 Run 命令已变为 `python3 -m http.server 3000 --directory _site`。
4. 点击 Run。`.replit` 会用 Python 在 `0.0.0.0:3000` 提供已验证的 `_site` Preview；Console 必须保持运行，Preview 应能打开首页。
5. Preview 正常后建立 Static 发布：

   - Build command：不需要构建；若界面要求填写，使用 `true`
   - Public directory：`_site`
   - Starter：首个发布 App 免费、带 Replit 标记且 30 天后下线，可重新发布；不要为本流程自动升级套餐

6. 记录 Replit App、固定测试 URL、当前提交 SHA 和首次验证结果。测试页不绑定正式域名。

## 每轮同步与发布

Replit 工作树必须保持干净。未连接 GitHub provider 时，Git 面板会禁用 Pull；公开仓库仍可在 Replit Shell 执行快进更新：

```bash
git fetch origin refs/heads/preview/replit-site:refs/remotes/origin/preview/replit-site
git switch preview/replit-site
git merge --ff-only origin/preview/replit-site
git status --short --branch
```

然后依次执行：

1. 点击 Run，确认 Replit Preview 能打开首页、随笔索引和本轮重点页面；访问 `_site/preview-source-sha.txt` 对应的公开路径，核对内容等于本轮 `preview/replit` 提交 SHA。
2. 点击 Republish，用原有设置覆盖同一个测试 URL。
3. 在发布状态成功后打开测试 URL，核对页面展示的候选与 `preview/replit` 最新提交一致。
4. 把测试 URL、提交 SHA、GitHub Actions 运行链接、需要人工判断的问题一起交给审阅者。

若 Replit 工作树出现本地修改、非快进历史或依赖安装导致的受跟踪文件变化，应停止同步并查明原因；不要 merge、force push、hard reset 或把 Replit 产生的改动推回仓库。

## 验收与正式发布

人工审阅只针对已通过 GitHub Actions 且已同步到 Replit 固定 URL 的提交。用户确认后，才把该提交按当次批准的方式合入 `master`。`master` push 会重新运行同一完整门禁，成功后才部署 GitHub Pages。

`preview/replit` 保留为长期源码测试入口，`preview/replit-site` 只由成功的 GitHub Actions 更新，不接受人工提交。两条测试分支和 Replit 页面都不构成正式发布记录；正式状态仍以 GitHub `master` 和 GitHub Pages 为准。

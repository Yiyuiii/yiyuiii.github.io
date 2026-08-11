# GitHub 测试分支与本地审阅流程

## 目标与平台边界

候选页面先由 GitHub Actions 使用与正式发布相同的依赖、production Jekyll 构建和完整浏览器门禁生成；人工看到的页面直接来自该次成功运行上传的 `site-preview`，不再依赖 Replit，也不要求 Codex 控制浏览器。

固定测试分支是 `preview/review`。它只触发验证和预览产物上传，不会部署 GitHub Pages。只有 `master` 通过同一门禁后才可更新正式站点。

这里不能安全地为测试分支直接建立第二个 GitHub Pages 网址：GitHub Pages 对同一仓库只有一个 Pages 站点，发布来源也是单一分支／目录或 Actions 工作流；官方 `actions/deploy-pages` 的 pull request preview 仍标为 alpha 且未公开可用。让测试分支直接部署 Pages 会把候选内容送入正式站点的发布通道，因此本站不采用该方案。

官方边界：

- [什么是 GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [配置 GitHub Pages 发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [`actions/deploy-pages` 的 preview 状态](https://github.com/actions/deploy-pages)

## 当前流程

| 阶段 | 事实源 | 结果 |
| --- | --- | --- |
| 候选集成 | `preview/review` | 固定指向本轮待审阅提交 |
| 自动验证 | GitHub Actions `build` | 运行 `python scripts/validate.py --browser` |
| 预览产物 | `site-preview` artifact | 含已验证 `_site` 和 `preview-source-sha.txt` |
| 人工审阅 | 本机 `127.0.0.1` | 只读提供下载的 GitHub 产物，不重新构建 |
| 正式发布 | `master` | 门禁成功后才部署 GitHub Pages |

预览服务器只允许绑定 `127.0.0.1`，不会暴露到局域网或公网。GitHub artifact 和测试分支都不是正式发布记录。

## 每轮候选审阅

1. 在仓库外 worktree 或功能分支完成改动，不直接修改正式 `master` clone。
2. 运行与风险相称的聚焦测试。准备交付审阅时，优先先在本机运行完整门禁：

   ```powershell
   python scripts/validate.py --browser
   git diff --check
   ```

3. 提交候选，并把同一提交推到固定测试分支：

   ```powershell
   git push origin HEAD:preview/review
   ```

4. 确认 GitHub CLI 已登录，然后用一个命令等待门禁、核对远端源码哈希、下载产物并启动只读预览：

   ```powershell
   gh auth status
   python scripts/github_preview.py
   ```

   脚本会拒绝展示旧运行或哈希不匹配的 artifact。默认地址是 `http://127.0.0.1:9241`；它只打印地址，不自动打开或控制浏览器。端口被占用时可让系统选择空闲端口：

   ```powershell
   python scripts/github_preview.py --port 0
   ```

5. 在自己的浏览器中打开脚本输出的地址，完成人工视觉和内容审阅。按 `Ctrl+C` 停止后，临时下载目录自动清理；GitHub 上的 artifact 在工作流设定的保留期内仍可重新下载。

若 GitHub Actions 失败，不下载或展示失败运行的产物；在原功能分支修复、重新提交并再次推送 `preview/review`。

## 纯本地后备

GitHub 暂时不可用、只需快速检查未提交修改，或尚未准备推送候选时，可以对本机刚构建的 `_site` 预览：

```powershell
python scripts/validate.py --browser
python scripts/serve_site.py --site _site --port 9241
```

第二条命令不重新构建；它只读提供第一条命令成功生成的 `_site`，并保持正式站点的自定义 404 状态。也可用 `--port 0` 自动选择端口。纯本地页面用于快速检查，最终交付审阅仍优先使用 GitHub 成功运行的产物。

## 故障定位

查看测试分支最近的工作流：

```powershell
gh run list --workflow deploy.yml --branch preview/review --event push --limit 5
```

若 `scripts/github_preview.py` 报告“latest workflow run does not verify the current preview branch”，说明最新成功或进行中的运行不对应远端当前提交。等待新运行出现；不要退回旧 artifact 冒充当前候选。

若脚本报告缺少 `preview-source-sha.txt`、`index.html` 或 `404.html`，说明 CI 产物契约被破坏。应修复工作流或构建，不要手工补文件后继续审阅。

## 验收与正式发布

人工审阅只针对 `preview/review` 当前提交对应、且已通过 GitHub Actions 的 artifact。用户确认后，才把该提交按当次批准的方式合入 `master`。`master` push 会重新运行完整门禁，成功后才部署 GitHub Pages。

`preview/review` 是长期测试入口，可以由下一轮候选覆盖；它不接受与候选无关的独立修改。Replit 工作流、配置模板和生成快照分支已退役，不再作为恢复路径。

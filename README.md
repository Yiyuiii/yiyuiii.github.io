# yiyuiii.github.io

Yiyu Chen 的双语个人站点，发布随笔、公开项目与合作论文。站点使用 Jekyll 构建，由 GitHub Actions 验证并部署。

## 目录

- _posts：当前正式文章。
- _pages、_layouts、_includes、_plugins：页面、布局、组件与本站插件。
- _data：欢迎页、小玩意、关于页、项目、论文、界面文字与旧 URL 契约。
- assets：当前生产样式、脚本、favicon 和文章媒体。
- scripts：项目同步、翻译检查、封面处理、构建产物检查与本地预览。
- tests：源码、数据、构建结果与浏览器回归。
- docs/content-editing.md：内容维护流程。
- docs/asset-provenance.yml：当前文章封面的来源、许可与哈希。
- docs/superpowers：已批准的设计与实施计划。

正式 master 当前树不得保存完整历史稿、AI 审阅稿、封面候选或原始大图。合并正式化分支前，下面的命令必须无输出：

```powershell
git ls-files docs/content-revisions docs/content-covers
```

只有已经进入 master 且提交仍可达的正式版本，才承诺可由普通 Git 历史长期恢复。临时 worktree 或分支的中间提交在删除分支或 squash 后不保证可达；确需长期保留时，应使用经批准的受保护 tag、归档分支、仓库外 git bundle 或专门资产库，不要把过程档案放回 master 当前树。当前生产资源的法律与处理信息由 docs/asset-provenance.yml 维护。

## 验证

### 环境前提

- Python 3.12。
- Ruby 3.3.5 与 Bundler。
- ImageMagick，且命令已加入 PATH。
- Node.js 20 或更高版本。
- Google Chrome。

### 首次准备

```powershell
python -m pip install -r scripts/requirements.txt
bundle install
npm ci
```

### 源码与数据检查

```powershell
python -m pytest -q
python scripts/translation_guard.py --check --production
```

CI 还会运行 `python scripts/sync_projects.py`；本地执行该联网检查前必须设置可用的 `GITHUB_TOKEN`。若使用 GitHub CLI，可先完成 `gh auth login`，再执行 `$env:GITHUB_TOKEN = gh auth token`；不要配置宽权限个人令牌。

### Production 构建

下面的 PowerShell 会保存并精确恢复调用者原有的 `JEKYLL_ENV`；原变量不存在时才在结束后删除。

```powershell
$hadJekyllEnv = Test-Path Env:\JEKYLL_ENV
$previousJekyllEnv = if ($hadJekyllEnv) { $env:JEKYLL_ENV } else { $null }
try {
  $env:JEKYLL_ENV = "production"
  bundle exec jekyll build --trace
  if ($LASTEXITCODE -ne 0) { throw "Jekyll build failed with exit code $LASTEXITCODE." }
} finally {
  if ($hadJekyllEnv) {
    Set-Item Env:\JEKYLL_ENV -Value $previousJekyllEnv
  } else {
    Remove-Item Env:\JEKYLL_ENV -ErrorAction SilentlyContinue
  }
}

python scripts/check_site.py --site _site
python scripts/check_legacy_urls.py --site _site
```

Ruby production build 使用 Jekyll 4.4.1；精确 CI 流程见 .github/workflows/deploy.yml。

### 浏览器回归

首选跨平台入口如下。它会验证 `_site` 和自定义 404，直接在随机 loopback 端口启动预览服务，只给 Playwright 子进程设置 `SITE_URL`，并在成功、失败或中断后关闭服务：

```powershell
python scripts/run_browser_tests.py --site _site
```

只运行指定规格时，把参数放在 `--` 后：

```powershell
python scripts/run_browser_tests.py --site _site -- tests/browser/site.spec.mjs
```

下面保留的 PowerShell 是旧版手工等价流程，仅供排查启动器自身时参考；日常验证和 CI 应统一使用上面的 Python 入口：

```powershell
$hadSiteUrl = Test-Path Env:\SITE_URL
$previousSiteUrl = if ($hadSiteUrl) { $env:SITE_URL } else { $null }
$siteServer = $null
$workflowError = $null
try {
  $portProbe = [System.Net.Sockets.TcpListener]::new(
    [System.Net.IPAddress]::Loopback,
    0
  )
  $portProbe.Start()
  try {
    $sitePort = ([System.Net.IPEndPoint]$portProbe.LocalEndpoint).Port
  } finally {
    $portProbe.Stop()
  }

  $env:SITE_URL = "http://127.0.0.1:$sitePort"
  $repoRoot = (git rev-parse --show-toplevel).Trim()
  if ($LASTEXITCODE -ne 0) { throw "Cannot resolve the repository root." }
  $siteRoot = (Resolve-Path -LiteralPath "_site" -ErrorAction Stop).Path
  $pythonCommands = @(Get-Command python -CommandType Application -ErrorAction Stop)
  $pythonPath = $pythonCommands[0].Path
  $serverStartInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $serverStartInfo.FileName = $pythonPath
  $serverStartInfo.WorkingDirectory = $repoRoot
  $serverStartInfo.UseShellExecute = $false
  $serverStartInfo.CreateNoWindow = $true
  $serverStartInfo.Arguments = "scripts/serve_site.py --bind 127.0.0.1 --port $sitePort"
  $serverStartInfo.EnvironmentVariables["SITE_PREVIEW_ROOT"] = $siteRoot
  $siteServer = [System.Diagnostics.Process]::Start($serverStartInfo)
  if ($null -eq $siteServer) { throw "Failed to start the local site server." }

  $siteReady = $false
  $siteDeadline = (Get-Date).AddSeconds(10)
  do {
    if ($siteServer.HasExited) {
      throw "Local site server exited with code $($siteServer.ExitCode) before becoming ready."
    }
    try {
      Invoke-WebRequest -Uri "$env:SITE_URL/" -UseBasicParsing -TimeoutSec 1 | Out-Null
      if ($siteServer.HasExited) {
        throw "Local site server exited with code $($siteServer.ExitCode) during readiness check."
      }
      $siteReady = $true
    } catch {
      if ($siteServer.HasExited) {
        throw "Local site server exited with code $($siteServer.ExitCode) before becoming ready."
      }
      Start-Sleep -Milliseconds 200
    }
  } until ($siteReady -or (Get-Date) -ge $siteDeadline)
  if (-not $siteReady) {
    if ($siteServer.HasExited) {
      throw "Local site server exited with code $($siteServer.ExitCode) before becoming ready."
    }
    throw "Local site server did not become ready."
  }

  npm run test:browser
  if ($LASTEXITCODE -ne 0) { throw "Browser tests failed with exit code $LASTEXITCODE." }
} catch {
  $workflowError = $_
} finally {
  $cleanupFailures = [System.Collections.Generic.List[string]]::new()
  if ($null -ne $siteServer) {
    try {
      if (-not $siteServer.HasExited) { $siteServer.Kill() }
      if (-not $siteServer.WaitForExit(5000)) {
        $cleanupFailures.Add("Local site server did not exit within 5000 ms after Kill().")
      }
    } catch {
      $cleanupFailures.Add("Local site server cleanup failed: $($_.Exception.Message)")
    } finally {
      try { $siteServer.Dispose() } catch {
        $cleanupFailures.Add("Local site server disposal failed: $($_.Exception.Message)")
      }
    }
  }
  try {
    if ($hadSiteUrl) {
      Set-Item Env:\SITE_URL -Value $previousSiteUrl
    } else {
      Remove-Item Env:\SITE_URL -ErrorAction Stop
    }
  } catch {
    $cleanupFailures.Add("SITE_URL restoration failed: $($_.Exception.Message)")
  }
  if ($cleanupFailures.Count -gt 0) {
    $cleanupMessage = $cleanupFailures -join "; "
    if ($null -ne $workflowError) {
      throw "Browser regression failed: $($workflowError.Exception.Message); cleanup also failed: $cleanupMessage"
    }
    throw "Browser cleanup failed: $cleanupMessage"
  }
  if ($null -ne $workflowError) { throw $workflowError }
}
```

也可通过 `SITE_URL` 指向另一个等价的 `_site` 预览；此时应自行确保服务生命周期和构建内容一致。

## 部署

Pull request 只执行验证并上传 site-preview。master 的 push，或在 master 上通过 `workflow_dispatch` 手动触发工作流时，build 成功后才会部署 `_site`；不要直接把生成目录提交到 master。

## 许可

站点代码与仓库整体许可见 LICENSE。文章封面可能采用不同许可，逐项以 docs/asset-provenance.yml 和文章中的可见署名为准。
